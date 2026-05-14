"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  Prisma,
  type EvaluationSectionType,
  type EvaluationQuestionType,
  type EvaluationStatus,
  type EvaluationAnswerValue,
  type EvaluationKind,
  type EvaluationFactor,
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
  kind?: EvaluationKind;
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
      kind: input.kind ?? "DAFO",
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

/**
 * Normalize and validate a MULTI_SELECT options array. Trims, drops empties,
 * limits to 20 options of up to 200 chars each. Returns `null` if the input
 * is invalid (too few/too many or any single option is out of range), so the
 * caller can throw a clear error.
 */
function normalizeMultiSelectOptions(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  if (cleaned.length < 2 || cleaned.length > 20) return null;
  if (cleaned.some((v) => v.length > 200)) return null;
  return cleaned;
}

/** Validate `minSelections`/`maxSelections` against the options length. */
function validateSelectionBounds(
  optionsLength: number,
  min: number | null | undefined,
  max: number | null | undefined,
): void {
  if (min != null && (min < 1 || min > optionsLength)) {
    throw new Error(
      `Selección mínima fuera de rango (1–${optionsLength})`,
    );
  }
  if (max != null && (max < 1 || max > optionsLength)) {
    throw new Error(
      `Selección máxima fuera de rango (1–${optionsLength})`,
    );
  }
  if (min != null && max != null && min > max) {
    throw new Error(
      "Selección mínima no puede ser mayor que la máxima",
    );
  }
}

export async function createQuestion(
  sectionId: string,
  input: {
    code?: string | null;
    label: string;
    description?: string | null;
    type?: EvaluationQuestionType;
    options?: string[] | null;
    minSelections?: number | null;
    maxSelections?: number | null;
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
  if (!label || label.length < 2 || label.length > 500) {
    throw new Error(
      "Etiqueta de pregunta inválida: debe tener entre 2 y 500 caracteres",
    );
  }

  const type = input.type ?? "MULTIPLE_CHOICE";

  // MULTI_SELECT needs a custom list of options. The other types ignore it.
  let options: string[] | null = null;
  let minSelections: number | null = null;
  let maxSelections: number | null = null;
  if (type === "MULTI_SELECT") {
    options = normalizeMultiSelectOptions(input.options);
    if (!options) {
      throw new Error(
        "MULTI_SELECT requiere entre 2 y 20 opciones, cada una de hasta 200 caracteres",
      );
    }
    minSelections = input.minSelections ?? null;
    maxSelections = input.maxSelections ?? null;
    validateSelectionBounds(options.length, minSelections, maxSelections);
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
      type,
      position: (maxPos._max.position ?? -1) + 1,
      ...(options ? { options } : {}),
      ...(minSelections != null ? { minSelections } : {}),
      ...(maxSelections != null ? { maxSelections } : {}),
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
    options?: string[] | null;
    minSelections?: number | null;
    maxSelections?: number | null;
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

  if (input.label !== undefined) {
    const trimmed = input.label.trim();
    if (trimmed.length < 2 || trimmed.length > 500) {
      throw new Error(
        "Etiqueta de pregunta inválida: debe tener entre 2 y 500 caracteres",
      );
    }
  }

  // Resolve the effective type for downstream validation: explicit input
  // wins, otherwise keep the existing one.
  const effectiveType = input.type ?? q.type;

  let optionsToWrite: string[] | null | undefined = undefined;
  let minToWrite: number | null | undefined = undefined;
  let maxToWrite: number | null | undefined = undefined;
  if (effectiveType === "MULTI_SELECT") {
    // If options are being changed, validate them. Otherwise keep what's
    // already in the DB.
    if (input.options !== undefined) {
      const normalized = normalizeMultiSelectOptions(input.options);
      if (!normalized) {
        throw new Error(
          "MULTI_SELECT requiere entre 2 y 20 opciones, cada una de hasta 200 caracteres",
        );
      }
      optionsToWrite = normalized;
    }
    // For bounds we accept null to mean "clear", a number to set, or
    // undefined to leave untouched.
    if (input.minSelections !== undefined) minToWrite = input.minSelections;
    if (input.maxSelections !== undefined) maxToWrite = input.maxSelections;

    // Validate bounds against the resulting options length (new or existing).
    const existing = Array.isArray(q.options)
      ? (q.options as unknown[]).filter(
          (o): o is string => typeof o === "string",
        )
      : [];
    const resolvedOptions = optionsToWrite ?? existing;
    const resolvedMin =
      minToWrite !== undefined ? minToWrite : q.minSelections;
    const resolvedMax =
      maxToWrite !== undefined ? maxToWrite : q.maxSelections;
    if (resolvedOptions.length >= 2) {
      validateSelectionBounds(
        resolvedOptions.length,
        resolvedMin,
        resolvedMax,
      );
    }
  } else if (input.type !== undefined && input.type !== "MULTI_SELECT") {
    // Switching AWAY from MULTI_SELECT: clear the related fields so the
    // shape stays consistent with the new type.
    optionsToWrite = null;
    minToWrite = null;
    maxToWrite = null;
  }

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
      ...(optionsToWrite !== undefined
        ? { options: optionsToWrite ?? Prisma.JsonNull }
        : {}),
      ...(minToWrite !== undefined ? { minSelections: minToWrite } : {}),
      ...(maxToWrite !== undefined ? { maxSelections: maxToWrite } : {}),
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
  answers: {
    questionId: string;
    value?: EvaluationAnswerValue;
    text?: string;
    factors?: EvaluationFactor[];
    selectedOptionIndexes?: number[];
  }[],
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
                include: {
                  questions: {
                    select: {
                      id: true,
                      type: true,
                      options: true,
                      minSelections: true,
                      maxSelections: true,
                    },
                  },
                },
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
  const evaluationKind = participant.assignment.evaluation.kind;
  const questions = participant.assignment.evaluation.sections.flatMap(
    (s) => s.questions,
  );
  const questionsById = new Map(questions.map((q) => [q.id, q] as const));
  const allQuestionIds = questions.map((q) => q.id);
  const provided = new Map<
    string,
    {
      value?: EvaluationAnswerValue;
      text?: string;
      factors?: EvaluationFactor[];
      selectedOptionIndexes?: number[];
    }
  >();
  for (const a of answers)
    provided.set(a.questionId, {
      value: a.value,
      text: a.text,
      factors: a.factors,
      selectedOptionIndexes: a.selectedOptionIndexes,
    });

  const missing: string[] = [];
  for (const id of allQuestionIds) {
    const ans = provided.get(id);
    const q = questionsById.get(id);
    if (!ans || !q) {
      missing.push(id);
      continue;
    }
    if (q.type === "MULTIPLE_CHOICE") {
      if (!ans.value) missing.push(id);
      // PARTIAL sólo es válido para evaluaciones DIAGNOSTIC; el resto usan
      // POSITIVE/NEGATIVE/NOT_APPLICABLE.
      else if (ans.value === "PARTIAL" && evaluationKind !== "DIAGNOSTIC") {
        throw new Error("Opción 'Parcialmente' no aplica a este tipo de evaluación");
      }
    } else if (q.type === "OPEN_TEXT") {
      if (!ans.text || ans.text.trim().length === 0) missing.push(id);
    } else if (q.type === "MULTI_FACTOR") {
      if (!ans.factors || ans.factors.length === 0) missing.push(id);
    } else if (q.type === "MULTI_SELECT") {
      const optionsLen = Array.isArray(q.options)
        ? (q.options as unknown[]).filter((o) => typeof o === "string").length
        : 0;
      const selected = ans.selectedOptionIndexes ?? [];
      // Each index in range, unique, count within min/max bounds.
      const valid =
        selected.length > 0 &&
        selected.every(
          (idx) =>
            Number.isInteger(idx) &&
            idx >= 0 &&
            idx < optionsLen,
        ) &&
        new Set(selected).size === selected.length;
      if (!valid) {
        missing.push(id);
        continue;
      }
      if (q.minSelections != null && selected.length < q.minSelections) {
        throw new Error(
          `Debes seleccionar al menos ${q.minSelections} opción(es)`,
        );
      }
      if (q.maxSelections != null && selected.length > q.maxSelections) {
        throw new Error(
          `No puedes seleccionar más de ${q.maxSelections} opción(es)`,
        );
      }
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
          factors: ans.factors ?? [],
          selectedOptionIndexes: ans.selectedOptionIndexes ?? [],
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
