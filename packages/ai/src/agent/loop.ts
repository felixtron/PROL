/**
 * El bucle del harness.
 *
 * La invariante que lo define: **este bucle no escribe nunca**. Ejecuta
 * herramientas de lectura y, cuando el modelo pide una de escritura, registra
 * una propuesta y sigue. Confirmarla es otra petición, con un humano dándole
 * a un botón. De ahí sale la garantía práctica de todo el diseño: el peor
 * caso de una inyección perfecta es una propuesta rara que alguien rechaza.
 *
 * Dos rutas de error, deliberadamente distintas:
 *
 *   argumentos inválidos → se devuelven al modelo para que corrija. Es ruido
 *                          normal; el turno continúa.
 *   nombre no permitido  → INCIDENTE. El modelo ha inventado una función o
 *                          algo del contexto le ha empujado fuera de su
 *                          ámbito. Se aborta el turno y se registra.
 *
 * `callModel` entra por parámetro para que el bucle se pruebe guionizado, sin
 * red y sin gastar un token.
 */

import { randomUUID } from "node:crypto";
import type { Content, Part } from "@google/genai";
import {
  isTainted,
  newFenceId,
  renderToolResult,
  type ToolResult,
} from "./envelope";
import type { CallModel, ModelTier, ModelUsage } from "./gemini";
import { assertToolAllowed, advanceContext, allowedToolNames, ToolNotAllowedError, type TurnContext } from "./policy";
import type { ToolRegistry } from "./registry";

export interface Budget {
  /** Pasos de modelo por turno. Ocho cubre de sobra un encadenado razonable. */
  maxSteps: number;
  /** Reloj de pared del turno completo. */
  maxWallClockMs: number;
  /** Llamadas a herramienta atendidas por paso. */
  maxCallsPerStep: number;
  /** Timeout de una sola llamada al modelo. */
  modelTimeoutMs: number;
  /** Timeout de la ejecución de una herramienta. */
  toolTimeoutMs: number;
}

export const DEFAULT_BUDGET: Budget = {
  maxSteps: 8,
  maxWallClockMs: 60_000,
  maxCallsPerStep: 3,
  modelTimeoutMs: 30_000,
  toolTimeoutMs: 15_000,
};

export interface ToolCallRecord {
  name: string;
  args: unknown;
  ok: boolean;
  tainted: boolean;
  durationMs: number;
}

/**
 * Documento que adjunta la persona al preguntar. Va al modelo como parte
 * `inlineData` del mismo turno.
 *
 * Adjuntar CONTAMINA el turno desde el primer paso, sin excepción: un PDF que
 * sube un consultor casi siempre lo escribió su empresa cliente, y dentro
 * puede ir cualquier cosa. Con el turno contaminado el agente puede leerlo,
 * resumirlo y redactar a partir de él, pero no proponer ninguna escritura.
 */
export interface Attachment {
  mimeType: string;
  /** Contenido en base64, sin el prefijo `data:`. */
  data: string;
}

/** Escritura pedida por el modelo y NO ejecutada. Espera confirmación humana. */
export interface WriteProposal {
  id: string;
  toolName: string;
  args: unknown;
}

export type AgentEvent =
  | { type: "paso"; step: number }
  | { type: "herramienta_inicio"; name: string; args: unknown }
  | { type: "herramienta_fin"; name: string; ok: boolean; durationMs: number }
  | { type: "propuesta"; proposal: WriteProposal }
  | { type: "texto"; text: string }
  | { type: "contaminado" };

export type TurnFinish =
  | "completo"
  | "presupuesto"
  | "bloqueado"
  | "incidente"
  | "cancelado";

export interface TurnOutcome {
  finish: TurnFinish;
  text: string;
  steps: number;
  tainted: boolean;
  toolCalls: ToolCallRecord[];
  proposals: WriteProposal[];
  usage: ModelUsage;
  model: string | null;
  /** Presente si `finish` es "bloqueado" o "incidente". */
  detail?: string;
}

export interface RunTurnInput {
  registry: ToolRegistry;
  callModel: CallModel;
  systemInstruction: string;
  /** Turnos anteriores de la conversación, ya en formato Gemini. */
  history: Content[];
  userMessage: string;
  /** Documentos adjuntos. Contaminan el turno desde el primer paso. */
  attachments?: Attachment[];
  /** Rol, superficie y contaminación inicial. */
  context: TurnContext;
  tier?: ModelTier;
  budget?: Partial<Budget>;
  /**
   * Se aborta cuando el cliente cierra la conexion. Sin esto, cerrar la
   * pestana deja el turno corriendo y gastando tokens hasta agotar el
   * presupuesto: el desperdicio mas comun de un copiloto en produccion.
   */
  signal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void;
  now?: () => number;
  newProposalId?: () => string;
}

/**
 * Corre la herramienta con tope de tiempo. Distingue agotarse de reventar:
 * confundirlos manda al modelo —y al log— un motivo falso, y un fallo real de
 * una query se investigaria como un problema de lentitud.
 */
function runToolWithTimeout(
  promise: Promise<ToolResult>,
  ms: number,
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(
      () =>
        resolve({
          ok: false,
          error: "La consulta tardó demasiado. Acota el filtro y reinténtalo.",
          retryable: true,
        }),
      ms,
    );
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        resolve({
          ok: false,
          error: `La herramienta falló: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      });
  });
}

export async function runTurn(input: RunTurnInput): Promise<TurnOutcome> {
  const budget = { ...DEFAULT_BUDGET, ...input.budget };
  const now = input.now ?? (() => Date.now());
  const newProposalId =
    // Criptografico: el id viaja al cliente y es lo que se presenta para
    // confirmar. Adivinable no vale, aunque la propiedad se compruebe aparte.
    input.newProposalId ?? (() => randomUUID());
  const emit = input.onEvent ?? (() => {});
  const startedAt = now();

  const hasAttachments = (input.attachments?.length ?? 0) > 0;
  let ctx: TurnContext = {
    ...input.context,
    tainted: input.context.tainted || hasAttachments,
  };

  const userParts: Part[] = [{ text: input.userMessage }];
  for (const file of input.attachments ?? []) {
    userParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  }
  const contents: Content[] = [...input.history, { role: "user", parts: userParts }];

  const toolCalls: ToolCallRecord[] = [];
  let modelSteps = 0;
  const proposals: WriteProposal[] = [];
  const usage: ModelUsage = { tokensIn: 0, tokensOut: 0 };
  let model: string | null = null;

  const outcome = (
    finish: TurnFinish,
    text: string,
    detail?: string,
  ): TurnOutcome => ({
    finish,
    text,
    steps: modelSteps,
    tainted: ctx.tainted,
    toolCalls,
    proposals,
    usage,
    model,
    ...(detail ? { detail } : {}),
  });

  for (let step = 1; step <= budget.maxSteps; step += 1) {
    if (input.signal?.aborted) {
      return outcome("cancelado", "");
    }

    if (now() - startedAt > budget.maxWallClockMs) {
      return outcome(
        "presupuesto",
        "La consulta ha tardado más de lo permitido y se ha detenido. " +
          "Prueba a acotarla (una empresa, un manual, un estado).",
      );
    }

    modelSteps = step;
    emit({ type: "paso", step });

    // Se recalcula EN CADA PASO: aquí es donde la contaminación surte efecto.
    // Tras leer contenido de terceros, las herramientas de escritura dejan de
    // existir para el modelo.
    const allowed = allowedToolNames(input.registry, ctx);

    const modelStep = await input.callModel({
      tier: input.tier ?? "fast",
      systemInstruction: input.systemInstruction,
      contents,
      declarations: input.registry.declarations(allowed),
      allowedFunctionNames: allowed,
      timeoutMs: budget.modelTimeoutMs,
      signal: input.signal,
    });

    model = modelStep.model;

    if (modelStep.kind === "blocked") {
      return outcome(
        "bloqueado",
        "El proveedor del modelo bloqueó esta respuesta por su filtro de " +
          "contenido. No es un fallo de la plataforma ni de tus datos: " +
          "reformula la pregunta o avisa a soporte si se repite.",
        `${modelStep.reason} — ${modelStep.detail}`,
      );
    }

    usage.tokensIn += modelStep.usage.tokensIn;
    usage.tokensOut += modelStep.usage.tokensOut;

    if (modelStep.kind === "text") {
      emit({ type: "texto", text: modelStep.text });
      return outcome("completo", modelStep.text);
    }

    const calls = modelStep.calls.slice(0, budget.maxCallsPerStep);
    // Se reenvia el turno del modelo intacto. Reconstruirlo tira el
    // `thoughtSignature` que acompana a cada `functionCall`, y la API lo exige
    // de vuelta: sin el, el paso siguiente muere con 400.
    contents.push(
      modelStep.content ?? {
        role: "model",
        parts: calls.map((call) => ({
          functionCall: { id: call.id, name: call.name, args: call.args as never },
        })),
      },
    );

    const responseParts: Part[] = [];
    let taintedThisStep = false;

    for (const call of calls) {
      // Segunda cerradura. La primera la puso Gemini con allowedFunctionNames;
      // que se llegue aquí con un nombre no permitido significa que la
      // primera falló o que el modelo se salió del ámbito. Ninguna de las dos
      // es rutina: se aborta.
      try {
        assertToolAllowed(call.name, allowed);
      } catch (error) {
        if (error instanceof ToolNotAllowedError) {
          return outcome(
            "incidente",
            "Se ha detenido la consulta por seguridad: el asistente intentó " +
              "usar una capacidad que no le corresponde en esta pantalla.",
            `herramienta no permitida: ${error.toolName}`,
          );
        }
        throw error;
      }

      const tool = input.registry.get(call.name)!;
      emit({ type: "herramienta_inicio", name: call.name, args: call.args });
      const t0 = now();

      let result: ToolResult;
      if (tool.kind === "write") {
        // El bucle no escribe. Se comprueban los argumentos SIN ejecutar
        // —`validate`, nunca `invoke`— y la acción se aparca como propuesta.
        const validated = tool.validate(call.args);
        if (!validated.ok) {
          result = validated.result;
        } else {
          const proposal: WriteProposal = {
            id: newProposalId(),
            toolName: call.name,
            args: call.args,
          };
          proposals.push(proposal);
          emit({ type: "propuesta", proposal });
          result = {
            ok: true,
            data: {
              propuestaRegistrada: true,
              propuestaId: proposal.id,
              nota:
                "La acción NO se ha ejecutado. Queda pendiente de que una " +
                "persona la confirme. Dilo así al usuario.",
            },
          };
        }
      } else {
        result = await runToolWithTimeout(
          tool.invoke(call.args),
          budget.toolTimeoutMs,
        );
      }

      const durationMs = now() - t0;
      const tainted = isTainted(result);
      if (tainted) taintedThisStep = true;

      toolCalls.push({
        name: call.name,
        args: call.args,
        ok: result.ok,
        tainted,
        durationMs,
      });
      emit({ type: "herramienta_fin", name: call.name, ok: result.ok, durationMs });

      responseParts.push({
        functionResponse: {
          id: call.id,
          name: call.name,
          response: { output: renderToolResult(result, newFenceId()) },
        },
      });
    }

    contents.push({ role: "user", parts: responseParts });

    const before = ctx.tainted;
    ctx = advanceContext(ctx, taintedThisStep);
    if (!before && ctx.tainted) emit({ type: "contaminado" });
  }

  return outcome(
    "presupuesto",
    "He dado demasiadas vueltas sin llegar a una respuesta. Acota la " +
      "pregunta y lo intento de nuevo.",
  );
}
