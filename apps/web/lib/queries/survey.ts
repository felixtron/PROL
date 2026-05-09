import { cache } from "react";
import { db } from "@prol/db";
import { requireSurveyAuthor } from "@/lib/auth";

/** List all surveys for the current user's tenant, with response count. */
export const listSurveysForTenant = cache(async () => {
  const user = await requireSurveyAuthor();
  if (!user.tenantId) return [];
  return db.survey.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true, slug: true } },
      professor: { select: { id: true, name: true, email: true } },
      _count: { select: { questions: true, responses: true } },
    },
  });
});

/** Detailed view of a single survey with questions and assigned company.
 *  Authz: same-tenant or SUPER_ADMIN. */
export const getSurveyDetail = cache(async (surveyId: string) => {
  const user = await requireSurveyAuthor();
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
  if (user.role !== "SUPER_ADMIN" && survey.tenantId !== user.tenantId) {
    throw new Error("No autorizado");
  }
  return survey;
});

/** All companies in the current tenant — used by the create/edit form
 *  to populate the "Empresa asignada" dropdown. */
export const listCompaniesForSurveyAssignment = cache(async () => {
  const user = await requireSurveyAuthor();
  if (!user.tenantId) return [];
  return db.company.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
});
