/**
 * Un turno del copiloto, en streaming (SSE).
 *
 * Ruta y no server action porque un turno encadena varias llamadas a modelo y
 * a herramienta: puede durar segundos, y el usuario tiene que ver qué está
 * consultando mientras tanto. Ese goteo es además una función de confianza —
 * deja a la vista exactamente qué tocó el agente.
 *
 * Lo importante de este fichero es lo que NO hace: no pasa identidad al
 * motor. `requireAIEnabled` resuelve la sesión, y de ahí sólo salen el rol y
 * la superficie. El tenant nunca se nombra: lo resuelven por dentro las
 * queries que envuelven las herramientas.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  callGemini,
  isAgentRole,
  runTurn,
  type AgentEvent,
  type TurnOutcome,
} from "@prol/ai";
import { db } from "@prol/db";
import { requireAIEnabled } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { agentRegistry } from "@/lib/agent/tools";
import { buildSystemInstruction } from "@/lib/agent/system-prompt";
import {
  appendTurn,
  getConversation,
  HISTORY_WINDOW,
} from "@/lib/agent/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("agent-turn");

/** Turnos por usuario y minuto. Un copiloto no necesita más, y acota el gasto. */
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

/**
 * Vida de una propuesta. Corta a proposito: se apoya en datos que pueden
 * haber cambiado, y una propuesta de ayer ya no describe la realidad.
 */
const PROPOSAL_TTL_MS = 30 * 60_000;

/** Tope por adjunto y en total. Van en base64 al modelo, no a disco. */
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_FILES = 3;

const MIME_PERMITIDOS = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

const BodySchema = z.object({
  mensaje: z.string().trim().min(1).max(2_000),
  superficie: z
    .enum([
      "evidence",
      "manuals",
      "surveys",
      "companies",
      "advisory",
      "dashboard",
    ])
    .default("dashboard"),
  /**
   * Conversación a continuar. El historial se carga del servidor a partir de
   * este id — NO viaja desde el cliente. Que el navegador pudiera dictar el
   * contexto permitiría reinyectar contenido de terceros saltándose la valla.
   */
  conversacionId: z.string().max(40).nullish(),
  adjuntos: z
    .array(
      z.object({
        nombre: z.string().max(200),
        mimeType: z.enum(MIME_PERMITIDOS),
        /** base64 sin el prefijo `data:`. */
        datos: z.string().max(Math.ceil(MAX_FILE_BYTES * 1.4)),
      }),
    )
    .max(MAX_FILES)
    .default([]),
});

export async function POST(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireAIEnabled(["PROFESSOR", "ADMIN", "SUPER_ADMIN"]);
  } catch {
    // Mismo mensaje para "no autenticado", "rol incorrecto" y "IA no
    // habilitada": distinguirlos dice a un desconocido qué tiene contratado
    // esta academia.
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Se copia a una constante para que el estrechamiento del guard sobreviva
  // al resto de la función: `user` es mutable y TypeScript no lo mantiene.
  const role = user.role;
  if (!isAgentRole(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const rate = checkRateLimit(`agent:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (rate.limited) {
    return NextResponse.json(
      { error: "Demasiadas consultas seguidas. Espera un momento." },
      { status: 429 },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }
  const { mensaje, superficie, conversacionId, adjuntos } = parsed.data;

  // El historial sale de la base y sólo si la conversación es suya.
  const conversation = conversacionId
    ? await getConversation(user.id, conversacionId)
    : null;
  const historial = (conversation?.messages ?? []).slice(-HISTORY_WINDOW);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      };

      const startedAt = Date.now();
      let outcome: TurnOutcome | null = null;

      try {
        outcome = await runTurn({
          registry: agentRegistry,
          callModel: callGemini,
          systemInstruction: buildSystemInstruction(role, superficie),
          history: historial.map((m) => ({
            role: m.rol === "usuario" ? "user" : "model",
            parts: [{ text: m.texto }],
          })),
          userMessage: mensaje,
          attachments: adjuntos.map((a) => ({
            mimeType: a.mimeType,
            data: a.datos,
          })),
          context: { role, surface: superficie, tainted: false },
          // Si el usuario cierra la pestana, Next aborta `request.signal` y el
          // turno deja de gastar en el paso siguiente.
          signal: request.signal,
          onEvent: (event: AgentEvent) => send(event.type, event),
        });

        // Las propuestas se persisten AL TERMINAR el turno, no segun se
        // emiten: si el turno acaba en incidente o en bloqueo, no queda nada
        // confirmable de una conversacion que se corto a medias.
        if (outcome.proposals.length > 0 && outcome.finish === "completo") {
          await db.agentProposal.createMany({
            data: outcome.proposals.map((p) => ({
              id: p.id,
              tenantId: user.tenantId,
              userId: user.id,
              surface: superficie,
              toolName: p.toolName,
              args: p.args as never,
              model: outcome!.model,
              expiresAt: new Date(Date.now() + PROPOSAL_TTL_MS),
            })),
          });
        }

        // Sólo se guarda lo que llegó a ser una respuesta. Un turno cortado
        // por incidente o cancelado no deja rastro en el historial.
        let savedConversationId = conversation?.id ?? null;
        if (outcome.finish === "completo") {
          savedConversationId = await appendTurn({
            userId: user.id,
            tenantId: user.tenantId,
            surface: superficie,
            conversationId: conversation?.id ?? null,
            userMessage: mensaje,
            assistantMessage: outcome.text,
          });
        }

        send("fin", {
          finish: outcome.finish,
          texto: outcome.text,
          propuestas: outcome.finish === "completo" ? outcome.proposals : [],
          contaminado: outcome.tainted,
          conversacionId: savedConversationId,
        });
      } catch (error) {
        // Fallo de infraestructura: red, clave ausente, Gemini caído. Al
        // usuario un mensaje plano; el detalle al log del servidor.
        log.error("turno fallido", {
          userId: user.id,
          surface: superficie,
          error: error instanceof Error ? error.message : String(error),
        });
        send("error", {
          texto:
            "No he podido completar la consulta por un problema técnico. " +
            "Vuelve a intentarlo en un momento.",
        });
      } finally {
        // Un incidente es que el modelo intento usar una capacidad fuera de su
        // ambito. No es ruido operativo: va a nivel de error para que dispare
        // alerta y quede separado del resto del trafico.
        const level = outcome?.finish === "incidente" ? log.error : log.info;
        level("turno", {
          userId: user.id,
          role,
          surface: superficie,
          adjuntos: adjuntos.length,
          finish: outcome?.finish ?? "error",
          // Dos magnitudes distintas: pasos de modelo (lo que se cobra por
          // ida y vuelta) y llamadas a herramienta. Etiquetarlas igual hacia
          // que la telemetria mintiera.
          steps: outcome?.steps ?? 0,
          toolCalls: outcome?.toolCalls.length ?? 0,
          tainted: outcome?.tainted ?? false,
          proposals: outcome?.proposals.length ?? 0,
          tokensIn: outcome?.usage.tokensIn ?? 0,
          tokensOut: outcome?.usage.tokensOut ?? 0,
          model: outcome?.model ?? null,
          durationMs: Date.now() - startedAt,
          // Qué herramientas se tocaron: es la traza que hace falta cuando
          // alguien pregunta de dónde salió una respuesta.
          tools: outcome?.toolCalls.map((c) => c.name) ?? [],
          ...(outcome?.detail ? { detail: outcome.detail } : {}),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Sin esto, un proxy con buffering retiene los eventos hasta el final y
      // el streaming deja de existir sin que nadie se entere.
      "X-Accel-Buffering": "no",
    },
  });
}
