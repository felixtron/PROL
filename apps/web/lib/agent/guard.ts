import { createLogger } from "@/lib/logger";
import { fail, type ToolResult } from "@prol/ai";

const log = createLogger("agent-tool");

/**
 * Envoltorio de todo handler de herramienta.
 *
 * Hace dos cosas, y las dos importan:
 *
 *  1. Convierte las excepciones en `ToolResult`. Los `requireX()` de la
 *     aplicación lanzan; el bucle necesita un resultado que devolver al
 *     modelo. Una herramienta que lanza abortaría el turno entero por algo
 *     tan normal como pedir una evidencia de otra empresa.
 *
 *  2. Colapsa "no existe" y "no autorizado" en el MISMO mensaje. Distinguirlos
 *     convierte la herramienta en un oráculo de existencia: preguntando por
 *     identificadores al azar se podría averiguar qué evidencias tiene otro
 *     tenant. El detalle real va al log del servidor, no al contexto.
 */
export async function guard(
  toolName: string,
  handler: () => Promise<ToolResult>,
): Promise<ToolResult> {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn("herramienta rechazada", { tool: toolName, reason: message });
    return fail(
      "No se encontró el recurso, o no tienes acceso a él con tu rol actual.",
    );
  }
}

/** Fecha en ISO corto para el modelo, o `null`. Evita zonas horarias en el prompt. */
export function isoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
