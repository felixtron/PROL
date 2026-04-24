"use server";

import { revalidatePath } from "next/cache";
import { db, type EvaluationSectionType, type EvaluationStatus } from "@prol/db";
import {
  requireUser,
  requireEvaluationAuthor,
  assertSameTenant,
} from "@/lib/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadEvaluationOrThrow(id: string) {
  const ev = await db.evaluation.findUnique({ where: { id } });
  if (!ev) throw new Error("Evaluación no encontrada");
  return ev;
}

// ─── Template CRUD (PROFESSOR / ADMIN / SUPER_ADMIN) ─────────────────────────

export async function createEvaluation(input: {
  title: string;
  description?: string | null;
  methodology?: string | null;
}) {
  const user = await requireEvaluationAuthor();
  const title = input.title?.trim();
  if (!title || title.length < 3 || title.length > 120) {
    throw new Error("Título requerido (3–120 caracteres)");
  }
  if (!user.tenantId) {
    throw new Error("El SUPER_ADMIN debe especificar tenantId");
  }

  const ev = await db.evaluation.create({
    data: {
      tenantId: user.tenantId,
      createdById: user.id,
      title,
      description: input.description?.trim() || null,
      methodology: input.methodology?.trim() || null,
    },
  });

  revalidatePath("/professor/evaluations");
  return { success: true, evaluationId: ev.id };
}

export async function updateEvaluation(
  evaluationId: string,
  input: {
    title?: string;
    description?: string | null;
    methodology?: string | null;
    status?: EvaluationStatus;
  },
) {
  const user = await requireEvaluationAuthor();
  const ev = await loadEvaluationOrThrow(evaluationId);
  assertSameTenant(user, ev.tenantId);

  await db.evaluation.update({
    where: { id: evaluationId },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.methodology !== undefined
        ? { methodology: input.methodology?.trim() || null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });

  revalidatePath("/professor/evaluations");
  revalidatePath(`/professor/evaluations/${evaluationId}`);
  return { success: true };
}

export async function deleteEvaluation(evaluationId: string) {
  const user = await requireEvaluationAuthor();
  const ev = await loadEvaluationOrThrow(evaluationId);
  assertSameTenant(user, ev.tenantId);

  await db.evaluation.delete({ where: { id: evaluationId } });
  revalidatePath("/professor/evaluations");
  return { success: true };
}

// ─── Sections ────────────────────────────────────────────────────────────────

export async function createSection(
  evaluationId: string,
  input: { title: string; type: EvaluationSectionType },
) {
  const user = await requireEvaluationAuthor();
  const ev = await loadEvaluationOrThrow(evaluationId);
  assertSameTenant(user, ev.tenantId);

  const title = input.title?.trim();
  if (!title || title.length < 2 || title.length > 120) {
    throw new Error("Título de sección inválido");
  }

  const maxPos = await db.evaluationSection.aggregate({
    where: { evaluationId },
    _max: { position: true },
  });
  await db.evaluationSection.create({
    data: {
      evaluationId,
      title,
      type: input.type,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  revalidatePath(`/professor/evaluations/${evaluationId}`);
  return { success: true };
}

export async function updateSection(
  sectionId: string,
  input: { title?: string; type?: EvaluationSectionType },
) {
  const user = await requireEvaluationAuthor();
  const section = await db.evaluationSection.findUnique({
    where: { id: sectionId },
    include: { evaluation: true },
  });
  if (!section) throw new Error("Sección no encontrada");
  assertSameTenant(user, section.evaluation.tenantId);

  await db.evaluationSection.update({
    where: { id: sectionId },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
    },
  });
  revalidatePath(`/professor/evaluations/${section.evaluationId}`);
  return { success: true };
}

export async function deleteSection(sectionId: string) {
  const user = await requireEvaluationAuthor();
  const section = await db.evaluationSection.findUnique({
    where: { id: sectionId },
    include: { evaluation: true },
  });
  if (!section) throw new Error("Sección no encontrada");
  assertSameTenant(user, section.evaluation.tenantId);

  await db.evaluationSection.delete({ where: { id: sectionId } });
  revalidatePath(`/professor/evaluations/${section.evaluationId}`);
  return { success: true };
}

// ─── Questions ───────────────────────────────────────────────────────────────

export async function createQuestion(
  sectionId: string,
  input: { code?: string | null; label: string; description?: string | null },
) {
  const user = await requireEvaluationAuthor();
  const section = await db.evaluationSection.findUnique({
    where: { id: sectionId },
    include: { evaluation: true },
  });
  if (!section) throw new Error("Sección no encontrada");
  assertSameTenant(user, section.evaluation.tenantId);

  const label = input.label?.trim();
  if (!label || label.length < 2 || label.length > 200) {
    throw new Error("Etiqueta de pregunta inválida");
  }

  const maxPos = await db.evaluationQuestion.aggregate({
    where: { sectionId },
    _max: { position: true },
  });
  await db.evaluationQuestion.create({
    data: {
      sectionId,
      label,
      code: input.code?.trim() || null,
      description: input.description?.trim() || null,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  revalidatePath(`/professor/evaluations/${section.evaluationId}`);
  return { success: true };
}

export async function updateQuestion(
  questionId: string,
  input: { code?: string | null; label?: string; description?: string | null },
) {
  const user = await requireEvaluationAuthor();
  const q = await db.evaluationQuestion.findUnique({
    where: { id: questionId },
    include: { section: { include: { evaluation: true } } },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  assertSameTenant(user, q.section.evaluation.tenantId);

  await db.evaluationQuestion.update({
    where: { id: questionId },
    data: {
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.code !== undefined
        ? { code: input.code?.trim() || null }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
    },
  });
  revalidatePath(`/professor/evaluations/${q.section.evaluationId}`);
  return { success: true };
}

export async function deleteQuestion(questionId: string) {
  const user = await requireEvaluationAuthor();
  const q = await db.evaluationQuestion.findUnique({
    where: { id: questionId },
    include: { section: { include: { evaluation: true } } },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  assertSameTenant(user, q.section.evaluation.tenantId);

  await db.evaluationQuestion.delete({ where: { id: questionId } });
  revalidatePath(`/professor/evaluations/${q.section.evaluationId}`);
  return { success: true };
}

// ─── Assignment to companies ─────────────────────────────────────────────────

/**
 * Assign an evaluation template to a company. Automatically seeds the
 * assignment's participants with the company's leader(s). The leader(s)
 * can then add other members via addEvaluationParticipant.
 *
 * Reassigning an existing (evaluation, company) pair is a no-op that
 * returns the existing assignment.
 */
export async function assignEvaluationToCompany(
  evaluationId: string,
  companyId: string,
) {
  const user = await requireEvaluationAuthor();

  const [ev, company] = await Promise.all([
    loadEvaluationOrThrow(evaluationId),
    db.company.findUnique({ where: { id: companyId } }),
  ]);
  if (!company) throw new Error("Empresa no encontrada");
  assertSameTenant(user, ev.tenantId);
  assertSameTenant(user, company.tenantId);
  if (company.tenantId !== ev.tenantId) {
    throw new Error("La empresa y la evaluación son de tenants distintos");
  }
  if (ev.status !== "PUBLISHED") {
    throw new Error("Solo se pueden asignar evaluaciones publicadas");
  }

  const existing = await db.evaluationAssignment.findUnique({
    where: { evaluationId_companyId: { evaluationId, companyId } },
  });
  if (existing) {
    return { success: true, assignmentId: existing.id };
  }

  const assignment = await db.evaluationAssignment.create({
    data: {
      evaluationId,
      companyId,
      assignedById: user.id,
    },
  });

  // Seed participants with the company's leader (if any).
  if (company.leaderId) {
    await db.evaluationParticipant.create({
      data: {
        assignmentId: assignment.id,
        userId: company.leaderId,
        addedById: user.id,
      },
    });
  }

  revalidatePath(`/professor/evaluations/${evaluationId}`);
  revalidatePath(`/tenant-admin/companies/${companyId}`);
  revalidatePath("/dashboard/company");
  return { success: true, assignmentId: assignment.id };
}

export async function unassignEvaluationFromCompany(
  evaluationId: string,
  companyId: string,
) {
  const user = await requireEvaluationAuthor();
  const assignment = await db.evaluationAssignment.findUnique({
    where: { evaluationId_companyId: { evaluationId, companyId } },
    include: { evaluation: true },
  });
  if (!assignment) throw new Error("Asignación no encontrada");
  assertSameTenant(user, assignment.evaluation.tenantId);

  await db.evaluationAssignment.delete({ where: { id: assignment.id } });

  revalidatePath(`/professor/evaluations/${evaluationId}`);
  revalidatePath(`/tenant-admin/companies/${companyId}`);
  revalidatePath("/dashboard/company");
  return { success: true };
}

// ─── Participants (leader manages) ───────────────────────────────────────────

/**
 * Add a company member as a participant for an assignment. Callable by the
 * company leader (for their own company), or by a tenant admin / super admin.
 */
export async function addEvaluationParticipant(
  assignmentId: string,
  userId: string,
) {
  const caller = await requireUser();

  const assignment = await db.evaluationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      evaluation: { select: { tenantId: true } },
      company: { select: { id: true, tenantId: true, leaderId: true } },
    },
  });
  if (!assignment) throw new Error("Asignación no encontrada");

  const isSuperAdmin = caller.role === "SUPER_ADMIN";
  const isTenantAdmin =
    caller.role === "ADMIN" && caller.tenantId === assignment.company.tenantId;
  const isLeader =
    assignment.company.leaderId === caller.id &&
    caller.tenantId === assignment.company.tenantId;
  if (!isSuperAdmin && !isTenantAdmin && !isLeader) {
    throw new Error("No autorizado");
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Usuario no encontrado");
  if (target.companyId !== assignment.company.id) {
    throw new Error("El usuario no pertenece a esta empresa");
  }

  await db.evaluationParticipant.upsert({
    where: { assignmentId_userId: { assignmentId, userId } },
    create: { assignmentId, userId, addedById: caller.id },
    update: {}, // already exists — nothing to do
  });

  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeEvaluationParticipant(
  assignmentId: string,
  userId: string,
) {
  const caller = await requireUser();

  const assignment = await db.evaluationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      company: { select: { id: true, tenantId: true, leaderId: true } },
    },
  });
  if (!assignment) throw new Error("Asignación no encontrada");

  const isSuperAdmin = caller.role === "SUPER_ADMIN";
  const isTenantAdmin =
    caller.role === "ADMIN" && caller.tenantId === assignment.company.tenantId;
  const isLeader =
    assignment.company.leaderId === caller.id &&
    caller.tenantId === assignment.company.tenantId;
  if (!isSuperAdmin && !isTenantAdmin && !isLeader) {
    throw new Error("No autorizado");
  }
  // Don't allow removing the leader — they are a mandatory participant.
  if (userId === assignment.company.leaderId) {
    throw new Error("El líder no puede ser removido de la evaluación");
  }

  await db.evaluationParticipant.deleteMany({
    where: { assignmentId, userId },
  });

  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard");
  return { success: true };
}
