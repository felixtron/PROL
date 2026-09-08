/**
 * Cliente Gemini del harness — Developer API (AI Studio), una sola clave.
 *
 * Es el único punto del motor que habla con la red, y está detrás de la
 * interfaz `CallModel` para que el bucle se pueda probar sin salir a
 * internet.
 *
 * Tres cosas que aquí no son detalle:
 *
 *  1. `allowedFunctionNames`. Restringe qué funciones puede emitir el modelo
 *     EN ESTE PASO, y lo hace cumplir el servidor de Gemini. Es la primera de
 *     las dos cerraduras; la segunda es `assertToolAllowed` antes de ejecutar.
 *
 *  2. `safetySettings`. El contenido de esta plataforma es NOM-035: riesgo
 *     psicosocial, violencia laboral, acoso. Con los umbrales por defecto,
 *     material de cumplimiento legítimo se bloquea. Se bajan a BLOCK_ONLY_HIGH
 *     y aun así hay que medir la tasa de bloqueo con respuestas reales antes
 *     de abrir el módulo de encuestas.
 *
 *  3. El bloqueo por seguridad tiene salida propia (`blocked`), no se mezcla
 *     con los errores. Llega como respuesta sin candidatos, y si se trata
 *     como un fallo genérico produce tickets irreproducibles.
 */

import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  type Content,
  type GenerateContentResponse,
  type SafetySetting,
} from "@google/genai";
import type { GeminiFunctionDeclaration } from "./registry";

/**
 * Modelos por tipo de trabajo. `fast` atiende la conversación y las
 * herramientas de lectura, que serán la inmensa mayoría del volumen; `deep`
 * queda para redacción y razonamiento sobre cumplimiento. Ambos se pueden
 * fijar por entorno sin tocar código, que es lo que permite subir de versión
 * el día que salga una nueva sin desplegar.
 */
export const MODELS = {
  fast: process.env.GEMINI_MODEL_FAST ?? "gemini-3.6-flash",
  // Unico "pro" que la API ofrece hoy, y es preview. Nada usa todavia este
  // nivel —`runTurn` va a `fast` por defecto—, asi que la etiqueta preview no
  // afecta a produccion; el dia que se use para redactar, revisa si ya hay GA.
  deep: process.env.GEMINI_MODEL_DEEP ?? "gemini-3.1-pro-preview",
} as const;

export type ModelTier = keyof typeof MODELS;

/**
 * Umbrales de seguridad. BLOCK_ONLY_HIGH es materialmente más permisivo que
 * el defecto (BLOCK_MEDIUM_AND_ABOVE) sin llegar a desactivar el filtro. Si
 * la medición con contenido real sigue mostrando bloqueos, el siguiente
 * escalón es OFF, y esa es una decisión de política, no de código.
 */
const SAFETY_SETTINGS: SafetySetting[] = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }));

/**
 * Tope de salida por paso. Un turno son varios pasos, asi que sin esto una
 * respuesta desbocada se multiplica por el presupuesto de pasos. El copiloto
 * responde en parrafos, no en capitulos.
 */
const MAX_OUTPUT_TOKENS = 2_048;

/**
 * Presupuesto de razonamiento. Estos modelos razonan por defecto y se cobra:
 * en el turno del copiloto —elegir una herramienta y redactar dos frases— la
 * mayor parte de ese gasto no compra nada. Se deja un margen corto en vez de
 * apagarlo, que encadenar dos o tres herramientas si lo necesita.
 */
const THINKING_BUDGET = 512;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta GEMINI_API_KEY. El agente usa la Developer API de Gemini; " +
          "sin clave no se puede atender ningún turno.",
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** Sólo para pruebas: descarta el singleton. */
export function resetClient(): void {
  client = null;
}

export interface ModelFunctionCall {
  /** Identificador que devuelve Gemini para casar la respuesta, si lo hay. */
  id?: string;
  name: string;
  args: unknown;
}

export interface ModelUsage {
  tokensIn: number;
  tokensOut: number;
}

export interface ModelRequest {
  tier: ModelTier;
  systemInstruction: string;
  contents: Content[];
  declarations: GeminiFunctionDeclaration[];
  /** Nombres que el modelo puede emitir en este paso. Vacío = ninguna función. */
  allowedFunctionNames: string[];
  timeoutMs: number;
  /** Cancelación del cliente. Se combina con el timeout propio. */
  signal?: AbortSignal;
}

export type ModelStep =
  | { kind: "text"; text: string; usage: ModelUsage; model: string }
  | {
      kind: "calls";
      calls: ModelFunctionCall[];
      /**
       * El turno del modelo TAL Y COMO VINO. Hay que reenviarlo intacto en el
       * historial: desde Gemini 3 las partes `functionCall` llevan un
       * `thoughtSignature` que la API exige de vuelta, y reconstruir el turno
       * a mano lo pierde y la siguiente llamada falla con 400.
       */
      content: Content | null;
      usage: ModelUsage;
      model: string;
    }
  | { kind: "blocked"; reason: string; detail: string; model: string };

/** La firma que consume el bucle. Sustituible en pruebas. */
export type CallModel = (request: ModelRequest) => Promise<ModelStep>;

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (typeof status === "number") {
    return status === 408 || status === 429 || status >= 500;
  }
  const message = String((error as Error)?.message ?? "");
  return /\b(429|500|502|503|504|timeout|ECONNRESET|ETIMEDOUT)\b/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function usageOf(response: GenerateContentResponse): ModelUsage {
  const meta = response.usageMetadata;
  return {
    tokensIn: meta?.promptTokenCount ?? 0,
    tokensOut: meta?.candidatesTokenCount ?? 0,
  };
}

/**
 * ¿Vino la respuesta cortada por el filtro de seguridad? Dos formas: el
 * prompt bloqueado de entrada (`promptFeedback.blockReason`) o el candidato
 * cortado a mitad (`finishReason` distinto de STOP y sin contenido útil).
 */
function blockedReason(response: GenerateContentResponse): string | null {
  const promptBlock = response.promptFeedback?.blockReason;
  if (promptBlock) return String(promptBlock);

  const candidate = response.candidates?.[0];
  if (!candidate) return "SIN_CANDIDATOS";

  const finish = candidate.finishReason ? String(candidate.finishReason) : null;
  if (finish && finish !== "STOP" && finish !== "MAX_TOKENS") {
    return finish;
  }
  return null;
}

export const callGemini: CallModel = async (request) => {
  const model = MODELS[request.tier];
  const ai = getClient();

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // Un solo controlador para las dos causas de corte: nuestro timeout y el
    // cliente que cierra la conexion. Si ya venia abortado, no se llama.
    if (request.signal?.aborted) {
      throw new Error("Turno cancelado por el cliente");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    const onAbort = () => controller.abort();
    request.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const response = await ai.models.generateContent({
        model,
        contents: request.contents,
        config: {
          systemInstruction: request.systemInstruction,
          safetySettings: SAFETY_SETTINGS,
          abortSignal: controller.signal,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          thinkingConfig: { thinkingBudget: THINKING_BUDGET },
          ...(request.declarations.length > 0
            ? {
                tools: [{ functionDeclarations: request.declarations }],
                toolConfig: {
                  functionCallingConfig: {
                    // VALIDATED: el modelo puede responder en texto o llamar a
                    // una función, pero sólo a una de las permitidas.
                    mode: FunctionCallingConfigMode.VALIDATED,
                    allowedFunctionNames: request.allowedFunctionNames,
                  },
                },
              }
            : {}),
        },
      });

      const blocked = blockedReason(response);
      if (blocked) {
        return {
          kind: "blocked",
          reason: blocked,
          detail:
            response.promptFeedback?.blockReasonMessage ??
            "El proveedor cortó la respuesta por su filtro de contenido.",
          model,
        };
      }

      const calls = response.functionCalls ?? [];
      if (calls.length > 0) {
        return {
          kind: "calls",
          model,
          content: response.candidates?.[0]?.content ?? null,
          usage: usageOf(response),
          calls: calls.map((call) => ({
            id: call.id,
            name: call.name ?? "",
            args: call.args ?? {},
          })),
        };
      }

      return {
        kind: "text",
        text: response.text ?? "",
        usage: usageOf(response),
        model,
      };
    } catch (error) {
      lastError = error;
      // Si aborto el cliente no hay nada que reintentar: ya no hay quien lea.
      if (request.signal?.aborted) break;
      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) break;
      await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onAbort);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Fallo desconocido al llamar a Gemini"));
};
