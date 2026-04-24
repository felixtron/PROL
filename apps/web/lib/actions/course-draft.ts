"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  consumeCredits,
  refundCredits,
  getCreditsBalance,
  InsufficientCreditsError,
} from "@prol/db";
import {
  generateRefinement,
  generateOutlineV2,
  regenerateLesson,
  regenerateModule,
  checkCoherence,
  applyLessonReplacement,
  applyModuleReplacement,
  costOf,
  estimateCostCents,
  courseOutlineV2Schema,
  refinementAnswersSchema,
  type CourseOutlineV2,
  type LessonV2,
  type ModuleV2,
  type RefinementAnswers,
} from "@prol/content-factory";
import { requireUser } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Authorization helpers
// ─────────────────────────────────────────────────────────────────────────────

async function requireAIProfessor() {
  const user = await requireUser();
  if (user.role !== "PROFESSOR" && user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
  if (!user.tenantId) throw new Error("Sin tenant asignado");

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { aiEnabled: true },
  });
  if (!tenant?.aiEnabled) throw new Error("Módulo de IA no habilitado");

  return user as typeof user & { tenantId: string };
}

async function loadOwnedDraft(draftId: string, userId: string) {
  const draft = await db.courseDraft.findFirst({
    where: { id: draftId, professorId: userId },
  });
  if (!draft) throw new Error("Borrador no encontrado");
  return draft;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Briefing
// ─────────────────────────────────────────────────────────────────────────────

export async function createCourseDraft(formData: FormData) {
  const user = await requireAIProfessor();

  const topic = (formData.get("topic") as string | null)?.trim();
  const audience = (formData.get("audience") as string | null)?.trim();
  const level = (formData.get("level") as string | null) || "intermediate";
  const moduleCount = Number(formData.get("moduleCount") || 5);
  const lessonsPerModule = Number(formData.get("lessonsPerModule") || 5);

  if (!topic) throw new Error("El tema es requerido");
  if (!audience) throw new Error("La audiencia es requerida");
  if (!["beginner", "intermediate", "advanced"].includes(level)) {
    throw new Error("Nivel inválido");
  }
  if (moduleCount < 1 || moduleCount > 12) {
    throw new Error("Módulos debe estar entre 1 y 12");
  }
  if (lessonsPerModule < 1 || lessonsPerModule > 15) {
    throw new Error("Lecciones por módulo debe estar entre 1 y 15");
  }

  const draft = await db.courseDraft.create({
    data: {
      tenantId: user.tenantId,
      professorId: user.id,
      status: "BRIEFING",
      topic,
      audience,
      level,
      moduleCount,
      lessonsPerModule,
    },
  });

  await db.courseDraftOperation.create({
    data: {
      draftId: draft.id,
      type: "BRIEFING_SUBMITTED",
      input: { topic, audience, level, moduleCount, lessonsPerModule },
    },
  });

  return { success: true, draftId: draft.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Refinement (free, no credits consumed)
// ─────────────────────────────────────────────────────────────────────────────

export async function runRefinement(draftId: string) {
  const user = await requireAIProfessor();
  const draft = await loadOwnedDraft(draftId, user.id);

  const started = Date.now();
  const refinement = await generateRefinement({
    topic: draft.topic,
    audience: draft.audience,
    level: draft.level as "beginner" | "intermediate" | "advanced",
    moduleCount: draft.moduleCount,
    lessonsPerModule: draft.lessonsPerModule,
    language: draft.language,
  });

  const payload: RefinementAnswers = {
    inferences: refinement.inferences,
    answers: {},
  };

  await db.$transaction([
    db.courseDraft.update({
      where: { id: draft.id },
      data: {
        status: "REFINING",
        refinement: payload as unknown as object,
      },
    }),
    db.courseDraftOperation.create({
      data: {
        draftId: draft.id,
        type: "REFINEMENT_GENERATED",
        output: refinement as unknown as object,
        model: "claude-haiku-4-5",
        durationMs: Date.now() - started,
        credits: costOf("refinement"),
      },
    }),
  ]);

  return { success: true, refinement };
}

export async function saveRefinementAnswers(
  draftId: string,
  answers: RefinementAnswers
) {
  const user = await requireAIProfessor();
  const draft = await loadOwnedDraft(draftId, user.id);

  const parsed = refinementAnswersSchema.parse(answers);

  await db.$transaction([
    db.courseDraft.update({
      where: { id: draft.id },
      data: { refinement: parsed as unknown as object },
    }),
    db.courseDraftOperation.create({
      data: {
        draftId: draft.id,
        type: "REFINEMENT_EDITED",
        input: parsed as unknown as object,
      },
    }),
  ]);

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Generate the full outline
// ─────────────────────────────────────────────────────────────────────────────

export async function runOutlineGeneration(draftId: string) {
  const user = await requireAIProfessor();
  const draft = await loadOwnedDraft(draftId, user.id);

  const cost = costOf("outlineGeneration");

  try {
    await consumeCredits({
      tenantId: user.tenantId,
      amount: cost,
      reason: "course_outline",
      draftId: draft.id,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        success: false,
        error: "insufficient_credits",
        requested: err.requested,
        available: err.available,
      };
    }
    throw err;
  }

  await db.courseDraft.update({
    where: { id: draft.id },
    data: { status: "GENERATING" },
  });

  const started = Date.now();
  const refinement = draft.refinement as RefinementAnswers | null;

  try {
    const outline = await generateOutlineV2({
      topic: draft.topic,
      audience: draft.audience,
      level: draft.level as "beginner" | "intermediate" | "advanced",
      moduleCount: draft.moduleCount,
      lessonsPerModule: draft.lessonsPerModule,
      language: draft.language,
      refinement: refinement ?? undefined,
    });

    const model = "claude-sonnet-4-5-20250929";
    const durationMs = Date.now() - started;

    await db.$transaction([
      db.courseDraft.update({
        where: { id: draft.id },
        data: {
          status: "READY",
          outline: outline as unknown as object,
          outlineModel: model,
          creditsConsumed: { increment: cost },
        },
      }),
      db.courseDraftVersion.create({
        data: {
          draftId: draft.id,
          version: 1,
          snapshot: outline as unknown as object,
          reason: "initial_generation",
        },
      }),
      db.courseDraftOperation.create({
        data: {
          draftId: draft.id,
          type: "OUTLINE_GENERATED",
          output: outline as unknown as object,
          model,
          durationMs,
          credits: cost,
        },
      }),
    ]);

    return { success: true, outline };
  } catch (err) {
    // Refund credits on failure
    await refundCredits({
      tenantId: user.tenantId,
      amount: cost,
      draftId: draft.id,
      metadata: { error: err instanceof Error ? err.message : "unknown" },
    });
    await db.courseDraft.update({
      where: { id: draft.id },
      data: { status: "REFINING" },
    });
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 → 4 — Publish draft as real Course
// ─────────────────────────────────────────────────────────────────────────────

export async function publishDraftAsCourse(draftId: string) {
  const user = await requireAIProfessor();
  const draft = await loadOwnedDraft(draftId, user.id);

  if (draft.status !== "READY" || !draft.outline) {
    throw new Error("El borrador no está listo para publicarse");
  }
  if (draft.publishedCourseId) {
    return { success: true, courseId: draft.publishedCourseId };
  }

  const outline = courseOutlineV2Schema.parse(draft.outline);

  const course = await db.$transaction(async (tx) => {
    const baseSlug = slugify(outline.titleSuggested);
    let slug = baseSlug;
    let suffix = 1;
    while (
      await tx.course.findUnique({
        where: { tenantId_slug: { tenantId: user.tenantId, slug } },
        select: { id: true },
      })
    ) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const createdCourse = await tx.course.create({
      data: {
        tenantId: user.tenantId,
        professorId: user.id,
        title: outline.titleSuggested,
        slug,
        description: outline.shortDescription,
        priceInCents: 0,
        status: "DRAFT",
        totalDurationMinutes: outline.totalDurationMin,
        totalLessons: outline.modules.reduce(
          (sum, m) => sum + m.lessons.length,
          0
        ),
      },
    });

    for (const mod of outline.modules) {
      await tx.module.create({
        data: {
          courseId: createdCourse.id,
          title: mod.title,
          description: mod.moduleObjective,
          position: mod.number,
          isPublished: false,
          lessons: {
            create: mod.lessons.map((lesson) => ({
              title: lesson.title,
              description: lesson.summary,
              position: lesson.number,
              type: lesson.type === "MULTI" ? "MULTI" : lesson.type,
              aiGenerated: true,
              content: {
                keyPoints: lesson.keyPoints,
                deliverable: lesson.deliverable,
                suggestedResources: lesson.suggestedResources,
                bloom: lesson.bloom,
                estimatedDurationMin: lesson.durationMin,
              } as object,
            })),
          },
        },
      });
    }

    await tx.courseDraft.update({
      where: { id: draft.id },
      data: {
        status: "PUBLISHED",
        publishedCourseId: createdCourse.id,
        publishedAt: new Date(),
      },
    });

    await tx.courseDraftOperation.create({
      data: {
        draftId: draft.id,
        type: "OUTLINE_ACCEPTED",
        target: `course:${createdCourse.id}`,
      },
    });

    return createdCourse;
  });

  revalidatePath("/professor/courses");
  return { success: true, courseId: course.id, slug: course.slug };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Lesson / module regeneration & coherence check
// ─────────────────────────────────────────────────────────────────────────────

async function chargeAndVersion(args: {
  draftId: string;
  tenantId: string;
  amount: number;
  reason: Parameters<typeof consumeCredits>[0]["reason"];
}): Promise<void> {
  await consumeCredits({
    tenantId: args.tenantId,
    amount: args.amount,
    reason: args.reason,
    draftId: args.draftId,
  });
}

export async function runLessonRegeneration(
  draftId: string,
  moduleId: string,
  lessonId: string,
  feedback?: string
) {
  const user = await requireAIProfessor();
  const draft = await loadOwnedDraft(draftId, user.id);
  if (!draft.outline) throw new Error("El borrador no tiene outline");

  const outline = courseOutlineV2Schema.parse(draft.outline);
  const cost = costOf("lessonRegeneration");

  try {
    await chargeAndVersion({
      draftId: draft.id,
      tenantId: user.tenantId,
      amount: cost,
      reason: "lesson_regenerated",
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        success: false,
        error: "insufficient_credits",
        requested: err.requested,
        available: err.available,
      };
    }
    throw err;
  }

  const started = Date.now();
  try {
    const result = await regenerateLesson({
      outline,
      moduleId,
      lessonId,
      feedback,
    });
    await db.courseDraftOperation.create({
      data: {
        draftId: draft.id,
        type: "LESSON_REGENERATED",
        target: `lesson:${lessonId}`,
        input: { feedback } as object,
        output: result as unknown as object,
        credits: cost,
        durationMs: Date.now() - started,
      },
    });
    return { success: true, alternatives: result.alternatives };
  } catch (err) {
    await refundCredits({
      tenantId: user.tenantId,
      amount: cost,
      draftId: draft.id,
    });
    throw err;
  }
}

export async function applyLessonChoice(
  draftId: string,
  moduleId: string,
  replacement: LessonV2
) {
  const user = await requireAIProfessor();
  const draft = await loadOwnedDraft(draftId, user.id);
  if (!draft.outline) throw new Error("El borrador no tiene outline");
  const outline = courseOutlineV2Schema.parse(draft.outline);

  const next = applyLessonReplacement(outline, moduleId, replacement);
  const latest = await db.courseDraftVersion.findFirst({
    where: { draftId: draft.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  await db.$transaction([
    db.courseDraft.update({
      where: { id: draft.id },
      data: { outline: next as unknown as object },
    }),
    db.courseDraftVersion.create({
      data: {
        draftId: draft.id,
        version: nextVersion,
        snapshot: next as unknown as object,
        reason: `lesson_replaced:${replacement.id}`,
      },
    }),
  ]);

  return { success: true, version: nextVersion };
}

export async function runModuleRegeneration(
  draftId: string,
  moduleId: string,
  opts: { feedback?: string; preserveLessonCount?: boolean } = {}
) {
  const user = await requireAIProfessor();
  const draft = await loadOwnedDraft(draftId, user.id);
  if (!draft.outline) throw new Error("El borrador no tiene outline");
  const outline = courseOutlineV2Schema.parse(draft.outline);
  const cost = costOf("moduleRegeneration");

  try {
    await chargeAndVersion({
      draftId: draft.id,
      tenantId: user.tenantId,
      amount: cost,
      reason: "module_regenerated",
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        success: false,
        error: "insufficient_credits",
        requested: err.requested,
        available: err.available,
      };
    }
    throw err;
  }

  const started = Date.now();
  try {
    const replacement = await regenerateModule({
      outline,
      moduleId,
      feedback: opts.feedback,
      preserveLessonCount: opts.preserveLessonCount,
    });
    const next = applyModuleReplacement(outline, replacement);

    const latest = await db.courseDraftVersion.findFirst({
      where: { draftId: draft.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    await db.$transaction([
      db.courseDraft.update({
        where: { id: draft.id },
        data: { outline: next as unknown as object },
      }),
      db.courseDraftVersion.create({
        data: {
          draftId: draft.id,
          version: nextVersion,
          snapshot: next as unknown as object,
          reason: `module_regenerated:${moduleId}`,
        },
      }),
      db.courseDraftOperation.create({
        data: {
          draftId: draft.id,
          type: "MODULE_REGENERATED",
          target: `module:${moduleId}`,
          input: opts as object,
          output: replacement as unknown as object,
          credits: cost,
          durationMs: Date.now() - started,
        },
      }),
    ]);

    return { success: true, module: replacement, version: nextVersion };
  } catch (err) {
    await refundCredits({
      tenantId: user.tenantId,
      amount: cost,
      draftId: draft.id,
    });
    throw err;
  }
}

export async function runCoherenceCheck(draftId: string) {
  const user = await requireAIProfessor();
  const draft = await loadOwnedDraft(draftId, user.id);
  if (!draft.outline) throw new Error("El borrador no tiene outline");
  const outline = courseOutlineV2Schema.parse(draft.outline);
  const cost = costOf("coherenceCheck");

  try {
    await chargeAndVersion({
      draftId: draft.id,
      tenantId: user.tenantId,
      amount: cost,
      reason: "coherence_check",
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        success: false,
        error: "insufficient_credits",
        requested: err.requested,
        available: err.available,
      };
    }
    throw err;
  }

  const started = Date.now();
  try {
    const report = await checkCoherence(outline);
    await db.courseDraftOperation.create({
      data: {
        draftId: draft.id,
        type: "COHERENCE_CHECKED",
        output: report as unknown as object,
        credits: cost,
        durationMs: Date.now() - started,
      },
    });
    return { success: true, report };
  } catch (err) {
    await refundCredits({
      tenantId: user.tenantId,
      amount: cost,
      draftId: draft.id,
    });
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export async function getDraft(draftId: string) {
  const user = await requireAIProfessor();
  const draft = await loadOwnedDraft(draftId, user.id);
  return draft;
}

export async function getCreditsStatus() {
  const user = await requireAIProfessor();
  const [balance, tenant] = await Promise.all([
    getCreditsBalance(user.tenantId),
    db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        aiPlan: true,
        aiMonthlyAllotment: true,
        aiAllotmentResetAt: true,
      },
    }),
  ]);
  return {
    balance,
    plan: tenant?.aiPlan ?? "none",
    monthlyAllotment: tenant?.aiMonthlyAllotment ?? 0,
    allotmentResetAt: tenant?.aiAllotmentResetAt,
  };
}

// Export for UI preview of costs before the user clicks
export async function getOperationCosts() {
  return {
    outlineGeneration: costOf("outlineGeneration"),
    lessonRegeneration: costOf("lessonRegeneration"),
    moduleRegeneration: costOf("moduleRegeneration"),
    coherenceCheck: costOf("coherenceCheck"),
    refinement: costOf("refinement"),
  };
}

// Silence unused import warning — surfaces cost estimation for future worker code
export const _estimateCostCents = estimateCostCents;
