import { z } from "zod";

// ─── Snapshot de Evidence.formSnapshot (matriz de riesgos) ────────────────────

/**
 * Antes de este archivo, `evidence-detail.tsx` afirmaba la forma de
 * `Evidence.formSnapshot` con un `as` de TypeScript: cero comprobación en
 * runtime. Esta unión versionada es la que reemplaza ese cast — ver plan
 * 01-04 de la fase "Higiene y operación".
 */

/** Versión que llevan los snapshots escritos a partir de la fase 1. */
export const EVIDENCE_SNAPSHOT_VERSION = 1 as const;

export const riskSnapshotItemSchema = z.object({
  type: z.enum(["RISK", "OPPORTUNITY"]),
  description: z.string(),
  probability: z.number(),
  impact: z.number(),
  score: z.number(),
  level: z.string().nullable(),
  actions: z.string().nullable(),
  responsible: z.string().nullable(),
});

/** Campos comunes a las dos formas. `config` se deja sin validar a propósito:
 *  `parseRiskConfig()` ya lo sanea campo a campo y degrada al default. */
const riskSnapshotBody = {
  title: z.string().optional(),
  periodLabel: z.string().nullable().optional(),
  config: z.unknown().optional(),
  submittedAt: z.string().optional(),
  items: z.array(riskSnapshotItemSchema).default([]),
};

/** Forma emitida desde que existe el discriminador. */
export const riskSnapshotV1Schema = z.object({
  snapshotVersion: z.literal(EVIDENCE_SNAPSHOT_VERSION),
  kind: z.literal("RISK_MATRIX"),
  ...riskSnapshotBody,
});

/**
 * Forma emitida antes de la fase 1: sin discriminador. Se reconoce por ausencia.
 *
 * `snapshotVersion: z.undefined()` no es decorativo: rechaza explícitamente
 * cualquier objeto que traiga la clave con otro valor, para que una v2 futura mal
 * formada NO caiga aquí en silencio y se renderice como si fuera una matriz de
 * riesgos. Ese render silenciosamente incorrecto es justo el bug que este archivo
 * viene a cerrar.
 */
export const riskSnapshotLegacySchema = z.object({
  snapshotVersion: z.undefined(),
  ...riskSnapshotBody,
});

/** `z.union` y no `z.discriminatedUnion`: la rama legacy no tiene la clave. */
export const evidenceSnapshotSchema = z.union([
  riskSnapshotV1Schema,
  riskSnapshotLegacySchema,
]);

export type RiskSnapshotItem = z.infer<typeof riskSnapshotItemSchema>;
export type RiskSnapshotV1 = z.infer<typeof riskSnapshotV1Schema>;
export type EvidenceSnapshot = z.infer<typeof evidenceSnapshotSchema>;

/**
 * Lee un `Evidence.formSnapshot` degradando a `null`, igual que `readContent()`
 * en `lib/actions/lesson-blocks.ts`. Nunca lanza: una fila corrupta debe dejar la
 * ficha sin tabla, no romper la pantalla del revisor.
 */
export function parseEvidenceSnapshot(value: unknown): EvidenceSnapshot | null {
  const parsed = evidenceSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
