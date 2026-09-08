/**
 * Qué herramientas existen para el modelo en ESTE paso del bucle.
 *
 * El resultado alimenta `functionCallingConfig.allowedFunctionNames`, así que
 * la restricción no es sólo nuestra: la hace cumplir el propio servidor de
 * Gemini, que no emitirá una llamada a una función que no está en la lista.
 * Encima de eso, `assertToolAllowed` vuelve a comprobarlo antes de ejecutar
 * nada, porque una defensa que vive únicamente en el proveedor no es una
 * defensa.
 *
 * Se recalcula en CADA paso, no una vez por turno. Esa es la pieza que hace
 * funcionar la contaminación: en cuanto una herramienta devuelve contenido
 * escrito por terceros, el paso siguiente se queda sólo con lectura, y el
 * texto inyectado se encuentra con que la herramienta que quería usar ya no
 * existe.
 */

import type { AgentRole, AgentTool, ToolRegistry } from "./registry";

export interface TurnContext {
  /** Rol del humano cuya sesión ejecuta el turno. */
  role: AgentRole;
  /** Ruta funcional donde está el usuario: "evidence", "surveys", "manuals"… */
  surface: string;
  /**
   * Cierto en cuanto una herramienta ha devuelto un bloque `untrusted` en
   * este turno. Una vez cierto, no vuelve a ser falso hasta el turno siguiente.
   */
  tainted: boolean;
}

export type DenyReason =
  | "rol"
  | "superficie"
  | "turno-contaminado"
  | "desconocida";

export class ToolNotAllowedError extends Error {
  constructor(
    readonly toolName: string,
    readonly reason: DenyReason,
  ) {
    super(`Herramienta no permitida en este paso: "${toolName}" (${reason})`);
    this.name = "ToolNotAllowedError";
  }
}

/** Motivo por el que una herramienta concreta no entra, o `null` si entra. */
export function denyReason(
  tool: AgentTool,
  ctx: TurnContext,
): DenyReason | null {
  if (!tool.roles.includes(ctx.role)) return "rol";
  if (tool.surfaces && !tool.surfaces.includes(ctx.surface)) {
    return "superficie";
  }
  if (ctx.tainted && tool.kind === "write") return "turno-contaminado";
  return null;
}

/**
 * Nombres permitidos ahora mismo, ordenados de forma estable para que la
 * clave de caché del catálogo no cambie sin motivo.
 */
export function allowedToolNames(
  registry: ToolRegistry,
  ctx: TurnContext,
): string[] {
  return registry
    .all()
    .filter((tool) => denyReason(tool, ctx) === null)
    .map((tool) => tool.name);
}

/**
 * Barrera previa a ejecutar. Que salte significa una de dos cosas: el modelo
 * ha inventado un nombre, o algo en el contexto le ha convencido de salirse
 * de su ámbito. Ninguna de las dos es rutina — quien la llama debe registrar
 * el incidente y abortar el turno, no reintentar.
 */
export function assertToolAllowed(
  name: string,
  allowed: readonly string[],
): void {
  if (!allowed.includes(name)) {
    throw new ToolNotAllowedError(name, "desconocida");
  }
}

/**
 * Contexto del paso siguiente. `tainted` sólo avanza en una dirección: una vez
 * contaminado el turno, ninguna herramienta posterior lo limpia.
 */
export function advanceContext(
  ctx: TurnContext,
  taintedByStep: boolean,
): TurnContext {
  return taintedByStep && !ctx.tainted ? { ...ctx, tainted: true } : ctx;
}
