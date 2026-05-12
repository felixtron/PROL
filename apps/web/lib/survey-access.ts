// Centralised authorization for the surveys module. Two roles can author
// and inspect surveys: (a) the regular survey author (PROFESSOR/ADMIN of
// the tenant, or SUPER_ADMIN), and (b) the STUDENT designated as leader of
// the company a given survey is scoped to. These helpers resolve the
// caller's permissions in one place so the rest of the module can simply
// ask "can this user edit this survey?" without re-implementing the rules.

import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

const AUTHOR_ROLES = new Set(["PROFESSOR", "ADMIN", "SUPER_ADMIN"]);

async function assertSurveysEnabled(
  tenantId: string,
  userRole: string,
): Promise<void> {
  if (userRole === "SUPER_ADMIN") return;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { surveysEnabled: true },
  });
  if (!tenant?.surveysEnabled) {
    throw new Error("Encuestas no están habilitadas para este tenant");
  }
}

export type SurveyAccessRole = "AUTHOR" | "LEADER";

export interface SurveyAccessContext {
  user: Awaited<ReturnType<typeof requireUser>>;
  survey: {
    id: string;
    tenantId: string;
    companyId: string;
    professorId: string;
    company: { id: string; tenantId: string; leaderId: string | null };
  };
  /** How the caller earned access — useful for UI/audit decisions. */
  role: SurveyAccessRole;
}

/**
 * Loads the survey and asserts the current user is allowed to edit it. A
 * caller is "author" if they belong to the survey's tenant with role
 * PROFESSOR/ADMIN/SUPER_ADMIN; they are "leader" if they are the STUDENT
 * designated as company.leaderId of the survey's assigned company.
 */
export async function requireSurveyEditAccess(
  surveyId: string,
): Promise<SurveyAccessContext> {
  const user = await requireUser();
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    select: {
      id: true,
      tenantId: true,
      companyId: true,
      professorId: true,
      company: { select: { id: true, tenantId: true, leaderId: true } },
    },
  });
  if (!survey) throw new Error("Encuesta no encontrada");

  await assertSurveysEnabled(survey.tenantId, user.role);

  const isAuthor =
    AUTHOR_ROLES.has(user.role) &&
    (user.role === "SUPER_ADMIN" || user.tenantId === survey.tenantId);
  const isLeader =
    user.role === "STUDENT" && survey.company.leaderId === user.id;

  if (!isAuthor && !isLeader) {
    throw new Error("No autorizado");
  }
  return { user, survey, role: isAuthor ? "AUTHOR" : "LEADER" };
}

/**
 * For survey creation: the caller must either be an author (any company in
 * the tenant) OR the leader of the *specific* company they're assigning the
 * survey to. Leaders cannot create surveys for other companies.
 */
export async function requireSurveyCreateAccess(
  companyId: string,
): Promise<{
  user: Awaited<ReturnType<typeof requireUser>>;
  company: { id: string; tenantId: string };
  role: SurveyAccessRole;
}> {
  const user = await requireUser();
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, tenantId: true, leaderId: true },
  });
  if (!company) throw new Error("Empresa no encontrada");

  await assertSurveysEnabled(company.tenantId, user.role);

  const isAuthor =
    AUTHOR_ROLES.has(user.role) &&
    (user.role === "SUPER_ADMIN" || user.tenantId === company.tenantId);
  const isLeader =
    user.role === "STUDENT" && company.leaderId === user.id;

  if (!isAuthor && !isLeader) {
    throw new Error("No autorizado");
  }
  return { user, company, role: isAuthor ? "AUTHOR" : "LEADER" };
}
