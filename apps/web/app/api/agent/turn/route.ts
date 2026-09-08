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
   * Historial de la conversación. Viaja desde el cliente porque todavía no hay
   * persistencia de conversaciones; cuando la haya, se cargará por id y este
   * campo desaparecerá. Sólo lleva texto: ni llamadas a herramienta ni sus
   * resultados, para que contenido de terceros no pueda reinyectarse desde el
   * navegador saltándose la valla.
   */
  historial: z
    .array(
      z.object({
        rol: z.enum(["usuario", "asistente"]),
        texto: z.string().max(4_000),
      }),
    )
    .max(20)
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
  const { mensaje, superficie, historial } = parsed.data;

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

        send("fin", {
          finish: outcome.finish,
          texto: outcome.text,
          propuestas: outcome.finish === "completo" ? outcome.proposals : [],
          contaminado: outcome.tainted,
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
