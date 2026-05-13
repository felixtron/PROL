"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  type EvaluationSectionType,
  type EvaluationQuestionType,
  type EvaluationStatus,
  type EvaluationAnswerValue,
} from "@prol/db";
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

/**
 * Refuses the call if the tenant has the evaluations feature flag disabled.
 * SUPER_ADMIN bypasses (they may need to author across tenants). For other
 * roles we look up the tenant and reject with a clear error so a malicious
 * client invoking the action directly can't bypass the UI gating.
 */
async function assertEvaluationsEnabled(tenantId: string, userRole: string) {
  if (userRole === "SUPER_ADMIN") return;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { evaluationsEnabled: true },
  });
  if (!tenant?.evaluationsEnabled) {
    throw new Error("Evaluaciones no están habilitadas para este tenant");
  }
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
  await assertEvaluationsEnabled(user.tenantId, user.role);

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
  await assertEvaluationsEnabled(ev.tenantId, user.role);

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
  await assertEvaluationsEnabled(ev.tenantId, user.role);

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
  await assertEvaluationsEnabled(ev.tenantId, user.role);

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
  await assertEvaluationsEnabled(section.evaluation.tenantId, user.role);

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
  await assertEvaluationsEnabled(section.evaluation.tenantId, user.role);

  await db.evaluationSection.delete({ where: { id: sectionId } });
  revalidatePath(`/professor/evaluations/${section.evaluationId}`);
  return { success: true };
}

// ─── Questions ───────────────────────────────────────────────────────────────

export async function createQuestion(
  sectionId: string,
  input: {
    code?: string | null;
    label: string;
    description?: string | null;
    type?: EvaluationQuestionType;
  },
) {
  const user = await requireEvaluationAuthor();
  const section = await db.evaluationSection.findUnique({
    where: { id: sectionId },
    include: { evaluation: true },
  });
  if (!section) throw new Error("Sección no encontrada");
  assertSameTenant(user, section.evaluation.tenantId);
  await assertEvaluationsEnabled(section.evaluation.tenantId, user.role);

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
      type: input.type ?? "MULTIPLE_CHOICE",
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  revalidatePath(`/professor/evaluations/${section.evaluationId}`);
  return { success: true };
}

export async function updateQuestion(
  questionId: string,
  input: {
    code?: string | null;
    label?: string;
    description?: string | null;
    type?: EvaluationQuestionType;
  },
) {
  const user = await requireEvaluationAuthor();
  const q = await db.evaluationQuestion.findUnique({
    where: { id: questionId },
    include: { section: { include: { evaluation: true } } },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  assertSameTenant(user, q.section.evaluation.tenantId);
  await assertEvaluationsEnabled(q.section.evaluation.tenantId, user.role);

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
      ...(input.type !== undefined ? { type: input.type } : {}),
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
  await assertEvaluationsEnabled(q.section.evaluation.tenantId, user.role);

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
  await assertEvaluationsEnabled(assignment.evaluation.tenantId, user.role);

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
  await assertEvaluationsEnabled(assignment.company.tenantId, caller.role);

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
  await assertEvaluationsEnabled(assignment.company.tenantId, caller.role);
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

// ─── Submission (participant) ────────────────────────────────────────────────

/**
 * Submit (or re-submit) the participant's answers for one assignment.
 * Each call creates a new EvaluationSubmission with an incrementing
 * version. The latest version is what counts for consolidated reports.
 *
 * The caller must be the EvaluationParticipant.user themselves.
 *
 * Answers must cover every question of the evaluation. Extra answers
 * (questions that don't belong) are rejected.
 */
export async function submitEvaluationAnswers(
  participantId: string,
  answers: { questionId: string; value?: EvaluationAnswerValue; text?: string }[],
) {
  const caller = await requireUser();

  const participant = await db.evaluationParticipant.findUnique({
    where: { id: participantId },
    include: {
      assignment: {
        include: {
          evaluation: {
            include: {
              sections: {
                include: { questions: { select: { id: true, type: true } } },
              },
            },
          },
          company: { select: { id: true, tenantId: true } },
        },
      },
    },
  });
  if (!participant) throw new Error("Participación no encontrada");
  if (participant.userId !== caller.id) {
    throw new Error("No autorizado");
  }
  await assertEvaluationsEnabled(
    participant.assignment.company.tenantId,
    caller.role,
  );

  // Validate answers cover exactly the evaluation's questions, with the
  // right shape per question type.
  const questions = participant.assignment.evaluation.sections.flatMap(
    (s) => s.questions,
  );
  const questionType = new Map(questions.map((q) => [q.id, q.type] as const));
  const allQuestionIds = questions.map((q) => q.id);
  const provided = new Map<string, { value?: EvaluationAnswerValue; text?: string }>();
  for (const a of answers) provided.set(a.questionId, { value: a.value, text: a.text });

  const missing: string[] = [];
  for (const id of allQuestionIds) {
    const ans = provided.get(id);
    const type = questionType.get(id);
    if (!ans) {
      missing.push(id);
      continue;
    }
    if (type === "MULTIPLE_CHOICE") {
      if (!ans.value) missing.push(id);
    } else if (type === "OPEN_TEXT") {
      if (!ans.text || ans.text.trim().length === 0) missing.push(id);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Faltan ${missing.length} respuesta(s) por contestar`);
  }
  const extra = [...provided.keys()].filter(
    (id) => !allQuestionIds.includes(id),
  );
  if (extra.length > 0) {
    throw new Error("Respuestas inválidas");
  }

  // Determine next version number inside a serialized transaction. The
  // previous implementation read the max version OUTSIDE the tx and used
  // it to compute `nextVersion`, which broke under concurrent submits
  // for the same participant: both reads saw the same `last.version`,
  // both wrote `version = N+1`, and the loser hit the unique constraint
  // `@@unique([participantId, version])`. Now: lock the participant row
  // first, read inside the tx, write inside the same tx. Same pattern as
  // workshops (3515727) and enrollment progress (b155c31).
  const nextVersion = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM evaluation_participants WHERE id = ${participantId} FOR UPDATE`;

    const last = await tx.evaluationSubmission.findFirst({
      where: { participantId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;

    const submission = await tx.evaluationSubmission.create({
      data: {
        participantId,
        submittedById: caller.id,
        version,
      },
    });
    await tx.evaluationAnswer.createMany({
      data: allQuestionIds.map((qId) => {
        const ans = provided.get(qId)!;
        return {
          submissionId: submission.id,
          questionId: qId,
          value: ans.value ?? null,
          text: ans.text?.trim() || null,
        };
      }),
    });

    return version;
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath(`/dashboard/evaluations/${participantId}`);
  return { success: true, version: nextVersion };
}
