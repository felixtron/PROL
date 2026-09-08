/**
 * Conversión Zod → esquema de función de Gemini, deliberadamente PARCIAL.
 *
 * No es un conversor de propósito general y no debe llegar a serlo. Acepta
 * sólo el subconjunto que una herramienta del harness tiene permitido pedir
 * —identificadores, enums, números, booleanos y listas de eso mismo— y lanza
 * ante cualquier otra cosa. Así la regla "los parámetros son IDs y enums,
 * nunca texto que acabe en una consulta" deja de ser una norma de estilo que
 * alguien puede saltarse en una revisión y pasa a romper el arranque.
 *
 * Igual de importante es `BANNED_PARAM_NAMES`: ninguna herramienta puede
 * aceptar `tenantId`, `userId`, `role`, `url`, `where` ni parientes. La
 * identidad y el alcance salen SIEMPRE de la sesión del humano, leídos dentro
 * de los `requireX()` que ya existen en la aplicación. Si el modelo no puede
 * nombrar esos campos, no puede pedir actuar como otro ni contra otro tenant.
 */

import { Type } from "@google/genai";
import type { ZodTypeAny, ZodObject, ZodRawShape } from "zod";

/**
 * El propio enum del SDK, no una copia. Si Gemini cambia el juego de tipos,
 * esto deja de compilar en vez de fallar en la primera llamada real.
 */
export type GeminiSchemaType = Type;

/** Forma que espera `FunctionDeclaration.parameters` del SDK de Gemini. */
export interface GeminiSchema {
  type: Type;
  description?: string;
  enum?: string[];
  format?: string;
  items?: GeminiSchema;
  properties?: Record<string, GeminiSchema>;
  required?: string[];
  nullable?: boolean;
}

/** Error de definición: se lanza al importar la herramienta, no en runtime. */
export class ToolSchemaError extends Error {
  constructor(toolName: string, path: string, detail: string) {
    super(`Herramienta "${toolName}" · parámetro "${path}": ${detail}`);
    this.name = "ToolSchemaError";
  }
}

/**
 * Nombres prohibidos, comparados en minúsculas y sin guiones bajos.
 *
 * Dos familias:
 *  1. Identidad y alcance — los aporta la sesión, jamás el modelo.
 *  2. Ejecución y red — un parámetro llamado `url`, `path` o `command` es un
 *     canal de exfiltración o de SSRF esperando a que alguien lo cablee.
 */
export const BANNED_PARAM_NAMES: ReadonlySet<string> = new Set([
  // identidad y alcance
  "tenantid",
  "tenant",
  "tenantslug",
  "userid",
  "user",
  "actorid",
  "ownerid",
  "professorid",
  "consultantid",
  "role",
  "roles",
  "permission",
  "permissions",
  "scope",
  "scopes",
  "impersonate",
  // consulta cruda
  "sql",
  "query",
  "rawquery",
  "where",
  "filter",
  "orderby",
  "select",
  "include",
  "prisma",
  // ejecución y red
  "url",
  "uri",
  "endpoint",
  "host",
  "path",
  "filepath",
  "file",
  "command",
  "cmd",
  "script",
  "eval",
  "html",
]);

/** Un objeto anidado como mucho. Más profundidad es una herramienta mal cortada. */
const MAX_DEPTH = 1;
/** Más de doce parámetros y el modelo empieza a equivocarse de campo. */
const MAX_PROPERTIES = 12;
/** Un enum larguísimo es en realidad un identificador disfrazado. */
const MAX_ENUM_VALUES = 40;
/** La descripción de cada campo ES prompt: obligatoria y con contenido. */
const MIN_DESCRIPTION = 8;

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[_-]/g, "");
}

interface ZodDefLike {
  typeName?: string;
  innerType?: ZodTypeAny;
  type?: ZodTypeAny;
  values?: readonly string[];
  shape?: () => ZodRawShape;
  checks?: { kind?: string }[];
}

function defOf(schema: ZodTypeAny): ZodDefLike {
  return (schema as unknown as { _def: ZodDefLike })._def;
}

interface Unwrapped {
  inner: ZodTypeAny;
  optional: boolean;
}

/** Desenvuelve `.optional()`, `.nullable()` y `.default()` conservando la descripción. */
function unwrap(schema: ZodTypeAny): Unwrapped {
  let current = schema;
  let optional = false;
  for (let i = 0; i < 6; i += 1) {
    const def = defOf(current);
    const name = def.typeName;
    if (
      name === "ZodOptional" ||
      name === "ZodDefault" ||
      name === "ZodNullable"
    ) {
      optional = true;
      if (!def.innerType) break;
      const next = def.innerType;
      // La descripción suele estar en el envoltorio externo.
      if (!next.description && current.description) {
        current = next.describe(current.description);
      } else {
        current = next;
      }
      continue;
    }
    break;
  }
  return { inner: current, optional };
}

function convert(
  schema: ZodTypeAny,
  toolName: string,
  path: string,
  depth: number,
): GeminiSchema {
  const { inner } = unwrap(schema);
  const def = defOf(inner);
  const typeName = def.typeName ?? "desconocido";
  const description = inner.description;

  if (!description || description.trim().length < MIN_DESCRIPTION) {
    throw new ToolSchemaError(
      toolName,
      path,
      `falta .describe() con al menos ${MIN_DESCRIPTION} caracteres. La ` +
        "descripción la lee el modelo: sin ella elegirá mal el campo.",
    );
  }

  switch (typeName) {
    case "ZodString":
      return { type: Type.STRING, description };

    case "ZodBoolean":
      return { type: Type.BOOLEAN, description };

    case "ZodNumber": {
      const isInt = (def.checks ?? []).some((c) => c.kind === "int");
      return { type: isInt ? Type.INTEGER : Type.NUMBER, description };
    }

    case "ZodEnum": {
      const values = [...(def.values ?? [])];
      if (values.length === 0) {
        throw new ToolSchemaError(toolName, path, "enum vacío");
      }
      if (values.length > MAX_ENUM_VALUES) {
        throw new ToolSchemaError(
          toolName,
          path,
          `enum de ${values.length} valores; el máximo es ${MAX_ENUM_VALUES}. ` +
            "Un enum tan largo es en realidad un identificador.",
        );
      }
      return { type: Type.STRING, format: "enum", enum: values, description };
    }

    case "ZodArray": {
      if (!def.type) {
        throw new ToolSchemaError(toolName, path, "lista sin tipo de elemento");
      }
      return {
        type: Type.ARRAY,
        description,
        items: convert(def.type, toolName, `${path}[]`, depth),
      };
    }

    case "ZodObject": {
      if (depth > MAX_DEPTH) {
        throw new ToolSchemaError(
          toolName,
          path,
          `anidamiento de profundidad ${depth}; el máximo es ${MAX_DEPTH}. ` +
            "Si necesitas más, la herramienta está haciendo dos cosas.",
        );
      }
      return convertObject(inner as ZodObject<ZodRawShape>, toolName, path, depth);
    }

    default:
      throw new ToolSchemaError(
        toolName,
        path,
        `tipo ${typeName} no permitido. El subconjunto admitido es: string, ` +
          "number, boolean, enum, array y object anidado una vez.",
      );
  }
}

function convertObject(
  schema: ZodObject<ZodRawShape>,
  toolName: string,
  path: string,
  depth: number,
): GeminiSchema {
  const shape = defOf(schema).shape?.() ?? {};
  const entries = Object.entries(shape);

  if (entries.length > MAX_PROPERTIES) {
    throw new ToolSchemaError(
      toolName,
      path || "(raíz)",
      `${entries.length} parámetros; el máximo es ${MAX_PROPERTIES}.`,
    );
  }

  const properties: Record<string, GeminiSchema> = {};
  const required: string[] = [];

  for (const [key, value] of entries) {
    if (BANNED_PARAM_NAMES.has(normalizeName(key))) {
      throw new ToolSchemaError(
        toolName,
        path ? `${path}.${key}` : key,
        "nombre prohibido. La identidad y el alcance salen de la sesión del " +
          "usuario, nunca de los argumentos que propone el modelo.",
      );
    }
    const child = value as ZodTypeAny;
    const childPath = path ? `${path}.${key}` : key;
    properties[key] = convert(child, toolName, childPath, depth + 1);
    if (!unwrap(child).optional) required.push(key);
  }

  const result: GeminiSchema = { type: Type.OBJECT, properties };
  if (required.length > 0) result.required = required;
  if (schema.description) result.description = schema.description;
  return result;
}

/**
 * Convierte el objeto de parámetros de una herramienta. Lanza `ToolSchemaError`
 * ante cualquier construcción fuera del subconjunto permitido.
 */
export function toGeminiSchema(
  params: ZodObject<ZodRawShape>,
  toolName: string,
): GeminiSchema {
  return convertObject(params, toolName, "", 0);
}
