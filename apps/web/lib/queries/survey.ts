import { cache } from "react";
import { db, type SurveyQuestionType } from "@prol/db";
import { requireUser, getCompanyLed } from "@/lib/auth";

const AUTHOR_ROLES = new Set(["PROFESSOR", "ADMIN", "SUPER_ADMIN"]);

/**
 * Surveys visible to the current user. PROFESSOR/ADMIN see every survey in
 * their tenant; SUPER_ADMIN sees every survey; a STUDENT only sees the
 * surveys scoped to the company they lead (if any).
 */
export const listSurveysForCurrentUser = cache(async () => {
  const user = await requireUser();
  const include = {
    company: { select: { id: true, name: true, slug: true } },
    professor: { select: { id: true, name: true, email: true } },
    _count: { select: { questions: true, responses: true } },
  } as const;

  if (user.role === "SUPER_ADMIN") {
    return db.survey.findMany({ orderBy: { createdAt: "desc" }, include });
  }
  if (AUTHOR_ROLES.has(user.role)) {
    if (!user.tenantId) return [];
    return db.survey.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
      include,
    });
  }
  if (user.role === "STUDENT") {
    const company = await getCompanyLed(user.id);
    if (!company) return [];
    return db.survey.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include,
    });
  }
  return [];
});

/** Back-compat alias used by the professor pages. */
export const listSurveysForTenant = listSurveysForCurrentUser;

/**
 * Detailed view of a single survey with questions and assigned company.
 * Authz: author of the survey's tenant OR leader of the survey's company.
 */
export const getSurveyDetail = cache(async (surveyId: string) => {
  const user = await requireUser();
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    include: {
      company: { select: { id: true, name: true, slug: true, leaderId: true } },
      professor: { select: { id: true, name: true, email: true } },
      questions: { orderBy: { position: "asc" } },
      _count: { select: { responses: true } },
    },
  });
  if (!survey) throw new Error("Encuesta no encontrada");

  const isAuthor =
    AUTHOR_ROLES.has(user.role) &&
    (user.role === "SUPER_ADMIN" || survey.tenantId === user.tenantId);
  const isLeader =
    user.role === "STUDENT" && survey.company.leaderId === user.id;
  if (!isAuthor && !isLeader) {
    throw new Error("No autorizado");
  }
  return survey;
});

/**
 * Companies the current user can assign a survey to. Authors see every
 * company in the tenant; a STUDENT leader can only assign surveys to the
 * single company they lead.
 */
export const listCompaniesForSurveyAssignment = cache(async () => {
  const user = await requireUser();
  if (user.role === "STUDENT") {
    const company = await getCompanyLed(user.id);
    if (!company) return [];
    return [{ id: company.id, name: company.name, slug: company.slug }];
  }
  if (!AUTHOR_ROLES.has(user.role) || !user.tenantId) return [];
  return db.company.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
});

// ─── Public access (no auth) ─────────────────────────────────────────────────

/**
 * Load a survey for the public respondent page. Returns minimal data — no
 * professor, no internal ids of the company beyond what's needed for the
 * form. Throws if the survey isn't PUBLISHED, so an unauthenticated visitor
 * can't probe DRAFT surveys.
 */
export async function getSurveyByPublicSlug(slug: string) {
  if (!slug) return null;
  const survey = await db.survey.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      tenantId: true,
      tenant: {
        select: {
          name: true,
          primaryColor: true,
          accentColor: true,
          companies: {
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          },
        },
      },
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          type: true,
          label: true,
          options: true,
          position: true,
        },
      },
    },
  });
  if (!survey || survey.status !== "PUBLISHED") return null;
  return survey;
}

/**
 * Load aggregated results for a survey via its share token. Used by the
 * public `/surveys/results/[token]` page that the professor or leader
 * shares with stakeholders who don't have a login.
 */
export async function getSurveyResultsByToken(token: string) {
  if (!token) return null;
  const survey = await db.survey.findUnique({
    where: { resultsShareToken: token },
    select: { id: true },
  });
  if (!survey) return null;
  return getSurveyAggregatedResults(survey.id);
}

export interface SurveyAggregatedResults {
  surveyId: string;
  title: string;
  description: string | null;
  companyName: string;
  totalResponses: number;
  questions: Array<{
    id: string;
    label: string;
    type: SurveyQuestionType;
    options: string[];
    answeredCount: number;
    average: number | null;
    distribution: number[];
  }>;
}

/**
 * Compute per-question aggregates: average for ratings, distribution counts
 * for both ratings (5 buckets) and multiple choice (one bucket per option).
 * Runs the aggregation in SQL when possible to keep the page snappy for
 * surveys with many responses.
 */
export async function getSurveyAggregatedResults(
  surveyId: string,
): Promise<SurveyAggregatedResults | null> {
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    select: {
      id: true,
      title: true,
      description: true,
      company: { select: { name: true } },
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          label: true,
          type: true,
          options: true,
        },
      },
      _count: { select: { responses: true } },
    },
  });
  if (!survey) return null;

  const questionIds = survey.questions.map((q) => q.id);
  const answers = questionIds.length
    ? await db.surveyAnswer.findMany({
        where: { questionId: { in: questionIds } },
        select: {
          questionId: true,
          ratingValue: true,
          selectedOptionIndex: true,
        },
      })
    : [];

  const byQuestion = new Map<string, typeof answers>();
  for (const a of answers) {
    const bucket = byQuestion.get(a.questionId) ?? [];
    bucket.push(a);
    byQuestion.set(a.questionId, bucket);
  }

  return {
    surveyId: survey.id,
    title: survey.title,
    description: survey.description,
    companyName: survey.company.name,
    totalResponses: survey._count.responses,
    questions: survey.questions.map((q) => {
      const rows = byQuestion.get(q.id) ?? [];
      const options = Array.isArray(q.options)
        ? (q.options as unknown[]).filter((o): o is string => typeof o === "string")
        : [];

      if (q.type === "RATING_STARS") {
        const ratings = rows
          .map((r) => r.ratingValue)
          .filter((v): v is number => typeof v === "number");
        const distribution = [0, 0, 0, 0, 0];
        let sum = 0;
        for (const v of ratings) {
          sum += v;
          if (v >= 1 && v <= 5) distribution[v - 1]! += 1;
        }
        return {
          id: q.id,
          label: q.label,
          type: q.type,
          options: [],
          answeredCount: ratings.length,
          average: ratings.length ? sum / ratings.length : null,
          distribution,
        };
      }

      // MULTIPLE_CHOICE
      const distribution = new Array(options.length).fill(0) as number[];
      let answered = 0;
      for (const r of rows) {
        const idx = r.selectedOptionIndex;
        if (typeof idx === "number" && idx >= 0 && idx < distribution.length) {
          distribution[idx]! += 1;
          answered += 1;
        }
      }
      return {
        id: q.id,
        label: q.label,
        type: q.type,
        options,
        answeredCount: answered,
        average: null,
        distribution,
      };
    }),
  };
}
