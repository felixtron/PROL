"use server";

import { revalidatePath } from "next/cache";
import { db, type RiskItemType } from "@prol/db";
import { EVIDENCE_SNAPSHOT_VERSION } from "@prol/shared";
import {
  requireAssignmentMemberAccess,
  requireRiskAssessmentAccess,
} from "@/lib/manual-access";
import {
  DEFAULT_RISK_CONFIG,
  parseRiskConfig,
  riskLevel,
  riskScore,
} from "@/lib/compliance";
import { submitEvidence } from "@/lib/actions/evidence";

export type RiskActionResult =
  | { success: true; assessmentId?: string }
  | { success: false; error: string };

export interface RiskRowInput {
  type: RiskItemType;
  description: string;
  probability: number;
  impact: number;
  actions?: string;
  responsible?: string;
}

function optionalText(value: unknown, max = 2000): string | null {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

function clampScale(value: unknown, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(n, 1), max);
}

/**
 * Abre la matriz de una actividad: reutiliza el borrador vivo si lo hay, y si
 * no crea uno nuevo copiando la configuración del requisito.
 *
 * La configuración se congela en la matriz al crearla: si mañana se cambian
 * los umbrales del requisito, una matriz ya capturada no debe reinterpretar
 * sus niveles a posteriori.
 */
export async function openRiskMatrix(input: {
  activityId: string;
}): Promise<RiskActionResult> {
  const activity = await db.complianceActivity.findUnique({
    where: { id: input.activityId },
    select: {
      id: true,
      assignmentId: true,
      periodLabel: true,
      requirement: {
        select: { id: true, name: true, kind: true, toolConfig: true },
      },
    },
  });
  if (!activity) return { success: false, error: "Actividad no encontrada" };
  if (activity.requirement.kind !== "RISK_MATRIX") {
    return { success: false, error: "Este requisito no usa la matriz de riesgos" };
  }

  const { user, assignment } = await requireAssignmentMemberAccess(
    activity.assignmentId,
  );

  const draft = await db.riskAssessment.findFirst({
    where: {
      assignmentId: assignment.id,
      requirementId: activity.requirement.id,
      status: "DRAFT",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (draft) return { success: true, assessmentId: draft.id };

  const created = await db.riskAssessment.create({
    data: {
      tenantId: assignment.tenantId,
      companyId: assignment.companyId,
      assignmentId: assignment.id,
      requirementId: activity.requirement.id,
      title: activity.requirement.name,
      periodLabel: activity.periodLabel,
      config: (activity.requirement.toolConfig ??
        DEFAULT_RISK_CONFIG) as object,
      createdById: user.id,
    },
    select: { id: true },
  });
  return { success: true, assessmentId: created.id };
}

/**
 * Guarda las filas de la matriz reemplazando las anteriores.
 *
 * Reemplazo completo y no diff fila a fila: la matriz se edita como una tabla
 * y el usuario reordena, borra e inserta libremente; casar identidades entre
 * envíos daría más trabajo y más formas de equivocarse que reescribir un
 * borrador que todavía no es evidencia de nada.
 */
export async function saveRiskItems(input: {
  assessmentId: string;
  title?: string;
  rows: RiskRowInput[];
}): Promise<RiskActionResult> {
  const { assessment } = await requireRiskAssessmentAccess(input.assessmentId, {
    forEdit: true,
  });

  const stored = await db.riskAssessment.findUnique({
    where: { id: assessment.id },
    select: { config: true },
  });
  const config = parseRiskConfig(stored?.config);

  const rows = input.rows
    .filter((r) => String(r.description ?? "").trim().length > 0)
    .slice(0, 200)
    .map((r, index) => {
      const probability = clampScale(r.probability, config.scaleMax);
      const impact = clampScale(r.impact, config.scaleMax);
      const score = riskScore(probability, impact);
      return {
        assessmentId: assessment.id,
        type: r.type === "OPPORTUNITY" ? ("OPPORTUNITY" as const) : ("RISK" as const),
        description: String(r.description).trim().slice(0, 2000),
        probability,
        impact,
        score,
        // El nivel se congela con la etiqueta vigente al capturar, para que la
        // fila siga significando lo mismo si luego cambian los umbrales.
        level: riskLevel(score, config).label,
        actions: optionalText(r.actions),
        responsible: optionalText(r.responsible, 200),
        position: index,
      };
    });

  await db.$transaction([
    db.riskItem.deleteMany({ where: { assessmentId: assessment.id } }),
    ...(rows.length ? [db.riskItem.createMany({ data: rows })] : []),
    db.riskAssessment.update({
      where: { id: assessment.id },
      data: {
        ...(input.title ? { title: String(input.title).trim().slice(0, 300) } : {}),
        updatedAt: new Date(),
      },
    }),
  ]);

  revalidatePath(`/dashboard/risk/${assessment.id}`);
  return { success: true, assessmentId: assessment.id };
}

/**
 * Congela la matriz y la entrega como evidencia de su actividad.
 *
 * El snapshot va dentro de la evidencia: lo que el consultor aprueba debe
 * poder leerse años después aunque la matriz viva se haya duplicado y editado
 * cinco veces desde entonces.
 */
export async function submitRiskMatrix(input: {
  assessmentId: string;
  activityId: string;
  notes?: string;
}): Promise<RiskActionResult> {
  const { user, assessment } = await requireRiskAssessmentAccess(
    input.assessmentId,
    { forEdit: true },
  );

  const full = await db.riskAssessment.findUnique({
    where: { id: assessment.id },
    select: {
      id: true,
      title: true,
      periodLabel: true,
      config: true,
      items: { orderBy: { position: "asc" } },
    },
  });
  if (!full || full.items.length === 0) {
    return { success: false, error: "Agrega al menos un riesgo u oportunidad" };
  }

  const activity = await db.complianceActivity.findUnique({
    where: { id: input.activityId },
    select: { assignmentId: true },
  });
  if (!activity || activity.assignmentId !== assessment.assignmentId) {
    return { success: false, error: "La actividad no corresponde a esta matriz" };
  }

  const submittedAt = new Date();
  await db.riskAssessment.update({
    where: { id: assessment.id },
    data: { status: "SUBMITTED", submittedById: user.id, submittedAt },
  });

  const result = await submitEvidence({
    activityId: input.activityId,
    title: full.title,
    notes: input.notes,
    riskAssessmentId: full.id,
  });

  if (!result.success) {
    // La entrega no cuajó (actividad cerrada, ya hay una en revisión…): se
    // devuelve la matriz a borrador para que el usuario pueda reintentarlo
    // sin quedarse con una matriz congelada y ninguna evidencia.
    await db.riskAssessment.update({
      where: { id: assessment.id },
      data: { status: "DRAFT", submittedById: null, submittedAt: null },
    });
    return { success: false, error: result.error };
  }

  await db.evidence.update({
    where: { id: result.evidenceId! },
    data: {
      formSnapshot: {
        snapshotVersion: EVIDENCE_SNAPSHOT_VERSION,
        kind: "RISK_MATRIX",
        title: full.title,
        periodLabel: full.periodLabel,
        config: full.config,
        submittedAt: submittedAt.toISOString(),
        items: full.items.map((i) => ({
          type: i.type,
          description: i.description,
          probability: i.probability,
          impact: i.impact,
          score: i.score,
          level: i.level,
          actions: i.actions,
          responsible: i.responsible,
        })),
      },
    },
  });

  revalidatePath(`/dashboard/risk/${assessment.id}`);
  revalidatePath(`/dashboard/manuals/${assessment.assignmentId}`);
  return { success: true, assessmentId: assessment.id };
}

/**
 * Duplica una matriz enviada para trabajar el siguiente periodo. Es el camino
 * normal en una revisión anual: se parte de lo que había, no de una hoja en
 * blanco.
 */
export async function duplicateRiskMatrix(input: {
  assessmentId: string;
  periodLabel?: string;
}): Promise<RiskActionResult> {
  const { user, assessment } = await requireRiskAssessmentAccess(input.assessmentId);

  const source = await db.riskAssessment.findUnique({
    where: { id: assessment.id },
    select: {
      title: true,
      config: true,
      requirementId: true,
      assignmentId: true,
      items: { orderBy: { position: "asc" } },
    },
  });
  if (!source) return { success: false, error: "Matriz no encontrada" };

  const copy = await db.riskAssessment.create({
    data: {
      tenantId: assessment.tenantId,
      companyId: assessment.companyId,
      assignmentId: source.assignmentId,
      requirementId: source.requirementId,
      title: source.title,
      periodLabel: optionalText(input.periodLabel, 60),
      config: (source.config ?? DEFAULT_RISK_CONFIG) as object,
      createdById: user.id,
      items: {
        create: source.items.map((i, index) => ({
          type: i.type,
          description: i.description,
          probability: i.probability,
          impact: i.impact,
          score: i.score,
          level: i.level,
          actions: i.actions,
          responsible: i.responsible,
          position: index,
        })),
      },
    },
    select: { id: true },
  });

  return { success: true, assessmentId: copy.id };
}
