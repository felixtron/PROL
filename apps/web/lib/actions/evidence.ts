"use server";

import { revalidatePath } from "next/cache";
import { db, type EvidenceStatus } from "@prol/db";
import {
  requireAssignmentMemberAccess,
  requireCompanyEvidencePanelAccess,
  requireEvidenceReviewAccess,
  requireManualAdmin,
} from "@/lib/manual-access";
import {
  completeActivityAndScheduleNext,
  loadEvidenceContext,
  notifyDeletionRequested,
  notifyEvidenceReviewed,
  notifyEvidenceSubmitted,
} from "@/lib/compliance-dispatch";
import { canSubmitEvidence } from "@/lib/compliance";

export type EvidenceActionResult =
  | { success: true }
  | { success: false; error: string };

function optionalText(value: unknown, max = 2000): string | null {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

/**
 * Reabre la actividad cuya evidencia aprobada se dio de baja, y cancela el
 * ciclo siguiente si la aprobación lo había programado.
 *
 * Sin esa cancelación quedarían dos actividades abiertas para el mismo
 * requisito, y las vistas muestran sólo la de mayor número de ciclo: la que
 * acabamos de reabrir se volvería invisible justo cuando vuelve a hacer falta.
 * El ciclo siguiente sólo se cancela si nadie ha entregado nada en él todavía.
 */
async function reopenActivityAfterDeletion(activityId: string): Promise<void> {
  const activity = await db.complianceActivity.findUnique({
    where: { id: activityId },
    select: { assignmentId: true, requirementId: true, periodNumber: true },
  });
  if (!activity) return;

  await db.complianceActivity.update({
    where: { id: activityId },
    data: { status: "OPEN", completedAt: null },
  });

  await db.complianceActivity.deleteMany({
    where: {
      assignmentId: activity.assignmentId,
      requirementId: activity.requirementId,
      periodNumber: activity.periodNumber + 1,
      status: "OPEN",
      evidences: { none: {} },
    },
  });
}

function revalidateEvidence(input: {
  evidenceId?: string;
  assignmentId: string;
  sectionId?: string;
}) {
  revalidatePath("/tenant-admin/evidence");
  revalidatePath("/professor/evidence");
  if (input.evidenceId) {
    revalidatePath(`/tenant-admin/evidence/${input.evidenceId}`);
    revalidatePath(`/professor/evidence/${input.evidenceId}`);
  }
  revalidatePath(`/dashboard/manuals/${input.assignmentId}`);
  if (input.sectionId) {
    revalidatePath(`/dashboard/manuals/${input.assignmentId}/sections/${input.sectionId}`);
  }
  revalidatePath("/dashboard/company/evidence");
  revalidatePath("/dashboard/agenda");
}

// ─── Entrega ──────────────────────────────────────────────────────────────────

/**
 * Entrega una evidencia contra una actividad abierta.
 *
 * La versión se calcula dentro de una transacción con la fila de la actividad
 * bloqueada: dos personas de la misma empresa subiendo a la vez llegarían al
 * mismo número de versión y una perdería su entrega contra el índice único.
 */
export async function submitEvidence(input: {
  activityId: string;
  title?: string;
  notes?: string;
  file?: { fileKey: string; fileName: string; fileSize: number; mimeType: string };
  riskAssessmentId?: string;
  evaluationSubmissionId?: string;
}): Promise<EvidenceActionResult & { evidenceId?: string }> {
  const activity = await db.complianceActivity.findUnique({
    where: { id: input.activityId },
    select: {
      id: true,
      status: true,
      assignmentId: true,
      requirement: {
        select: { kind: true, name: true, sectionId: true },
      },
    },
  });
  if (!activity) return { success: false, error: "Actividad no encontrada" };

  const { user, assignment } = await requireAssignmentMemberAccess(
    activity.assignmentId,
  );
  if (assignment.status !== "ACTIVE") {
    return { success: false, error: "El manual de tu empresa no está activo" };
  }
  if (activity.status !== "OPEN") {
    return { success: false, error: "Esta actividad ya no admite entregas" };
  }

  const kind = activity.requirement.kind;
  if (kind === "FILE" && !input.file) {
    return { success: false, error: "Adjunta el archivo de la evidencia" };
  }
  if (kind === "RISK_MATRIX" && !input.riskAssessmentId) {
    return { success: false, error: "Falta la matriz que sustenta la evidencia" };
  }
  if (kind === "EVALUATION_LINK" && !input.evaluationSubmissionId) {
    return { success: false, error: "Elige la entrega de evaluación a asociar" };
  }

  const latest = await db.evidence.findFirst({
    where: { activityId: activity.id, deletedAt: null },
    orderBy: { version: "desc" },
    select: { status: true },
  });
  if (!canSubmitEvidence(latest?.status)) {
    return {
      success: false,
      error:
        latest?.status === "APPROVED"
          ? "Esta actividad ya tiene una evidencia aprobada"
          : "Ya hay una evidencia en revisión para esta actividad",
    };
  }

  const evidence = await db.$transaction(async (tx) => {
    // Serializa a los miembros de la misma empresa que entreguen a la vez.
    await tx.$queryRaw`SELECT 1 FROM compliance_activities WHERE id = ${activity.id} FOR UPDATE`;
    const last = await tx.evidence.findFirst({
      where: { activityId: activity.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return tx.evidence.create({
      data: {
        activityId: activity.id,
        assignmentId: activity.assignmentId,
        version: (last?.version ?? 0) + 1,
        kind,
        status: "PENDING",
        title: optionalText(input.title, 200),
        notes: optionalText(input.notes),
        fileKey: input.file?.fileKey ?? null,
        fileName: input.file?.fileName ?? null,
        fileSize: input.file?.fileSize ?? null,
        mimeType: input.file?.mimeType ?? null,
        riskAssessmentId: input.riskAssessmentId ?? null,
        evaluationSubmissionId: input.evaluationSubmissionId ?? null,
        uploadedById: user.id,
        reviews: {
          create: { reviewerId: user.id, action: "SUBMIT", toStatus: "PENDING" },
        },
      },
      select: { id: true },
    });
  });

  // Aviso fuera de la transacción: un fallo de correo no puede deshacer una
  // entrega que el usuario ya dio por hecha.
  const ctx = await loadEvidenceContext(evidence.id);
  if (ctx) {
    await notifyEvidenceSubmitted(ctx, user.name ?? user.email);
  }

  revalidateEvidence({
    evidenceId: evidence.id,
    assignmentId: activity.assignmentId,
    sectionId: activity.requirement.sectionId,
  });
  return { success: true, evidenceId: evidence.id };
}

// ─── Revisión ─────────────────────────────────────────────────────────────────

/** Toma la evidencia para revisión (Pendiente → En revisión). */
export async function startEvidenceReview(
  evidenceId: string,
): Promise<EvidenceActionResult> {
  const { user, evidence } = await requireEvidenceReviewAccess(evidenceId);
  if (evidence.deletedAt) return { success: false, error: "Evidencia eliminada" };
  if (evidence.status !== "PENDING") {
    return { success: false, error: "Esta evidencia ya está en revisión" };
  }

  await db.$transaction([
    db.evidence.update({
      where: { id: evidence.id },
      data: { status: "IN_REVIEW", reviewedById: user.id, reviewedAt: new Date() },
    }),
    db.evidenceReview.create({
      data: {
        evidenceId: evidence.id,
        reviewerId: user.id,
        action: "START_REVIEW",
        fromStatus: evidence.status as EvidenceStatus,
        toStatus: "IN_REVIEW",
      },
    }),
  ]);

  revalidateEvidence({ evidenceId: evidence.id, assignmentId: evidence.assignmentId });
  return { success: true };
}

/**
 * Aprueba la evidencia, cierra su actividad y programa el siguiente ciclo si
 * el requisito es periódico.
 */
export async function approveEvidence(input: {
  evidenceId: string;
  comment?: string;
}): Promise<EvidenceActionResult> {
  const { user, evidence } = await requireEvidenceReviewAccess(input.evidenceId);
  if (evidence.deletedAt) return { success: false, error: "Evidencia eliminada" };
  if (evidence.status === "APPROVED") {
    return { success: false, error: "Esta evidencia ya está aprobada" };
  }

  const approvedAt = new Date();
  await db.$transaction([
    db.evidence.update({
      where: { id: evidence.id },
      data: {
        status: "APPROVED",
        reviewedById: user.id,
        reviewedAt: approvedAt,
        approvedAt,
      },
    }),
    db.evidenceReview.create({
      data: {
        evidenceId: evidence.id,
        reviewerId: user.id,
        action: "APPROVE",
        comment: optionalText(input.comment),
        fromStatus: evidence.status as EvidenceStatus,
        toStatus: "APPROVED",
      },
    }),
  ]);

  const { nextDueAt } = await completeActivityAndScheduleNext(
    evidence.activityId,
    approvedAt,
  );

  const ctx = await loadEvidenceContext(evidence.id);
  if (ctx) {
    const uploader = await db.evidence.findUnique({
      where: { id: evidence.id },
      select: { uploadedById: true },
    });
    await notifyEvidenceReviewed(ctx, {
      approved: true,
      comment: optionalText(input.comment),
      reviewerName: user.name ?? user.email,
      uploadedById: uploader?.uploadedById,
      nextDueAt,
    });
    revalidateEvidence({
      evidenceId: evidence.id,
      assignmentId: evidence.assignmentId,
      sectionId: ctx.sectionId,
    });
  } else {
    revalidateEvidence({ evidenceId: evidence.id, assignmentId: evidence.assignmentId });
  }
  revalidatePath("/tenant-admin/agenda");
  return { success: true };
}

/** Devuelve la evidencia al cliente pidiendo una corrección. */
export async function requestEvidenceCorrection(input: {
  evidenceId: string;
  comment: string;
}): Promise<EvidenceActionResult> {
  const comment = optionalText(input.comment);
  // El comentario es obligatorio a propósito: "requiere corrección" sin decir
  // qué corregir deja al cliente adivinando y alarga el ciclo de revisión.
  if (!comment) {
    return { success: false, error: "Explica qué debe corregirse" };
  }

  const { user, evidence } = await requireEvidenceReviewAccess(input.evidenceId);
  if (evidence.deletedAt) return { success: false, error: "Evidencia eliminada" };
  if (evidence.status === "APPROVED") {
    return { success: false, error: "Esta evidencia ya está aprobada" };
  }

  await db.$transaction([
    db.evidence.update({
      where: { id: evidence.id },
      data: {
        status: "NEEDS_CORRECTION",
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    }),
    db.evidenceReview.create({
      data: {
        evidenceId: evidence.id,
        reviewerId: user.id,
        action: "REQUEST_CORRECTION",
        comment,
        fromStatus: evidence.status as EvidenceStatus,
        toStatus: "NEEDS_CORRECTION",
      },
    }),
  ]);

  const ctx = await loadEvidenceContext(evidence.id);
  if (ctx) {
    const uploader = await db.evidence.findUnique({
      where: { id: evidence.id },
      select: { uploadedById: true },
    });
    await notifyEvidenceReviewed(ctx, {
      approved: false,
      comment,
      reviewerName: user.name ?? user.email,
      uploadedById: uploader?.uploadedById,
    });
    revalidateEvidence({
      evidenceId: evidence.id,
      assignmentId: evidence.assignmentId,
      sectionId: ctx.sectionId,
    });
  } else {
    revalidateEvidence({ evidenceId: evidence.id, assignmentId: evidence.assignmentId });
  }
  return { success: true };
}

/** Comentario del revisor que no cambia el estado. */
export async function commentEvidence(input: {
  evidenceId: string;
  comment: string;
}): Promise<EvidenceActionResult> {
  const comment = optionalText(input.comment);
  if (!comment) return { success: false, error: "Escribe un comentario" };

  const { user, evidence } = await requireEvidenceReviewAccess(input.evidenceId);
  await db.evidenceReview.create({
    data: {
      evidenceId: evidence.id,
      reviewerId: user.id,
      action: "COMMENT",
      comment,
    },
  });
  revalidateEvidence({ evidenceId: evidence.id, assignmentId: evidence.assignmentId });
  return { success: true };
}

// ─── Eliminación ──────────────────────────────────────────────────────────────

/**
 * Solicita dar de baja una evidencia. La pide el líder de la empresa (o el
 * personal del tenant); nunca la ejecuta quien la pide.
 */
export async function requestEvidenceDeletion(input: {
  evidenceId: string;
  reason: string;
}): Promise<EvidenceActionResult> {
  const reason = optionalText(input.reason);
  if (!reason) return { success: false, error: "Indica el motivo de la baja" };

  const evidence = await db.evidence.findUnique({
    where: { id: input.evidenceId },
    select: {
      id: true,
      assignmentId: true,
      deletedAt: true,
      deletionRequestedAt: true,
      assignment: { select: { companyId: true, tenantId: true } },
    },
  });
  if (!evidence) return { success: false, error: "Evidencia no encontrada" };
  if (evidence.deletedAt) return { success: false, error: "Evidencia ya eliminada" };
  if (evidence.deletionRequestedAt) {
    return { success: false, error: "Ya hay una solicitud pendiente para esta evidencia" };
  }

  // Dos puertas válidas: el líder de la empresa dueña, o el personal del
  // tenant desde su cola de revisión.
  let requesterId: string;
  let requesterName: string;
  try {
    const { user, company } = await requireCompanyEvidencePanelAccess();
    if (company.id !== evidence.assignment.companyId) {
      return { success: false, error: "Esta evidencia es de otra empresa" };
    }
    requesterId = user.id;
    requesterName = user.name ?? user.email;
  } catch {
    const { user } = await requireEvidenceReviewAccess(evidence.id);
    requesterId = user.id;
    requesterName = user.name ?? user.email;
  }

  await db.$transaction([
    db.evidence.update({
      where: { id: evidence.id },
      data: {
        deletionRequestedAt: new Date(),
        deletionRequestedById: requesterId,
      },
    }),
    db.evidenceReview.create({
      data: {
        evidenceId: evidence.id,
        reviewerId: requesterId,
        action: "REQUEST_DELETION",
        comment: reason,
      },
    }),
  ]);

  const ctx = await loadEvidenceContext(evidence.id);
  if (ctx) await notifyDeletionRequested(ctx, { requestedByName: requesterName, reason });

  revalidateEvidence({ evidenceId: evidence.id, assignmentId: evidence.assignmentId });
  return { success: true };
}

/**
 * Resuelve una solicitud de baja. Sólo el administrador, y la baja es lógica:
 * la fila y su bitácora se conservan para que el expediente siga siendo
 * reconstruible.
 */
export async function resolveEvidenceDeletion(input: {
  evidenceId: string;
  approve: boolean;
  comment?: string;
}): Promise<EvidenceActionResult> {
  const user = await requireManualAdmin();
  const evidence = await db.evidence.findUnique({
    where: { id: input.evidenceId },
    select: {
      id: true,
      status: true,
      activityId: true,
      assignmentId: true,
      deletedAt: true,
      deletionRequestedAt: true,
      assignment: { select: { tenantId: true } },
    },
  });
  if (!evidence) return { success: false, error: "Evidencia no encontrada" };
  if (evidence.deletedAt) return { success: false, error: "Evidencia ya eliminada" };
  if (!evidence.deletionRequestedAt) {
    return { success: false, error: "No hay ninguna solicitud pendiente" };
  }
  if (user.role !== "SUPER_ADMIN" && user.tenantId !== evidence.assignment.tenantId) {
    return { success: false, error: "No autorizado: tenant no coincide" };
  }

  if (input.approve) {
    await db.$transaction([
      db.evidence.update({
        where: { id: evidence.id },
        data: { deletedAt: new Date(), deletedById: user.id },
      }),
      db.evidenceReview.create({
        data: {
          evidenceId: evidence.id,
          reviewerId: user.id,
          action: "APPROVE_DELETION",
          comment: optionalText(input.comment),
        },
      }),
    ]);

    // Si la evidencia dada de baja era la aprobada, la actividad vuelve a
    // quedar abierta: el requisito sigue sin cumplirse.
    if (evidence.status === "APPROVED") {
      await reopenActivityAfterDeletion(evidence.activityId);
    }
  } else {
    await db.$transaction([
      db.evidence.update({
        where: { id: evidence.id },
        data: { deletionRequestedAt: null, deletionRequestedById: null },
      }),
      db.evidenceReview.create({
        data: {
          evidenceId: evidence.id,
          reviewerId: user.id,
          action: "REJECT_DELETION",
          comment: optionalText(input.comment),
        },
      }),
    ]);
  }

  revalidateEvidence({ evidenceId: evidence.id, assignmentId: evidence.assignmentId });
  revalidatePath("/tenant-admin/agenda");
  return { success: true };
}
