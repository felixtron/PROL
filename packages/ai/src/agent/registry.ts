/**
 * Catálogo de herramientas del harness.
 *
 * Dos invariantes sostienen todo lo demás:
 *
 *  1. `run` NO recibe contexto. Ni tenant, ni usuario, ni rol. Cada handler
 *     llama a los `requireX()` que ya usa la aplicación, y esos leen la
 *     sesión. Es lo que hace que el aislamiento entre clientes no dependa de
 *     que el modelo se porte bien: la variable no existe en ninguna firma.
 *
 *  2. Fuera del registro, `run` sólo acepta `unknown`. Los argumentos que
 *     llegan del modelo se validan con Zod dentro de `invoke()`; no hay
 *     manera de invocar una herramienta saltándose esa validación.
 *
 * `defineTool` valida la definición al importarla, así que una herramienta
 * mal construida rompe el arranque en vez de fallar en producción.
 */

import type { TypeOf, ZodObject, ZodRawShape } from "zod";
import type { ToolResult } from "./envelope";
import { fail } from "./envelope";
import { toGeminiSchema, type GeminiSchema } from "./schema";

/** Lectura: se ejecuta en el bucle. Escritura: sólo produce una propuesta. */
export type ToolKind = "read" | "write";

/**
 * Roles con acceso al agente. STUDENT no aparece a propósito: el harness es
 * exclusivo de profesores y administradores, y esa exclusión vive en el tipo
 * para que no pueda relajarse por descuido en una herramienta suelta.
 */
export const AGENT_ROLES = ["PROFESSOR", "ADMIN", "SUPER_ADMIN"] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export function isAgentRole(role: string): role is AgentRole {
  return (AGENT_ROLES as readonly string[]).includes(role);
}

/** Módulos de la plataforma. Sirve para agrupar y para trazar el uso. */
export const MODULE_KEYS = [
  "courses",
  "surveys",
  "manuals",
  "evidence",
  "advisory",
  "dc3",
  "evaluations",
  "risk",
  "companies",
  "workshops",
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

const NAME_PATTERN = /^[a-z][a-z0-9_]{2,47}$/;
const MIN_TOOL_DESCRIPTION = 30;
const MAX_TOOL_DESCRIPTION = 600;

export class ToolDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolDefinitionError";
  }
}

/** Declaración tal y como se le pasa a Gemini en `tools[].functionDeclarations`. */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: GeminiSchema;
}

export interface AgentToolSpec<P extends ZodObject<ZodRawShape>> {
  /** snake_case, estable. Es contrato con el modelo: renombrar rompe el historial. */
  name: string;
  /** En español y explícita. Esto ES prompt. */
  description: string;
  kind: ToolKind;
  module: ModuleKey;
  /** Roles que pueden verla. Filtro grueso; la autorización real la hace `run`. */
  roles: readonly AgentRole[];
  /** Rutas donde se ofrece. Sin esto, disponible en todas. */
  surfaces?: readonly string[];
  params: P;
  run: (args: TypeOf<P>) => Promise<ToolResult>;
}

export type ValidationOutcome =
  | { ok: true; args: unknown }
  | { ok: false; result: ToolResult };

/** Herramienta ya validada, con los tipos borrados para poder guardarlas juntas. */
export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly kind: ToolKind;
  readonly module: ModuleKey;
  readonly roles: readonly AgentRole[];
  readonly surfaces?: readonly string[];
  readonly declaration: GeminiFunctionDeclaration;

  /** Comprueba los argumentos del modelo SIN ejecutar nada. */
  validate(rawArgs: unknown): ValidationOutcome;

  /**
   * Valida y ejecuta. Es lo que usa el bucle, y por eso en una herramienta de
   * escritura SE NIEGA a hacer nada: el bucle no escribe jamás. Que la
   * negativa viva aquí y no en el bucle es deliberado — así un refactor que
   * se equivoque de rama falla en voz alta en vez de escribir en la base.
   */
  invoke(rawArgs: unknown): Promise<ToolResult>;

  /**
   * El ÚNICO camino que ejecuta una escritura. Lo llama exclusivamente el
   * endpoint de confirmación, después de que una persona haya aprobado la
   * propuesta y de volver a pasar por los `requireX()` de la aplicación.
   * Buscar `.commit(` en el repo enumera todos los sitios donde el agente
   * puede llegar a cambiar algo.
   */
  commit(rawArgs: unknown): Promise<ToolResult>;
}

export function defineTool<P extends ZodObject<ZodRawShape>>(
  spec: AgentToolSpec<P>,
): AgentTool {
  if (!NAME_PATTERN.test(spec.name)) {
    throw new ToolDefinitionError(
      `Nombre de herramienta inválido: "${spec.name}". Debe ser snake_case, ` +
        "empezar por letra y medir entre 3 y 48 caracteres.",
    );
  }
  const description = spec.description.trim();
  if (
    description.length < MIN_TOOL_DESCRIPTION ||
    description.length > MAX_TOOL_DESCRIPTION
  ) {
    throw new ToolDefinitionError(
      `Descripción de "${spec.name}" fuera de rango ` +
        `(${description.length} caracteres; se admite de ${MIN_TOOL_DESCRIPTION} ` +
        `a ${MAX_TOOL_DESCRIPTION}). El modelo elige la herramienta por aquí.`,
    );
  }
  if (spec.roles.length === 0) {
    throw new ToolDefinitionError(
      `"${spec.name}" no declara ningún rol: sería inalcanzable.`,
    );
  }

  // Lanza si los parámetros se salen del subconjunto permitido.
  const parameters = toGeminiSchema(spec.params, spec.name);

  return {
    name: spec.name,
    description,
    kind: spec.kind,
    module: spec.module,
    roles: spec.roles,
    surfaces: spec.surfaces,
    declaration: { name: spec.name, description, parameters },

    validate(rawArgs: unknown): ValidationOutcome {
      const parsed = spec.params.safeParse(rawArgs ?? {});
      if (parsed.success) return { ok: true, args: parsed.data };
      const detail = parsed.error.issues
        .slice(0, 4)
        .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
        .join("; ");
      // Se devuelve al modelo para que corrija; no aborta el turno.
      return { ok: false, result: fail(`Argumentos inválidos — ${detail}`, true) };
    },

    async invoke(rawArgs: unknown): Promise<ToolResult> {
      if (spec.kind === "write") {
        return fail(
          `"${spec.name}" es una acción de escritura y no se ejecuta desde el ` +
            "bucle: debe pasar por una propuesta que confirme una persona.",
        );
      }
      const checked = this.validate(rawArgs);
      if (!checked.ok) return checked.result;
      return spec.run(checked.args as TypeOf<P>);
    },

    async commit(rawArgs: unknown): Promise<ToolResult> {
      const checked = this.validate(rawArgs);
      if (!checked.ok) return checked.result;
      return spec.run(checked.args as TypeOf<P>);
    },
  };
}

export interface ToolRegistry {
  all(): readonly AgentTool[];
  get(name: string): AgentTool | undefined;
  /** Declaraciones para el subconjunto permitido de este paso, en orden estable. */
  declarations(names: readonly string[]): GeminiFunctionDeclaration[];
}

export function createRegistry(tools: readonly AgentTool[]): ToolRegistry {
  const byName = new Map<string, AgentTool>();
  for (const tool of tools) {
    if (byName.has(tool.name)) {
      throw new ToolDefinitionError(
        `Herramienta duplicada: "${tool.name}". Los nombres son contrato con ` +
          "el modelo y deben ser únicos en todo el catálogo.",
      );
    }
    byName.set(tool.name, tool);
  }
  const ordered = [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    all: () => ordered,
    get: (name) => byName.get(name),
    declarations(names) {
      const wanted = new Set(names);
      return ordered
        .filter((t) => wanted.has(t.name))
        .map((t) => t.declaration);
    },
  };
}
