"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db, type SurveyQuestionType, type SurveyStatus } from "@prol/db";
import {
  requireSurveyCreateAccess,
  requireSurveyEditAccess,
} from "@/lib/survey-access";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** URL-safe random string for public slugs / share tokens. */
function randomToken(bytes = 12): string {
  return randomBytes(bytes).toString("base64url");
}

function normalizeOptions(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  if (cleaned.length < 2) return null;
  if (cleaned.length > 10) return cleaned.slice(0, 10);
  return cleaned;
}

function revalidateSurveyPaths(surveyId: string): void {
  revalidatePath("/professor/surveys");
  revalidatePath(`/professor/surveys/${surveyId}`);
  revalidatePath("/dashboard/company/surveys");
  revalidatePath(`/dashboard/company/surveys/${surveyId}`);
}

// ─── Survey CRUD ─────────────────────────────────────────────────────────────

export async function createSurvey(input: {
  title: string;
  description?: string | null;
  companyId: string;
}) {
  const { user, company } = await requireSurveyCreateAccess(input.companyId);
  const title = input.title?.trim();
  if (!title || title.length < 3 || title.length > 120) {
    throw new Error("Título requerido (3–120 caracteres)");
  }

  const survey = await db.survey.create({
    data: {
      tenantId: company.tenantId,
      // `professorId` is the FK to the creator (a PROFESSOR, ADMIN, or the
      // company leader STUDENT). Schema name predates the leader role; the
      // relation is "SurveysCreated".
      professorId: user.id,
      companyId: company.id,
      title,
      description: input.description?.trim() || null,
      publicSlug: randomToken(9),
    },
  });

  revalidatePath("/professor/surveys");
  revalidatePath("/dashboard/company/surveys");
  return { success: true, surveyId: survey.id };
}

export async function updateSurvey(
  surveyId: string,
  input: {
    title?: string;
    description?: string | null;
    companyId?: string;
    status?: SurveyStatus;
  },
) {
  const ctx = await requireSurveyEditAccess(surveyId);

  // Leaders can edit their own surveys but cannot reassign them to a
  // different company — that would let them escape their scope.
  if (input.companyId !== undefined && input.companyId !== ctx.survey.companyId) {
    if (ctx.role === "LEADER") {
      throw new Error("No autorizado: no puedes reasignar la encuesta");
    }
    const company = await db.company.findUnique({
      where: { id: input.companyId },
      select: { id: true, tenantId: true },
    });
    if (!company) throw new Error("Empresa no encontrada");
    if (
      ctx.user.role !== "SUPER_ADMIN" &&
      company.tenantId !== ctx.survey.tenantId
    ) {
      throw new Error("No autorizado: tenant no coincide");
    }
  }

  await db.survey.update({
    where: { id: surveyId },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });

  revalidateSurveyPaths(surveyId);
  return { success: true };
}

export async function deleteSurvey(surveyId: string) {
  await requireSurveyEditAccess(surveyId);

  // Block deletion if any responses already exist — preserves audit trail.
  const responseCount = await db.surveyResponse.count({
    where: { surveyId },
  });
  if (responseCount > 0) {
    throw new Error(
      "No se puede eliminar: la encuesta ya tiene respuestas. Archívala en su lugar.",
    );
  }

  await db.survey.delete({ where: { id: surveyId } });
  revalidatePath("/professor/surveys");
  revalidatePath("/dashboard/company/surveys");
  return { success: true };
}

export async function regenerateResultsToken(surveyId: string) {
  await requireSurveyEditAccess(surveyId);
  const token = randomToken(18);
  await db.survey.update({
    where: { id: surveyId },
    data: { resultsShareToken: token },
  });
  revalidateSurveyPaths(surveyId);
  return { success: true, token };
}

export async function clearResultsToken(surveyId: string) {
  await requireSurveyEditAccess(surveyId);
  await db.survey.update({
    where: { id: surveyId },
    data: { resultsShareToken: null },
  });
  revalidateSurveyPaths(surveyId);
  return { success: true };
}

// ─── Question CRUD ───────────────────────────────────────────────────────────

export async function addQuestion(
  surveyId: string,
  input: {
    type: SurveyQuestionType;
    label: string;
    options?: string[] | null;
  },
) {
  await requireSurveyEditAccess(surveyId);

  const label = input.label?.trim();
  if (!label || label.length < 2 || label.length > 200) {
    throw new Error("Pregunta requerida (2–200 caracteres)");
  }

  let options: string[] | null = null;
  if (input.type === "MULTIPLE_CHOICE") {
    options = normalizeOptions(input.options);
    if (!options) {
      throw new Error("Opción múltiple requiere al menos 2 opciones");
    }
  }

  const last = await db.surveyQuestion.findFirst({
    where: { surveyId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (last?.position ?? -1) + 1;

  const q = await db.surveyQuestion.create({
    data: {
      surveyId,
      type: input.type,
      label,
      position,
      options: options ?? undefined,
    },
  });

  revalidateSurveyPaths(surveyId);
  return { success: true, questionId: q.id };
}

export async function updateQuestion(
  questionId: string,
  input: {
    label?: string;
    options?: string[] | null;
  },
) {
  const q = await db.surveyQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, surveyId: true, type: true },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  await requireSurveyEditAccess(q.surveyId);

  let options: string[] | null | undefined = undefined;
  if (input.options !== undefined) {
    if (q.type !== "MULTIPLE_CHOICE") {
      throw new Error("Solo opción múltiple acepta opciones");
    }
    options = normalizeOptions(input.options);
    if (!options) {
      throw new Error("Opción múltiple requiere al menos 2 opciones");
    }
  }

  await db.surveyQuestion.update({
    where: { id: questionId },
    data: {
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(options !== undefined ? { options } : {}),
    },
  });

  revalidateSurveyPaths(q.surveyId);
  return { success: true };
}

export async function deleteQuestion(questionId: string) {
  const q = await db.surveyQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, surveyId: true },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  await requireSurveyEditAccess(q.surveyId);

  await db.surveyQuestion.delete({ where: { id: questionId } });
  revalidateSurveyPaths(q.surveyId);
  return { success: true };
}

export async function reorderQuestion(
  questionId: string,
  direction: "up" | "down",
) {
  const q = await db.surveyQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, surveyId: true, position: true },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  await requireSurveyEditAccess(q.surveyId);

  const neighbour = await db.surveyQuestion.findFirst({
    where: {
      surveyId: q.surveyId,
      position:
        direction === "up"
          ? { lt: q.position }
          : { gt: q.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return { success: true };

  await db.$transaction([
    db.surveyQuestion.update({
      where: { id: q.id },
      data: { position: neighbour.position },
    }),
    db.surveyQuestion.update({
      where: { id: neighbour.id },
      data: { position: q.position },
    }),
  ]);

  revalidateSurveyPaths(q.surveyId);
  return { success: true };
}

// ─── Public response submission ──────────────────────────────────────────────

/**
 * Accept a response from an unauthenticated respondent. Validates the
 * public slug, the PUBLISHED status, the (surveyId, email) uniqueness, and
 * that every question gets exactly one valid answer. Rate-limiting is
 * handled by the global middleware on `/api/**` — this action is invoked
 * from the public page and the same `/api` rate window applies.
 */
export async function submitSurveyResponse(input: {
  publicSlug: string;
  email: string;
  respondentCompanyId?: string | null;
  respondentCompanyName?: string | null;
  answers: Array<{
    questionId: string;
    ratingValue?: number | null;
    selectedOptionIndex?: number | null;
  }>;
}) {
  const slug = input.publicSlug?.trim();
  if (!slug) throw new Error("Encuesta no encontrada");

  const email = input.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Correo electrónico inválido");
  }

  const survey = await db.survey.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true,
      tenantId: true,
      status: true,
      questions: {
        select: { id: true, type: true, options: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!survey) throw new Error("Encuesta no encontrada");
  if (survey.status !== "PUBLISHED") {
    throw new Error("Esta encuesta no está aceptando respuestas");
  }
  if (survey.questions.length === 0) {
    throw new Error("La encuesta no tiene preguntas");
  }

  // Block duplicate submissions for the same email.
  const existing = await db.surveyResponse.findUnique({
    where: { surveyId_email: { surveyId: survey.id, email } },
    select: { id: true },
  });
  if (existing) {
    throw new Error("Ya respondiste esta encuesta con este correo");
  }

  // Validate the chosen company (if any) belongs to the survey's tenant.
  let respondentCompanyId: string | null = null;
  let respondentCompanyName: string | null = null;
  if (input.respondentCompanyId) {
    const company = await db.company.findUnique({
      where: { id: input.respondentCompanyId },
      select: { id: true, tenantId: true, name: true },
    });
    if (!company || company.tenantId !== survey.tenantId) {
      throw new Error("Empresa inválida");
    }
    respondentCompanyId = company.id;
    respondentCompanyName = company.name;
  } else {
    const free = input.respondentCompanyName?.trim();
    if (!free || free.length < 2 || free.length > 120) {
      throw new Error("Indica tu empresa");
    }
    respondentCompanyName = free;
  }

  // Build answer rows, validating each against its question type.
  const byId = new Map(survey.questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const answerRows: Array<{
    questionId: string;
    ratingValue: number | null;
    selectedOptionIndex: number | null;
  }> = [];
  for (const answer of input.answers ?? []) {
    const q = byId.get(answer.questionId);
    if (!q) continue;
    if (seen.has(q.id)) {
      throw new Error("Cada pregunta admite una sola respuesta");
    }
    seen.add(q.id);

    if (q.type === "RATING_STARS") {
      const rating = Number(answer.ratingValue);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("Calificación inválida (1–5)");
      }
      answerRows.push({
        questionId: q.id,
        ratingValue: rating,
        selectedOptionIndex: null,
      });
    } else if (q.type === "MULTIPLE_CHOICE") {
      const options = Array.isArray(q.options) ? q.options : [];
      const idx = Number(answer.selectedOptionIndex);
      if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
        throw new Error("Opción seleccionada inválida");
      }
      answerRows.push({
        questionId: q.id,
        ratingValue: null,
        selectedOptionIndex: idx,
      });
    }
  }

  if (answerRows.length !== survey.questions.length) {
    throw new Error("Responde todas las preguntas");
  }

  await db.$transaction(async (tx) => {
    const response = await tx.surveyResponse.create({
      data: {
        surveyId: survey.id,
        email,
        respondentCompanyId,
        respondentCompanyName,
      },
    });
    await tx.surveyAnswer.createMany({
      data: answerRows.map((a) => ({
        responseId: response.id,
        questionId: a.questionId,
        ratingValue: a.ratingValue,
        selectedOptionIndex: a.selectedOptionIndex,
      })),
    });
  });

  // Invalidate any results dashboard that may already be cached.
  revalidatePath(`/professor/surveys/${survey.id}`);
  revalidatePath(`/dashboard/company/surveys/${survey.id}`);
  return { success: true };
}
