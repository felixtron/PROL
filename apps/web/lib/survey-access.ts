// Autorización centralizada del módulo de Encuestas.
//
// Regla única: las encuestas las administra SOLO el administrador del tenant
// (ADMIN, o SUPER_ADMIN por encima de todos). Crear, editar, publicar,
// enviar, cerrar, consultar respuestas y aprobar la publicación de
// resultados pasan todos por aquí.
//
// Los usuarios cliente (STUDENT, incluido el líder de una empresa) NO tienen
// ninguna capacidad de administración: solo responden lo que se les asigna
// —mediante su enlace personal o su panel— y ven el consolidado cuando el
// administrador aprueba publicarlo. Esas dos rutas viven en
// `lib/queries/survey.ts` y no reutilizan estos helpers.

import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

/** Roles que administran encuestas. Ningún otro rol entra. */
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export type SurveyAdmin = Awaited<ReturnType<typeof requireUser>>;

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

/**
 * El llamador debe ser administrador del tenant y el módulo debe estar
 * habilitado. Base de todo lo demás en el módulo.
 */
export async function requireSurveyAdmin(): Promise<SurveyAdmin> {
  const user = await requireUser();
  if (!ADMIN_ROLES.has(user.role)) {
    throw new Error("No autorizado: solo el administrador gestiona encuestas");
  }
  if (user.role !== "SUPER_ADMIN") {
    if (!user.tenantId) throw new Error("No autorizado: tenant requerido");
    await assertSurveysEnabled(user.tenantId, user.role);
  }
  return user;
}

/**
 * Tenant sobre el que opera el administrador. Un SUPER_ADMIN sin tenant
 * propio trabaja sobre el tenant del recurso que está tocando; para crear
 * desde cero necesita tener un tenant asignado o indicarlo explícitamente.
 */
export function resolveAdminTenantId(
  user: SurveyAdmin,
  explicitTenantId?: string | null,
): string {
  if (user.role === "SUPER_ADMIN") {
    const id = explicitTenantId ?? user.tenantId;
    if (!id) throw new Error("Indica el tenant de la encuesta");
    return id;
  }
  if (!user.tenantId) throw new Error("No autorizado: tenant requerido");
  if (explicitTenantId && explicitTenantId !== user.tenantId) {
    throw new Error("No autorizado: tenant no coincide");
  }
  return user.tenantId;
}

/** Lanza si el recurso pertenece a otro tenant (SUPER_ADMIN exento). */
export function assertTenantScope(
  user: SurveyAdmin,
  resourceTenantId: string,
): void {
  if (user.role === "SUPER_ADMIN") return;
  if (!user.tenantId || user.tenantId !== resourceTenantId) {
    throw new Error("No autorizado: tenant no coincide");
  }
}

export interface SurveyManageContext {
  user: SurveyAdmin;
  survey: {
    id: string;
    tenantId: string;
    status: string;
    title: string;
  };
}

/** Carga la plantilla y comprueba que el administrador puede tocarla. */
export async function requireSurveyManageAccess(
  surveyId: string,
): Promise<SurveyManageContext> {
  const user = await requireSurveyAdmin();
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    select: { id: true, tenantId: true, status: true, title: true },
  });
  if (!survey) throw new Error("Encuesta no encontrada");
  assertTenantScope(user, survey.tenantId);
  await assertSurveysEnabled(survey.tenantId, user.role);
  return { user, survey };
}

export interface CampaignManageContext {
  user: SurveyAdmin;
  campaign: {
    id: string;
    tenantId: string;
    surveyId: string;
    status: string;
    companyId: string | null;
    closesAt: Date;
    opensAt: Date;
  };
}

/** Carga el lanzamiento y comprueba que el administrador puede tocarlo. */
export async function requireCampaignManageAccess(
  campaignId: string,
): Promise<CampaignManageContext> {
  const user = await requireSurveyAdmin();
  const campaign = await db.surveyCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      tenantId: true,
      surveyId: true,
      status: true,
      companyId: true,
      closesAt: true,
      opensAt: true,
    },
  });
  if (!campaign) throw new Error("Lanzamiento no encontrado");
  assertTenantScope(user, campaign.tenantId);
  await assertSurveysEnabled(campaign.tenantId, user.role);
  return { user, campaign };
}

/**
 * Comprueba que una empresa existe y pertenece al tenant sobre el que opera
 * el administrador. Es la barrera que impide construir un lanzamiento con la
 * empresa de otro tenant.
 */
export async function requireCompanyInTenant(
  user: SurveyAdmin,
  companyId: string,
  tenantId: string,
): Promise<{ id: string; name: string; tenantId: string; leaderId: string | null }> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, tenantId: true, leaderId: true },
  });
  if (!company) throw new Error("Empresa no encontrada");
  if (company.tenantId !== tenantId) {
    throw new Error("No autorizado: la empresa pertenece a otro tenant");
  }
  assertTenantScope(user, company.tenantId);
  return company;
}
