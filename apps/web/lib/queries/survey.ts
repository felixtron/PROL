// Lectura del módulo de Encuestas.
//
// Tres audiencias separadas a propósito, sin helpers compartidos entre ellas:
//   1. Administrador  → ve todo lo de SU tenant (respuestas incluidas).
//   2. Usuario cliente → solo lo que se le asignó y los consolidados que el
//                        administrador aprobó publicar. Nunca respuestas
//                        individuales ni datos de otra empresa.
//   3. Enlace por token → solo la encuesta que corresponde a ese token.

import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { requireSurveyAdmin, assertTenantScope } from "@/lib/survey-access";
import {
  aggregate,
  campaignState,
  describeCampaignContext,
  weightedIndex,
  type AggregatedResults,
  type CampaignState,
} from "@/lib/surveys";

// ─── Administrador: plantillas ───────────────────────────────────────────────

/** Filtro de tenant. SUPER_ADMIN sin tenant propio ve todo. */
function tenantFilter(user: { role: string; tenantId: string | null }) {
  if (user.role === "SUPER_ADMIN" && !user.tenantId) return {};
  return { tenantId: user.tenantId ?? "__none__" };
}

export const listSurveysForAdmin = cache(async () => {
  const user = await requireSurveyAdmin();
  return db.survey.findMany({
    where: tenantFilter(user),
    orderBy: { updatedAt: "desc" },
    include: {
      triggerCourse: { select: { id: true, title: true } },
      _count: { select: { questions: true, campaigns: true, responses: true } },
    },
  });
});

export const getSurveyForAdmin = cache(async (surveyId: string) => {
  const user = await requireSurveyAdmin();
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { position: "asc" } },
      triggerCourse: { select: { id: true, title: true } },
      professor: { select: { id: true, name: true, email: true } },
      campaigns: {
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { id: true, name: true } },
          course: { select: { id: true, title: true } },
          workshop: { select: { id: true, title: true } },
          advisorySession: { select: { id: true, title: true } },
          _count: { select: { recipients: true, responses: true } },
        },
      },
    },
  });
  if (!survey) throw new Error("Encuesta no encontrada");
  assertTenantScope(user, survey.tenantId);
  return survey;
});

/** Empresas del tenant a las que el administrador puede lanzar encuestas. */
export const listCompaniesForSurveyAdmin = cache(async () => {
  const user = await requireSurveyAdmin();
  return db.company.findMany({
    where: tenantFilter(user),
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      leaderId: true,
      _count: { select: { members: true } },
    },
  });
});

/** Cursos del tenant, para el contexto y el disparador automático. */
export const listCoursesForSurveyAdmin = cache(async () => {
  const user = await requireSurveyAdmin();
  return db.course.findMany({
    where: tenantFilter(user),
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
});

/** Workshops y sesiones de consultoría recientes, para el contexto. */
export const listEventsForSurveyAdmin = cache(async () => {
  const user = await requireSurveyAdmin();
  const where = tenantFilter(user);
  const [workshops, advisory] = await Promise.all([
    db.workshop.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: 100,
      select: { id: true, title: true, startTime: true },
    }),
    db.advisorySession.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: 100,
      select: { id: true, title: true, startTime: true },
    }),
  ]);
  return { workshops, advisory };
});

/**
 * Miembros de una empresa, para elegir destinatarios concretos. Comprueba el
 * tenant antes de devolver nombres: es la barrera que impide que el listado
 * de personas de una empresa se filtre a otro tenant.
 */
export async function listCompanyMembersForSurveyAdmin(companyId: string) {
  const user = await requireSurveyAdmin();
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, tenantId: true, leaderId: true, name: true },
  });
  if (!company) throw new Error("Empresa no encontrada");
  assertTenantScope(user, company.tenantId);

  const members = await db.user.findMany({
    where: { companyId: company.id, disabledAt: null },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true },
  });
  return {
    company: { id: company.id, name: company.name, leaderId: company.leaderId },
    members,
  };
}

// ─── Administrador: lanzamientos ─────────────────────────────────────────────

export const getCampaignForAdmin = cache(async (campaignId: string) => {
  const user = await requireSurveyAdmin();
  const campaign = await db.surveyCampaign.findUnique({
    where: { id: campaignId },
    include: {
      survey: {
        select: {
          id: true,
          title: true,
          description: true,
          questions: { orderBy: { position: "asc" } },
        },
      },
      company: { select: { id: true, name: true, leaderId: true } },
      course: { select: { id: true, title: true } },
      workshop: { select: { id: true, title: true } },
      advisorySession: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      resultsPublishedBy: { select: { id: true, name: true } },
      recipients: {
        orderBy: [{ status: "asc" }, { email: "asc" }],
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          sentAt: true,
          respondedAt: true,
          remindersSent: true,
          lastRemindedAt: true,
          token: true,
          userId: true,
        },
      },
    },
  });
  if (!campaign) throw new Error("Lanzamiento no encontrado");
  assertTenantScope(user, campaign.tenantId);
  return campaign;
});

/**
 * Resultados completos de un lanzamiento. Solo para el administrador: incluye
 * el conteo de destinatarios y la tasa de respuesta.
 */
export async function getCampaignResultsForAdmin(campaignId: string) {
  const user = await requireSurveyAdmin();
  const campaign = await db.surveyCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      status: true,
      opensAt: true,
      closesAt: true,
      resultsAudience: true,
      resultsPublishedAt: true,
      resultsNote: true,
      resultsShareToken: true,
      survey: {
        select: {
          id: true,
          title: true,
          description: true,
          questions: { orderBy: { position: "asc" } },
        },
      },
      company: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
      workshop: { select: { id: true, title: true } },
      advisorySession: { select: { id: true, title: true } },
      projectLabel: true,
      _count: { select: { responses: true } },
    },
  });
  if (!campaign) throw new Error("Lanzamiento no encontrado");
  assertTenantScope(user, campaign.tenantId);

  const [results, recipientCount] = await Promise.all([
    aggregateCampaign(campaign.id, campaign.survey.questions),
    db.surveyRecipient.count({
      where: { campaignId: campaign.id, status: { not: "REVOKED" } },
    }),
  ]);

  return {
    campaign,
    context: describeCampaignContext(campaign),
    state: campaignState(campaign),
    results,
    recipientCount,
    responseRate: recipientCount > 0 ? results.totalResponses / recipientCount : 0,
  };
}

/** Agregación de un lanzamiento a partir de las preguntas de su plantilla. */
async function aggregateCampaign(
  campaignId: string,
  questions: Array<{
    id: string;
    label: string;
    type: "RATING_STARS" | "MULTIPLE_CHOICE";
    section: string | null;
    weight: number;
    options: unknown;
    position: number;
  }>,
): Promise<AggregatedResults> {
  const [answers, totalResponses] = await Promise.all([
    db.surveyAnswer.findMany({
      where: { response: { campaignId } },
      select: {
        questionId: true,
        ratingValue: true,
        selectedOptionIndex: true,
      },
    }),
    db.surveyResponse.count({ where: { campaignId } }),
  ]);
  return aggregate(questions, answers, totalResponses);
}

// ─── Administrador: informe consolidado ──────────────────────────────────────

export interface SurveyReportFilters {
  surveyId?: string | null;
  companyId?: string | null;
  courseId?: string | null;
  from?: Date | null;
  to?: Date | null;
}

export interface SurveyReportRow {
  campaignId: string;
  campaignName: string;
  surveyId: string;
  surveyTitle: string;
  companyId: string | null;
  companyName: string | null;
  courseId: string | null;
  courseTitle: string | null;
  contextLine: string;
  closesAt: Date;
  state: CampaignState;
  totalResponses: number;
  recipientCount: number;
  responseRate: number;
  satisfactionIndex: number | null;
  sections: AggregatedResults["sections"];
}

export interface SurveyReportGroup {
  key: string;
  label: string;
  campaigns: number;
  totalResponses: number;
  satisfactionIndex: number | null;
}

/**
 * Informe consolidado: una fila por lanzamiento más agrupaciones por
 * encuesta, curso y empresa. El índice de cada grupo pondera por número de
 * respuestas, no por número de lanzamientos.
 */
export async function getSurveyReportForAdmin(filters: SurveyReportFilters = {}) {
  const user = await requireSurveyAdmin();

  const campaigns = await db.surveyCampaign.findMany({
    where: {
      ...tenantFilter(user),
      status: { in: ["ACTIVE", "CLOSED"] },
      ...(filters.surveyId ? { surveyId: filters.surveyId } : {}),
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.courseId ? { courseId: filters.courseId } : {}),
      ...(filters.from || filters.to
        ? {
            closesAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { closesAt: "desc" },
    take: 300,
    select: {
      id: true,
      name: true,
      status: true,
      opensAt: true,
      closesAt: true,
      projectLabel: true,
      survey: {
        select: {
          id: true,
          title: true,
          questions: { orderBy: { position: "asc" } },
        },
      },
      company: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
      workshop: { select: { title: true } },
      advisorySession: { select: { title: true } },
      _count: { select: { responses: true } },
    },
  });

  // Las respuestas y los destinatarios de TODAS las campañas del informe se
  // traen en dos consultas y se agrupan en memoria. Hacerlo campaña por
  // campaña costaba dos consultas por fila: con 300 lanzamientos el informe
  // disparaba 600 viajes a la base.
  const campaignIds = campaigns.map((c) => c.id);
  const [allAnswers, recipientCounts] = campaignIds.length
    ? await Promise.all([
        db.surveyAnswer.findMany({
          where: { response: { campaignId: { in: campaignIds } } },
          select: {
            questionId: true,
            ratingValue: true,
            selectedOptionIndex: true,
            response: { select: { campaignId: true } },
          },
        }),
        db.surveyRecipient.groupBy({
          by: ["campaignId"],
          where: { campaignId: { in: campaignIds }, status: { not: "REVOKED" } },
          _count: { _all: true },
        }),
      ])
    : [[], []];

  const answersByCampaign = new Map<
    string,
    Array<{ questionId: string; ratingValue: number | null; selectedOptionIndex: number | null }>
  >();
  for (const a of allAnswers) {
    const key = a.response.campaignId;
    if (!key) continue;
    const bucket = answersByCampaign.get(key);
    const row = {
      questionId: a.questionId,
      ratingValue: a.ratingValue,
      selectedOptionIndex: a.selectedOptionIndex,
    };
    if (bucket) bucket.push(row);
    else answersByCampaign.set(key, [row]);
  }
  const recipientsByCampaign = new Map(
    recipientCounts.map((r) => [r.campaignId, r._count._all]),
  );

  const rows: SurveyReportRow[] = [];
  for (const c of campaigns) {
    const results = aggregate(
      c.survey.questions,
      answersByCampaign.get(c.id) ?? [],
      c._count.responses,
    );
    const recipientCount = recipientsByCampaign.get(c.id) ?? 0;
    rows.push({
      campaignId: c.id,
      campaignName: c.name,
      surveyId: c.survey.id,
      surveyTitle: c.survey.title,
      companyId: c.company?.id ?? null,
      companyName: c.company?.name ?? null,
      courseId: c.course?.id ?? null,
      courseTitle: c.course?.title ?? null,
      contextLine: describeCampaignContext(c).line,
      closesAt: c.closesAt,
      state: campaignState(c),
      totalResponses: results.totalResponses,
      recipientCount,
      responseRate: recipientCount > 0 ? results.totalResponses / recipientCount : 0,
      satisfactionIndex: results.satisfactionIndex,
      sections: results.sections,
    });
  }

  const groupBy = (
    keyOf: (r: SurveyReportRow) => { key: string; label: string } | null,
  ): SurveyReportGroup[] => {
    const map = new Map<string, { label: string; rows: SurveyReportRow[] }>();
    for (const r of rows) {
      const k = keyOf(r);
      if (!k) continue;
      const entry = map.get(k.key);
      if (entry) entry.rows.push(r);
      else map.set(k.key, { label: k.label, rows: [r] });
    }
    return [...map.entries()]
      .map(([key, v]) => ({
        key,
        label: v.label,
        campaigns: v.rows.length,
        totalResponses: v.rows.reduce((n, r) => n + r.totalResponses, 0),
        satisfactionIndex: weightedIndex(v.rows),
      }))
      .sort((a, b) => b.totalResponses - a.totalResponses);
  };

  return {
    rows,
    overallIndex: weightedIndex(rows),
    totalResponses: rows.reduce((n, r) => n + r.totalResponses, 0),
    bySurvey: groupBy((r) => ({ key: r.surveyId, label: r.surveyTitle })),
    byCompany: groupBy((r) =>
      r.companyId ? { key: r.companyId, label: r.companyName ?? "—" } : null,
    ),
    byCourse: groupBy((r) =>
      r.courseId ? { key: r.courseId, label: r.courseTitle ?? "—" } : null,
    ),
  };
}

// ─── Usuario cliente: encuestas asignadas ────────────────────────────────────

/**
 * Encuestas que le tocan al usuario actual. Solo mira sus propias filas de
 * destinatario, así que nunca puede alcanzar las de otra persona ni las de
 * otra empresa.
 */
export const listMySurveyInvitations = cache(async () => {
  const user = await requireUser();
  const recipients = await db.surveyRecipient.findMany({
    where: { userId: user.id, status: { not: "REVOKED" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      status: true,
      respondedAt: true,
      campaign: {
        select: {
          id: true,
          name: true,
          status: true,
          opensAt: true,
          closesAt: true,
          projectLabel: true,
          resultsAudience: true,
          resultsPublishedAt: true,
          survey: { select: { id: true, title: true, description: true } },
          company: { select: { id: true, name: true } },
          course: { select: { id: true, title: true } },
          workshop: { select: { title: true } },
          advisorySession: { select: { title: true } },
        },
      },
    },
  });

  const now = new Date();
  return recipients
    .filter((r) => r.campaign.status !== "DRAFT" && r.campaign.status !== "CANCELLED")
    .map((r) => {
      const state = campaignState(r.campaign, now);
      const answered = r.status === "RESPONDED";
      return {
        recipientId: r.id,
        token: r.token,
        answered,
        respondedAt: r.respondedAt,
        campaignId: r.campaign.id,
        title: r.campaign.survey.title,
        description: r.campaign.survey.description,
        context: describeCampaignContext(r.campaign),
        closesAt: r.campaign.closesAt,
        opensAt: r.campaign.opensAt,
        state,
        canAnswer: !answered && state === "OPEN",
        // El consolidado solo aparece cuando el administrador lo publicó
        // para los participantes.
        resultsAvailable:
          r.campaign.resultsPublishedAt !== null &&
          r.campaign.resultsAudience === "PARTICIPANTS",
      };
    });
});

/**
 * Consolidados publicados que el líder de una empresa puede consultar. Se
 * limita a las campañas de SU empresa y solo a las que el administrador
 * aprobó publicar.
 */
export const listPublishedResultsForLeader = cache(async (companyId: string) => {
  const user = await requireUser();
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, leaderId: true },
  });
  if (!company || company.leaderId !== user.id) return [];

  const campaigns = await db.surveyCampaign.findMany({
    where: {
      companyId: company.id,
      resultsPublishedAt: { not: null },
      resultsAudience: { in: ["LEADER", "PARTICIPANTS"] },
    },
    orderBy: { resultsPublishedAt: "desc" },
    select: {
      id: true,
      name: true,
      closesAt: true,
      resultsPublishedAt: true,
      projectLabel: true,
      survey: { select: { id: true, title: true } },
      company: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
      workshop: { select: { title: true } },
      advisorySession: { select: { title: true } },
      _count: { select: { responses: true } },
    },
  });

  return campaigns.map((c) => ({
    campaignId: c.id,
    name: c.name,
    title: c.survey.title,
    context: describeCampaignContext(c),
    closesAt: c.closesAt,
    publishedAt: c.resultsPublishedAt,
    totalResponses: c._count.responses,
  }));
});

/**
 * Consolidado publicado, tal y como lo ve un usuario cliente.
 *
 * Devuelve SOLO agregados: ni una respuesta individual, ni un correo, ni el
 * nombre de un respondiente. El acceso exige que (a) el administrador haya
 * publicado, y (b) el usuario sea el líder de la empresa del lanzamiento o
 * un destinatario del propio lanzamiento cuando la publicación llega a
 * participantes.
 */
export async function getPublishedResultsForCurrentUser(campaignId: string) {
  const user = await requireUser();
  const campaign = await db.surveyCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      tenantId: true,
      status: true,
      opensAt: true,
      closesAt: true,
      projectLabel: true,
      resultsAudience: true,
      resultsPublishedAt: true,
      resultsNote: true,
      survey: {
        select: {
          id: true,
          title: true,
          description: true,
          questions: { orderBy: { position: "asc" } },
        },
      },
      company: { select: { id: true, name: true, leaderId: true } },
      course: { select: { id: true, title: true } },
      workshop: { select: { title: true } },
      advisorySession: { select: { title: true } },
    },
  });
  if (!campaign) return null;
  if (!campaign.resultsPublishedAt || campaign.resultsAudience === "NONE") {
    return null;
  }
  // Aislamiento entre tenants: aunque el id se adivinara, el usuario tiene
  // que pertenecer al mismo tenant.
  if (user.tenantId !== campaign.tenantId) return null;

  const isLeader =
    campaign.company?.leaderId === user.id && campaign.company !== null;
  let isParticipant = false;
  if (!isLeader && campaign.resultsAudience === "PARTICIPANTS") {
    const recipient = await db.surveyRecipient.findFirst({
      where: { campaignId: campaign.id, userId: user.id, status: { not: "REVOKED" } },
      select: { id: true },
    });
    isParticipant = recipient !== null;
  }
  if (!isLeader && !isParticipant) return null;

  const results = await aggregateCampaign(campaign.id, campaign.survey.questions);
  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      title: campaign.survey.title,
      description: campaign.survey.description,
      closesAt: campaign.closesAt,
      publishedAt: campaign.resultsPublishedAt,
      note: campaign.resultsNote,
    },
    context: describeCampaignContext(campaign),
    results,
  };
}

// ─── Acceso por token ────────────────────────────────────────────────────────

/**
 * Datos que necesita la página de respuesta. El token identifica al
 * destinatario: no da acceso a resultados, ni a otras encuestas, ni a nada
 * administrativo.
 */
export async function getRespondentByToken(token: string) {
  if (!token) return null;
  const recipient = await db.surveyRecipient.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      respondedAt: true,
      campaign: {
        select: {
          id: true,
          name: true,
          status: true,
          opensAt: true,
          closesAt: true,
          projectLabel: true,
          tenant: {
            select: { name: true, primaryColor: true, accentColor: true },
          },
          survey: {
            select: {
              id: true,
              title: true,
              description: true,
              questions: {
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  type: true,
                  label: true,
                  section: true,
                  options: true,
                  position: true,
                },
              },
            },
          },
          company: { select: { name: true } },
          course: { select: { title: true } },
          workshop: { select: { title: true } },
          advisorySession: { select: { title: true } },
        },
      },
    },
  });
  if (!recipient) return null;
  if (recipient.status === "REVOKED") return null;

  return {
    recipient: {
      id: recipient.id,
      email: recipient.email,
      name: recipient.name,
      answered: recipient.status === "RESPONDED",
      respondedAt: recipient.respondedAt,
    },
    campaign: recipient.campaign,
    context: describeCampaignContext(recipient.campaign),
    state: campaignState(recipient.campaign),
    tenantName: recipient.campaign.tenant.name,
  };
}

/**
 * Lanzamiento accesible por enlace compartible. Se usa cuando el
 * administrador habilita el link abierto: el respondiente se identifica con
 * su correo y el sistema le crea su propio destinatario.
 */
export async function getCampaignByShareToken(token: string) {
  if (!token) return null;
  const campaign = await db.surveyCampaign.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      name: true,
      status: true,
      opensAt: true,
      closesAt: true,
      projectLabel: true,
      tenant: { select: { name: true } },
      survey: {
        select: {
          id: true,
          title: true,
          description: true,
          questions: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              type: true,
              label: true,
              section: true,
              options: true,
              position: true,
            },
          },
        },
      },
      company: { select: { name: true } },
      course: { select: { title: true } },
      workshop: { select: { title: true } },
      advisorySession: { select: { title: true } },
    },
  });
  if (!campaign) return null;
  return {
    campaign,
    context: describeCampaignContext(campaign),
    state: campaignState(campaign),
    tenantName: campaign.tenant.name,
  };
}

/**
 * Consolidado por enlace de solo lectura. Exige que el administrador haya
 * aprobado la publicación: un token vivo sobre una campaña sin publicar no
 * devuelve nada.
 */
export async function getPublishedResultsByShareToken(token: string) {
  if (!token) return null;
  const campaign = await db.surveyCampaign.findUnique({
    where: { resultsShareToken: token },
    select: {
      id: true,
      name: true,
      closesAt: true,
      projectLabel: true,
      resultsAudience: true,
      resultsPublishedAt: true,
      resultsNote: true,
      survey: {
        select: {
          id: true,
          title: true,
          description: true,
          questions: { orderBy: { position: "asc" } },
        },
      },
      company: { select: { name: true } },
      course: { select: { title: true } },
      workshop: { select: { title: true } },
      advisorySession: { select: { title: true } },
    },
  });
  if (!campaign) return null;
  if (!campaign.resultsPublishedAt || campaign.resultsAudience === "NONE") {
    return null;
  }
  const results = await aggregateCampaign(campaign.id, campaign.survey.questions);
  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      title: campaign.survey.title,
      description: campaign.survey.description,
      closesAt: campaign.closesAt,
      publishedAt: campaign.resultsPublishedAt,
      note: campaign.resultsNote,
    },
    context: describeCampaignContext(campaign),
    results,
  };
}
