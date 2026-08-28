"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  type SurveyAudienceKind,
  type SurveyQuestionType,
  type SurveyResultsAudience,
  type SurveyStatus,
  type SurveyTrigger,
} from "@prol/db";
import {
  assertTenantScope,
  requireCampaignManageAccess,
  requireCompanyInTenant,
  requireSurveyAdmin,
  requireSurveyManageAccess,
  resolveAdminTenantId,
} from "@/lib/survey-access";
import {
  notifyResultsPublished,
  resendCampaignInvitations,
  sendCampaignInvitations,
  setSpecificRecipients,
  surveyToken,
  syncCampaignRecipients,
} from "@/lib/survey-dispatch";
import {
  DEFAULT_DURATION_DAYS,
  MAX_DURATION_DAYS,
  MIN_DURATION_DAYS,
  campaignState,
} from "@/lib/surveys";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeOptions(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  if (cleaned.length < 2) return null;
  return cleaned.slice(0, 10);
}

/** Tipos cuyo enunciado se completa con una lista de opciones. */
function needsOptions(type: SurveyQuestionType): boolean {
  return type === "MULTIPLE_CHOICE" || type === "SCALE_LABELED";
}

function normalizeReminderDays(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const days = input
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 90);
  return [...new Set(days)].sort((a, b) => b - a).slice(0, 5);
}

function normalizeWeight(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.min(n, 10);
}

function parseDate(value: unknown, field: string): Date {
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new Error(`Fecha inválida: ${field}`);
  return d;
}

function revalidateSurvey(surveyId?: string): void {
  revalidatePath("/tenant-admin/surveys");
  if (surveyId) revalidatePath(`/tenant-admin/surveys/${surveyId}`);
}

function revalidateCampaign(campaignId: string, surveyId?: string): void {
  revalidateSurvey(surveyId);
  revalidatePath(`/tenant-admin/surveys/campaigns/${campaignId}`);
  revalidatePath("/dashboard/surveys");
  revalidatePath(`/dashboard/surveys/${campaignId}/results`);
}

// ─── Plantillas ──────────────────────────────────────────────────────────────

export async function createSurvey(input: {
  title: string;
  description?: string | null;
  companyId?: string | null;
  tenantId?: string | null;
  defaultDurationDays?: number;
  defaultReminderDays?: number[];
}) {
  const user = await requireSurveyAdmin();
  const tenantId = resolveAdminTenantId(user, input.tenantId);

  const title = input.title?.trim();
  if (!title || title.length < 3 || title.length > 120) {
    throw new Error("Título requerido (3–120 caracteres)");
  }

  if (input.companyId) {
    await requireCompanyInTenant(user, input.companyId, tenantId);
  }

  const duration = Math.min(
    Math.max(input.defaultDurationDays ?? DEFAULT_DURATION_DAYS, MIN_DURATION_DAYS),
    MAX_DURATION_DAYS,
  );

  const survey = await db.survey.create({
    data: {
      tenantId,
      professorId: user.id,
      companyId: input.companyId || null,
      title,
      description: input.description?.trim() || null,
      publicSlug: surveyToken(9),
      defaultDurationDays: duration,
      defaultReminderDays: input.defaultReminderDays?.length
        ? normalizeReminderDays(input.defaultReminderDays)
        : undefined,
    },
  });

  revalidateSurvey();
  return { success: true, surveyId: survey.id };
}

export async function updateSurvey(
  surveyId: string,
  input: {
    title?: string;
    description?: string | null;
    status?: SurveyStatus;
    companyId?: string | null;
    defaultDurationDays?: number;
    defaultReminderDays?: number[];
    trigger?: SurveyTrigger;
    triggerCourseId?: string | null;
  },
) {
  const { user, survey } = await requireSurveyManageAccess(surveyId);

  if (input.companyId) {
    await requireCompanyInTenant(user, input.companyId, survey.tenantId);
  }

  // El curso del disparador tiene que ser del mismo tenant; si no, una
  // encuesta podría dispararse con la actividad de otro cliente.
  if (input.triggerCourseId) {
    const course = await db.course.findUnique({
      where: { id: input.triggerCourseId },
      select: { id: true, tenantId: true },
    });
    if (!course) throw new Error("Curso no encontrado");
    if (course.tenantId !== survey.tenantId) {
      throw new Error("No autorizado: el curso pertenece a otro tenant");
    }
  }

  if (input.title !== undefined) {
    const t = input.title.trim();
    if (t.length < 3 || t.length > 120) {
      throw new Error("Título requerido (3–120 caracteres)");
    }
  }

  await db.survey.update({
    where: { id: surveyId },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.companyId !== undefined ? { companyId: input.companyId || null } : {}),
      ...(input.defaultDurationDays !== undefined
        ? {
            defaultDurationDays: Math.min(
              Math.max(input.defaultDurationDays, MIN_DURATION_DAYS),
              MAX_DURATION_DAYS,
            ),
          }
        : {}),
      ...(input.defaultReminderDays !== undefined
        ? { defaultReminderDays: normalizeReminderDays(input.defaultReminderDays) }
        : {}),
      ...(input.trigger !== undefined ? { trigger: input.trigger } : {}),
      ...(input.triggerCourseId !== undefined
        ? { triggerCourseId: input.triggerCourseId || null }
        : {}),
    },
  });

  revalidateSurvey(surveyId);
  return { success: true };
}

export async function deleteSurvey(surveyId: string) {
  await requireSurveyManageAccess(surveyId);

  const responseCount = await db.surveyResponse.count({ where: { surveyId } });
  if (responseCount > 0) {
    throw new Error(
      "No se puede eliminar: la encuesta ya tiene respuestas. Archívala en su lugar.",
    );
  }

  await db.survey.delete({ where: { id: surveyId } });
  revalidateSurvey();
  return { success: true };
}

/**
 * Copia la plantilla con sus preguntas. Es la base de los lanzamientos por
 * bloques cuando el cuestionario necesita variar; si no varía, se relanza la
 * misma plantilla con otra campaña y no hace falta duplicar nada.
 */
export async function duplicateSurvey(surveyId: string) {
  const { user, survey } = await requireSurveyManageAccess(surveyId);

  const source = await db.survey.findUniqueOrThrow({
    where: { id: surveyId },
    include: { questions: { orderBy: { position: "asc" } } },
  });

  const copy = await db.survey.create({
    data: {
      tenantId: survey.tenantId,
      professorId: user.id,
      companyId: source.companyId,
      title: `${source.title} (copia)`,
      description: source.description,
      publicSlug: surveyToken(9),
      status: "DRAFT",
      defaultDurationDays: source.defaultDurationDays,
      defaultReminderDays: source.defaultReminderDays,
      trigger: "MANUAL",
      questions: {
        create: source.questions.map((q) => ({
          type: q.type,
          label: q.label,
          position: q.position,
          options: q.options ?? undefined,
          section: q.section,
          weight: q.weight,
        })),
      },
    },
    select: { id: true },
  });

  revalidateSurvey();
  return { success: true, surveyId: copy.id };
}

// ─── Preguntas ───────────────────────────────────────────────────────────────

export async function addQuestion(
  surveyId: string,
  input: {
    type: SurveyQuestionType;
    label: string;
    options?: string[] | null;
    section?: string | null;
    weight?: number;
    allowNotApplicable?: boolean;
  },
) {
  await requireSurveyManageAccess(surveyId);

  const label = input.label?.trim();
  if (!label || label.length < 2 || label.length > 200) {
    throw new Error("Pregunta requerida (2–200 caracteres)");
  }

  let options: string[] | null = null;
  if (needsOptions(input.type)) {
    options = normalizeOptions(input.options);
    if (!options) {
      throw new Error(
        input.type === "SCALE_LABELED"
          ? "La escala requiere al menos 2 niveles, del mejor al peor"
          : "Opción múltiple requiere al menos 2 opciones",
      );
    }
  }

  const last = await db.surveyQuestion.findFirst({
    where: { surveyId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const q = await db.surveyQuestion.create({
    data: {
      surveyId,
      type: input.type,
      label,
      position: (last?.position ?? -1) + 1,
      options: options ?? undefined,
      section: input.section?.trim() || null,
      weight: normalizeWeight(input.weight ?? 1),
      // "No aplica" solo tiene sentido en la escala: es el "NA" del papel.
      allowNotApplicable:
        input.type === "SCALE_LABELED" ? Boolean(input.allowNotApplicable) : false,
    },
  });

  revalidateSurvey(surveyId);
  return { success: true, questionId: q.id };
}

export async function updateQuestion(
  questionId: string,
  input: {
    label?: string;
    options?: string[] | null;
    section?: string | null;
    weight?: number;
    allowNotApplicable?: boolean;
  },
) {
  const q = await db.surveyQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, surveyId: true, type: true },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  await requireSurveyManageAccess(q.surveyId);

  let options: string[] | undefined;
  if (input.options !== undefined) {
    if (!needsOptions(q.type)) {
      throw new Error("Este tipo de pregunta no acepta opciones");
    }
    const normalized = normalizeOptions(input.options);
    if (!normalized) throw new Error("Se requieren al menos 2 opciones");
    options = normalized;
  }

  await db.surveyQuestion.update({
    where: { id: questionId },
    data: {
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(options !== undefined ? { options } : {}),
      ...(input.section !== undefined ? { section: input.section?.trim() || null } : {}),
      ...(input.weight !== undefined ? { weight: normalizeWeight(input.weight) } : {}),
      ...(input.allowNotApplicable !== undefined && q.type === "SCALE_LABELED"
        ? { allowNotApplicable: input.allowNotApplicable }
        : {}),
    },
  });

  revalidateSurvey(q.surveyId);
  return { success: true };
}

export async function deleteQuestion(questionId: string) {
  const q = await db.surveyQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, surveyId: true },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  await requireSurveyManageAccess(q.surveyId);

  await db.surveyQuestion.delete({ where: { id: questionId } });
  revalidateSurvey(q.surveyId);
  return { success: true };
}

export async function reorderQuestion(questionId: string, direction: "up" | "down") {
  const q = await db.surveyQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, surveyId: true, position: true },
  });
  if (!q) throw new Error("Pregunta no encontrada");
  await requireSurveyManageAccess(q.surveyId);

  const neighbour = await db.surveyQuestion.findFirst({
    where: {
      surveyId: q.surveyId,
      position: direction === "up" ? { lt: q.position } : { gt: q.position },
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

  revalidateSurvey(q.surveyId);
  return { success: true };
}

// ─── Lanzamientos ────────────────────────────────────────────────────────────

async function assertContextInTenant(
  tenantId: string,
  input: {
    courseId?: string | null;
    workshopId?: string | null;
    advisorySessionId?: string | null;
  },
): Promise<void> {
  if (input.courseId) {
    const c = await db.course.findUnique({
      where: { id: input.courseId },
      select: { tenantId: true },
    });
    if (!c || c.tenantId !== tenantId) throw new Error("Curso inválido");
  }
  if (input.workshopId) {
    const w = await db.workshop.findUnique({
      where: { id: input.workshopId },
      select: { tenantId: true },
    });
    if (!w || w.tenantId !== tenantId) throw new Error("Workshop inválido");
  }
  if (input.advisorySessionId) {
    const a = await db.advisorySession.findUnique({
      where: { id: input.advisorySessionId },
      select: { tenantId: true },
    });
    if (!a || a.tenantId !== tenantId) throw new Error("Sesión inválida");
  }
}

export async function createCampaign(input: {
  surveyId: string;
  name: string;
  audience: SurveyAudienceKind;
  companyId: string;
  courseId?: string | null;
  workshopId?: string | null;
  advisorySessionId?: string | null;
  projectLabel?: string | null;
  opensAt?: string | Date | null;
  closesAt?: string | Date | null;
  durationDays?: number | null;
  reminderDaysBefore?: number[];
  userIds?: string[];
}) {
  const { user, survey } = await requireSurveyManageAccess(input.surveyId);

  const questionCount = await db.surveyQuestion.count({
    where: { surveyId: survey.id },
  });
  if (questionCount === 0) {
    throw new Error("Agrega al menos una pregunta antes de lanzar la encuesta");
  }

  const name = input.name?.trim();
  if (!name || name.length < 3 || name.length > 140) {
    throw new Error("Nombre del lanzamiento requerido (3–140 caracteres)");
  }

  const company = await requireCompanyInTenant(user, input.companyId, survey.tenantId);
  await assertContextInTenant(survey.tenantId, input);

  if (input.audience === "COMPANY_LEADER" && !company.leaderId) {
    throw new Error("Esta empresa no tiene un usuario líder asignado");
  }

  const template = await db.survey.findUniqueOrThrow({
    where: { id: survey.id },
    select: { defaultDurationDays: true, defaultReminderDays: true },
  });

  const opensAt = input.opensAt ? parseDate(input.opensAt, "apertura") : new Date();
  let closesAt: Date;
  if (input.closesAt) {
    closesAt = parseDate(input.closesAt, "vencimiento");
  } else {
    const days = Math.min(
      Math.max(input.durationDays ?? template.defaultDurationDays, MIN_DURATION_DAYS),
      MAX_DURATION_DAYS,
    );
    closesAt = new Date(opensAt.getTime() + days * 86_400_000);
  }
  if (closesAt <= opensAt) {
    throw new Error("El vencimiento debe ser posterior a la apertura");
  }

  const campaign = await db.surveyCampaign.create({
    data: {
      surveyId: survey.id,
      tenantId: survey.tenantId,
      createdById: user.id,
      name,
      audience: input.audience,
      companyId: company.id,
      courseId: input.courseId || null,
      workshopId: input.workshopId || null,
      advisorySessionId: input.advisorySessionId || null,
      projectLabel: input.projectLabel?.trim() || null,
      opensAt,
      closesAt,
      reminderDaysBefore: input.reminderDaysBefore?.length
        ? normalizeReminderDays(input.reminderDaysBefore)
        : template.defaultReminderDays,
    },
    select: { id: true },
  });

  if (input.audience === "SPECIFIC_USERS") {
    if (!input.userIds?.length) {
      throw new Error("Selecciona al menos un destinatario");
    }
    await setSpecificRecipients(campaign.id, input.userIds);
  } else {
    await syncCampaignRecipients(campaign.id);
  }

  revalidateCampaign(campaign.id, survey.id);
  return { success: true, campaignId: campaign.id };
}

export async function updateCampaign(
  campaignId: string,
  input: {
    name?: string;
    opensAt?: string | Date;
    closesAt?: string | Date;
    reminderDaysBefore?: number[];
    projectLabel?: string | null;
    courseId?: string | null;
    workshopId?: string | null;
    advisorySessionId?: string | null;
  },
) {
  const { campaign } = await requireCampaignManageAccess(campaignId);
  if (campaign.status === "CANCELLED") {
    throw new Error("El lanzamiento está anulado");
  }
  await assertContextInTenant(campaign.tenantId, input);

  const opensAt = input.opensAt ? parseDate(input.opensAt, "apertura") : campaign.opensAt;
  const closesAt = input.closesAt
    ? parseDate(input.closesAt, "vencimiento")
    : campaign.closesAt;
  if (closesAt <= opensAt) {
    throw new Error("El vencimiento debe ser posterior a la apertura");
  }

  // Ampliar la fecha de un lanzamiento ya cerrado lo reabre: es la forma de
  // dar una prórroga sin perder las respuestas ya recibidas.
  const reopen = campaign.status === "CLOSED" && closesAt > new Date();

  await db.surveyCampaign.update({
    where: { id: campaignId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      opensAt,
      closesAt,
      ...(input.reminderDaysBefore !== undefined
        ? { reminderDaysBefore: normalizeReminderDays(input.reminderDaysBefore) }
        : {}),
      ...(input.projectLabel !== undefined
        ? { projectLabel: input.projectLabel?.trim() || null }
        : {}),
      ...(input.courseId !== undefined ? { courseId: input.courseId || null } : {}),
      ...(input.workshopId !== undefined ? { workshopId: input.workshopId || null } : {}),
      ...(input.advisorySessionId !== undefined
        ? { advisorySessionId: input.advisorySessionId || null }
        : {}),
      ...(reopen ? { status: "ACTIVE" as const, closedAt: null } : {}),
    },
  });

  if (reopen) {
    await db.surveyRecipient.updateMany({
      where: { campaignId, status: "EXPIRED" },
      data: { status: "SENT" },
    });
  }

  revalidateCampaign(campaignId, campaign.surveyId);
  return { success: true };
}

export async function setCampaignRecipients(campaignId: string, userIds: string[]) {
  const { campaign } = await requireCampaignManageAccess(campaignId);
  if (campaign.status === "CANCELLED") throw new Error("El lanzamiento está anulado");
  const result = await setSpecificRecipients(campaignId, userIds);
  revalidateCampaign(campaignId, campaign.surveyId);
  return { success: true, ...result };
}

export async function sendCampaign(campaignId: string) {
  const { campaign } = await requireCampaignManageAccess(campaignId);
  if (campaign.status === "CANCELLED" || campaign.status === "CLOSED") {
    throw new Error("El lanzamiento ya no admite envíos");
  }
  if (new Date() > campaign.closesAt) {
    throw new Error("El lanzamiento ya venció: amplía la fecha antes de enviarlo");
  }
  const result = await sendCampaignInvitations(campaignId);
  revalidateCampaign(campaignId, campaign.surveyId);
  return { success: true, ...result };
}

export async function resendCampaign(campaignId: string, recipientIds?: string[]) {
  const { campaign } = await requireCampaignManageAccess(campaignId);
  const result = await resendCampaignInvitations(campaignId, recipientIds);
  revalidateCampaign(campaignId, campaign.surveyId);
  return { success: true, ...result };
}

export async function closeCampaign(campaignId: string) {
  const { campaign } = await requireCampaignManageAccess(campaignId);
  const now = new Date();
  await db.$transaction([
    db.surveyCampaign.update({
      where: { id: campaignId },
      data: { status: "CLOSED", closedAt: now, closesAt: now },
    }),
    db.surveyRecipient.updateMany({
      where: { campaignId, status: { in: ["PENDING", "SENT"] } },
      data: { status: "EXPIRED" },
    }),
  ]);
  revalidateCampaign(campaignId, campaign.surveyId);
  return { success: true };
}

export async function cancelCampaign(campaignId: string) {
  const { campaign } = await requireCampaignManageAccess(campaignId);
  const responses = await db.surveyResponse.count({ where: { campaignId } });
  if (responses > 0) {
    throw new Error("Ya hay respuestas: ciérralo en lugar de anularlo");
  }
  await db.surveyCampaign.update({
    where: { id: campaignId },
    data: { status: "CANCELLED", closedAt: new Date() },
  });
  revalidateCampaign(campaignId, campaign.surveyId);
  return { success: true };
}

/** Activa o desactiva el enlace compartible (identificación por correo). */
export async function setCampaignShareLink(campaignId: string, enabled: boolean) {
  const { campaign } = await requireCampaignManageAccess(campaignId);
  const updated = await db.surveyCampaign.update({
    where: { id: campaignId },
    data: { shareToken: enabled ? surveyToken() : null },
    select: { shareToken: true },
  });
  revalidateCampaign(campaignId, campaign.surveyId);
  return { success: true, shareToken: updated.shareToken };
}

/**
 * Aprueba la publicación del consolidado. Hasta que esto ocurre, ni el líder
 * ni los participantes ven un solo número: el resultado llega primero al
 * administrador y sale cuando él lo decide.
 */
export async function publishCampaignResults(
  campaignId: string,
  input: {
    audience: Exclude<SurveyResultsAudience, "NONE">;
    note?: string | null;
    shareLink?: boolean;
    notify?: boolean;
  },
) {
  const { user, campaign } = await requireCampaignManageAccess(campaignId);

  const responses = await db.surveyResponse.count({ where: { campaignId } });
  if (responses === 0) {
    throw new Error("No hay respuestas que publicar");
  }

  const current = await db.surveyCampaign.findUniqueOrThrow({
    where: { id: campaignId },
    select: { resultsShareToken: true },
  });

  await db.surveyCampaign.update({
    where: { id: campaignId },
    data: {
      resultsAudience: input.audience,
      resultsPublishedAt: new Date(),
      resultsPublishedById: user.id,
      resultsNote: input.note?.trim() || null,
      resultsShareToken: input.shareLink
        ? (current.resultsShareToken ?? surveyToken())
        : null,
    },
  });

  if (input.notify !== false) {
    await notifyResultsPublished(campaignId);
  }

  revalidateCampaign(campaignId, campaign.surveyId);
  return { success: true };
}

/** Retira el consolidado publicado. Vuelve a ser visible sólo para Ibiza. */
export async function unpublishCampaignResults(campaignId: string) {
  const { campaign } = await requireCampaignManageAccess(campaignId);
  await db.surveyCampaign.update({
    where: { id: campaignId },
    data: {
      resultsAudience: "NONE",
      resultsPublishedAt: null,
      resultsPublishedById: null,
      resultsShareToken: null,
    },
  });
  revalidateCampaign(campaignId, campaign.surveyId);
  return { success: true };
}

/**
 * Miembros de una empresa para el selector de destinatarios concretos. Es una
 * acción y no una query directa porque el formulario de lanzamiento la pide
 * cuando el administrador cambia de empresa, ya en el cliente.
 */
export async function fetchCompanyMembers(companyId: string) {
  const user = await requireSurveyAdmin();
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, tenantId: true, leaderId: true },
  });
  if (!company) throw new Error("Empresa no encontrada");
  assertTenantScope(user, company.tenantId);

  const members = await db.user.findMany({
    where: { companyId: company.id, disabledAt: null },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true },
  });
  return {
    success: true,
    leaderId: company.leaderId,
    members,
  };
}

// ─── Respuesta del destinatario ──────────────────────────────────────────────

interface AnswerInput {
  questionId: string;
  ratingValue?: number | null;
  selectedOptionIndex?: number | null;
  text?: string | null;
  notApplicable?: boolean;
}

/** Tope del texto libre. Evita que una respuesta abierta llene la tabla. */
const MAX_TEXT_LENGTH = 2000;

interface AnswerRow {
  questionId: string;
  ratingValue: number | null;
  selectedOptionIndex: number | null;
  text: string | null;
  notApplicable: boolean;
}

/**
 * Valida que llegue exactamente una respuesta válida por pregunta. Se hace
 * en el servidor y no en el formulario porque la acción es alcanzable
 * directamente con el token.
 */
function buildAnswerRows(
  questions: Array<{
    id: string;
    type: SurveyQuestionType;
    options: unknown;
    allowNotApplicable: boolean;
  }>,
  answers: AnswerInput[] | undefined,
): AnswerRow[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const rows: AnswerRow[] = [];

  for (const answer of answers ?? []) {
    const q = byId.get(answer.questionId);
    if (!q) continue;
    if (seen.has(q.id)) throw new Error("Cada pregunta admite una sola respuesta");
    seen.add(q.id);

    if (q.type === "OPEN_TEXT") {
      const text = answer.text?.trim();
      rows.push({
        questionId: q.id,
        ratingValue: null,
        selectedOptionIndex: null,
        text: text ? text.slice(0, MAX_TEXT_LENGTH) : null,
        notApplicable: false,
      });
      continue;
    }

    if (q.type === "RATING_STARS") {
      const rating = Number(answer.ratingValue);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("Calificación inválida (1–5)");
      }
      rows.push({
        questionId: q.id,
        ratingValue: rating,
        selectedOptionIndex: null,
        text: null,
        notApplicable: false,
      });
      continue;
    }

    // MULTIPLE_CHOICE y SCALE_LABELED comparten almacenamiento.
    if (answer.notApplicable) {
      if (!q.allowNotApplicable) {
        throw new Error('Esta pregunta no admite "No aplica"');
      }
      rows.push({
        questionId: q.id,
        ratingValue: null,
        selectedOptionIndex: null,
        text: null,
        notApplicable: true,
      });
      continue;
    }

    const options = Array.isArray(q.options) ? q.options : [];
    const idx = Number(answer.selectedOptionIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
      throw new Error("Opción seleccionada inválida");
    }
    rows.push({
      questionId: q.id,
      ratingValue: null,
      selectedOptionIndex: idx,
      text: null,
      notApplicable: false,
    });
  }

  // El texto libre es opcional —el "Comentarios" del formulario en papel lo
  // es—, así que se completa en blanco si el respondiente lo dejó vacío. El
  // resto de preguntas sí son obligatorias.
  for (const q of questions) {
    if (seen.has(q.id) || q.type !== "OPEN_TEXT") continue;
    rows.push({
      questionId: q.id,
      ratingValue: null,
      selectedOptionIndex: null,
      text: null,
      notApplicable: false,
    });
    seen.add(q.id);
  }

  if (rows.length !== questions.length) {
    throw new Error("Responde todas las preguntas");
  }
  return rows;
}

async function persistResponse(input: {
  surveyId: string;
  campaignId: string;
  recipientId: string;
  email: string;
  companyId: string | null;
  companyName: string | null;
  rows: AnswerRow[];
}) {
  await db.$transaction(async (tx) => {
    const response = await tx.surveyResponse.create({
      data: {
        surveyId: input.surveyId,
        campaignId: input.campaignId,
        recipientId: input.recipientId,
        email: input.email,
        respondentCompanyId: input.companyId,
        respondentCompanyName: input.companyName,
      },
    });
    await tx.surveyAnswer.createMany({
      data: input.rows.map((a) => ({
        responseId: response.id,
        questionId: a.questionId,
        ratingValue: a.ratingValue,
        selectedOptionIndex: a.selectedOptionIndex,
        text: a.text,
        notApplicable: a.notApplicable,
      })),
    });
    await tx.surveyRecipient.update({
      where: { id: input.recipientId },
      data: { status: "RESPONDED", respondedAt: new Date() },
    });
  });
}

/**
 * Envío de respuesta con el enlace personal.
 *
 * El token es la única credencial: identifica al destinatario, ata la
 * respuesta a su lanzamiento y no da acceso a nada más. La ventana se
 * recalcula aquí, así que un lanzamiento vencido rechaza la respuesta aunque
 * el barrido de cierre no haya corrido.
 */
export async function submitSurveyResponseByToken(input: {
  token: string;
  answers: AnswerInput[];
}) {
  const token = input.token?.trim();
  if (!token) throw new Error("Encuesta no encontrada");

  const recipient = await db.surveyRecipient.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      status: true,
      campaign: {
        select: {
          id: true,
          status: true,
          opensAt: true,
          closesAt: true,
          companyId: true,
          company: { select: { id: true, name: true } },
          survey: {
            select: {
              id: true,
              questions: {
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  type: true,
                  options: true,
                  allowNotApplicable: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!recipient || recipient.status === "REVOKED") {
    throw new Error("Encuesta no encontrada");
  }
  if (recipient.status === "RESPONDED") {
    throw new Error("Ya respondiste esta encuesta");
  }

  const state = campaignState(recipient.campaign);
  if (state !== "OPEN") {
    throw new Error(
      state === "EXPIRED" || state === "CLOSED"
        ? "Esta encuesta ya venció y no acepta más respuestas"
        : "Esta encuesta todavía no está abierta",
    );
  }

  const rows = buildAnswerRows(recipient.campaign.survey.questions, input.answers);
  await persistResponse({
    surveyId: recipient.campaign.survey.id,
    campaignId: recipient.campaign.id,
    recipientId: recipient.id,
    email: recipient.email,
    companyId: recipient.campaign.company?.id ?? null,
    companyName: recipient.campaign.company?.name ?? null,
    rows,
  });

  revalidatePath("/dashboard/surveys");
  revalidatePath(`/tenant-admin/surveys/campaigns/${recipient.campaign.id}`);
  return { success: true };
}

/**
 * Envío de respuesta por el enlace compartible. El respondiente se identifica
 * con su correo y el sistema le crea su destinatario, de modo que sigue
 * habiendo una respuesta por persona y el vencimiento se aplica igual.
 */
export async function submitSurveyResponseByShareLink(input: {
  shareToken: string;
  email: string;
  name?: string | null;
  answers: AnswerInput[];
}) {
  const token = input.shareToken?.trim();
  if (!token) throw new Error("Encuesta no encontrada");

  const email = input.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Correo electrónico inválido");
  }

  const campaign = await db.surveyCampaign.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      status: true,
      opensAt: true,
      closesAt: true,
      company: { select: { id: true, name: true } },
      survey: {
        select: {
          id: true,
          questions: {
            orderBy: { position: "asc" },
            select: {
                  id: true,
                  type: true,
                  options: true,
                  allowNotApplicable: true,
                },
          },
        },
      },
    },
  });
  if (!campaign) throw new Error("Encuesta no encontrada");

  const state = campaignState(campaign);
  if (state !== "OPEN") {
    throw new Error(
      state === "EXPIRED" || state === "CLOSED"
        ? "Esta encuesta ya venció y no acepta más respuestas"
        : "Esta encuesta todavía no está abierta",
    );
  }

  const existing = await db.surveyRecipient.findUnique({
    where: { campaignId_email: { campaignId: campaign.id, email } },
    select: { id: true, status: true },
  });
  if (existing?.status === "RESPONDED") {
    throw new Error("Ya respondiste esta encuesta con este correo");
  }
  if (existing?.status === "REVOKED") {
    throw new Error("Este correo no está autorizado para responder");
  }

  const rows = buildAnswerRows(campaign.survey.questions, input.answers);

  const recipient =
    existing ??
    (await db.surveyRecipient.create({
      data: {
        campaignId: campaign.id,
        email,
        name: input.name?.trim() || null,
        token: surveyToken(),
        status: "SENT",
        sentAt: new Date(),
      },
      select: { id: true, status: true },
    }));

  await persistResponse({
    surveyId: campaign.survey.id,
    campaignId: campaign.id,
    recipientId: recipient.id,
    email,
    companyId: campaign.company?.id ?? null,
    companyName: campaign.company?.name ?? null,
    rows,
  });

  revalidatePath(`/tenant-admin/surveys/campaigns/${campaign.id}`);
  return { success: true };
}
