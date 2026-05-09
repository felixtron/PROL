"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db, type SurveyQuestionType, type SurveyStatus } from "@prol/db";
import { requireSurveyAuthor, assertSameTenant } from "@/lib/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadSurveyOrThrow(id: string) {
  const survey = await db.survey.findUnique({ where: { id } });
  if (!survey) throw new Error("Encuesta no encontrada");
  return survey;
}

async function loadQuestionOrThrow(id: string) {
  const q = await db.surveyQuestion.findUnique({
    where: { id },
    include: { survey: true },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  return q;
}

async function assertSurveysEnabled(tenantId: string, userRole: string) {
  if (userRole === "SUPER_ADMIN") return;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { surveysEnabled: true },
  });
  if (!tenant?.surveysEnabled) {
    throw new Error("Encuestas no están habilitadas para este tenant");
  }
}

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

// ─── Survey CRUD ─────────────────────────────────────────────────────────────

export async function createSurvey(input: {
  title: string;
  description?: string | null;
  companyId: string;
}) {
  const user = await requireSurveyAuthor();
  const title = input.title?.trim();
  if (!title || title.length < 3 || title.length > 120) {
    throw new Error("Título requerido (3–120 caracteres)");
  }
  if (!user.tenantId) {
    throw new Error("El SUPER_ADMIN debe especificar tenantId");
  }
  await assertSurveysEnabled(user.tenantId, user.role);

  const company = await db.company.findUnique({
    where: { id: input.companyId },
    select: { id: true, tenantId: true },
  });
  if (!company) throw new Error("Empresa no encontrada");
  assertSameTenant(user, company.tenantId);

  const survey = await db.survey.create({
    data: {
      tenantId: user.tenantId,
      professorId: user.id,
      companyId: company.id,
      title,
      description: input.description?.trim() || null,
      publicSlug: randomToken(9),
    },
  });

  revalidatePath("/professor/surveys");
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
  const user = await requireSurveyAuthor();
  const survey = await loadSurveyOrThrow(surveyId);
  assertSameTenant(user, survey.tenantId);
  await assertSurveysEnabled(survey.tenantId, user.role);

  if (input.companyId) {
    const company = await db.company.findUnique({
      where: { id: input.companyId },
      select: { id: true, tenantId: true },
    });
    if (!company) throw new Error("Empresa no encontrada");
    assertSameTenant(user, company.tenantId);
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

  revalidatePath("/professor/surveys");
  revalidatePath(`/professor/surveys/${surveyId}`);
  return { success: true };
}

export async function deleteSurvey(surveyId: string) {
  const user = await requireSurveyAuthor();
  const survey = await loadSurveyOrThrow(surveyId);
  assertSameTenant(user, survey.tenantId);
  await assertSurveysEnabled(survey.tenantId, user.role);

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
  return { success: true };
}

export async function regenerateResultsToken(surveyId: string) {
  const user = await requireSurveyAuthor();
  const survey = await loadSurveyOrThrow(surveyId);
  assertSameTenant(user, survey.tenantId);
  await assertSurveysEnabled(survey.tenantId, user.role);

  const token = randomToken(18);
  await db.survey.update({
    where: { id: surveyId },
    data: { resultsShareToken: token },
  });
  revalidatePath(`/professor/surveys/${surveyId}`);
  return { success: true, token };
}

export async function clearResultsToken(surveyId: string) {
  const user = await requireSurveyAuthor();
  const survey = await loadSurveyOrThrow(surveyId);
  assertSameTenant(user, survey.tenantId);
  await assertSurveysEnabled(survey.tenantId, user.role);

  await db.survey.update({
    where: { id: surveyId },
    data: { resultsShareToken: null },
  });
  revalidatePath(`/professor/surveys/${surveyId}`);
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
  const user = await requireSurveyAuthor();
  const survey = await loadSurveyOrThrow(surveyId);
  assertSameTenant(user, survey.tenantId);
  await assertSurveysEnabled(survey.tenantId, user.role);

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

  revalidatePath(`/professor/surveys/${surveyId}`);
  return { success: true, questionId: q.id };
}

export async function updateQuestion(
  questionId: string,
  input: {
    label?: string;
    options?: string[] | null;
  },
) {
  const user = await requireSurveyAuthor();
  const q = await loadQuestionOrThrow(questionId);
  assertSameTenant(user, q.survey.tenantId);
  await assertSurveysEnabled(q.survey.tenantId, user.role);

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

  revalidatePath(`/professor/surveys/${q.surveyId}`);
  return { success: true };
}

export async function deleteQuestion(questionId: string) {
  const user = await requireSurveyAuthor();
  const q = await loadQuestionOrThrow(questionId);
  assertSameTenant(user, q.survey.tenantId);
  await assertSurveysEnabled(q.survey.tenantId, user.role);

  await db.surveyQuestion.delete({ where: { id: questionId } });
  revalidatePath(`/professor/surveys/${q.surveyId}`);
  return { success: true };
}

export async function reorderQuestion(
  questionId: string,
  direction: "up" | "down",
) {
  const user = await requireSurveyAuthor();
  const q = await loadQuestionOrThrow(questionId);
  assertSameTenant(user, q.survey.tenantId);
  await assertSurveysEnabled(q.survey.tenantId, user.role);

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

  revalidatePath(`/professor/surveys/${q.surveyId}`);
  return { success: true };
}
