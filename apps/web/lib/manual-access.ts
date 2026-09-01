// Autorización centralizada del módulo de Gestión Documental y Evidencias.
//
// Tres círculos, de fuera hacia dentro:
//
//   AUTORÍA (ADMIN, SUPER_ADMIN) — escribir manuales, subir plantillas base y
//   activar un manual para una empresa. Es contenido del tenant, no del
//   cliente, así que el consultor-profesor no entra aquí.
//
//   REVISIÓN (+ PROFESSOR) — revisar, aprobar, pedir correcciones y ver la
//   agenda de todas las empresas. El consultor que acompaña al cliente puede
//   tener cuenta de profesor o de administrador, y ambas deben poder revisar.
//   Sólo el administrador resuelve una eliminación.
//
//   CLIENTE (líder y miembros de la empresa) — leer su manual, marcar avance,
//   descargar plantillas, entregar evidencias. El líder además supervisa todas
//   las evidencias de su empresa y puede solicitar una eliminación, que nunca
//   ejecuta él. Estas rutas viven abajo, separadas de las de gestión.

import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

/** Roles que escriben el contenido del manual y lo activan por empresa. */
const MANAGE_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/** Roles que revisan evidencias. Añadir un rol revisor se hace aquí. */
const REVIEW_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PROFESSOR"]);

export type ManualUser = Awaited<ReturnType<typeof requireUser>>;

export async function assertDocumentsEnabled(
  tenantId: string,
  userRole: string,
): Promise<void> {
  if (userRole === "SUPER_ADMIN") return;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { documentsEnabled: true },
  });
  if (!tenant?.documentsEnabled) {
    throw new Error("La gestión documental no está habilitada para este tenant");
  }
}

/** Autoría de manuales: administrador del tenant y módulo habilitado. */
export async function requireManualAdmin(): Promise<ManualUser> {
  const user = await requireUser();
  if (!MANAGE_ROLES.has(user.role)) {
    throw new Error("No autorizado: solo el administrador gestiona manuales");
  }
  if (user.role !== "SUPER_ADMIN") {
    if (!user.tenantId) throw new Error("No autorizado: tenant requerido");
    await assertDocumentsEnabled(user.tenantId, user.role);
  }
  return user;
}

/** Revisión de evidencias: administrador o consultor (profesor) del tenant. */
export async function requireManualReviewer(): Promise<ManualUser> {
  const user = await requireUser();
  if (!REVIEW_ROLES.has(user.role)) {
    throw new Error("No autorizado: solo el consultor revisa evidencias");
  }
  if (user.role !== "SUPER_ADMIN") {
    if (!user.tenantId) throw new Error("No autorizado: tenant requerido");
    await assertDocumentsEnabled(user.tenantId, user.role);
  }
  return user;
}

export function isManualAdmin(user: { role: string }): boolean {
  return MANAGE_ROLES.has(user.role);
}

export function isManualReviewer(user: { role: string }): boolean {
  return REVIEW_ROLES.has(user.role);
}

/**
 * Tenant sobre el que opera el administrador. Un SUPER_ADMIN sin tenant
 * propio trabaja sobre el tenant del recurso que está tocando; para crear
 * desde cero necesita tener un tenant asignado o indicarlo explícitamente.
 */
export function resolveAdminTenantId(
  user: ManualUser,
  explicitTenantId?: string | null,
): string {
  if (user.role === "SUPER_ADMIN") {
    const id = explicitTenantId ?? user.tenantId;
    if (!id) throw new Error("Indica el tenant del manual");
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
  user: ManualUser,
  resourceTenantId: string,
): void {
  if (user.role === "SUPER_ADMIN") return;
  if (!user.tenantId || user.tenantId !== resourceTenantId) {
    throw new Error("No autorizado: tenant no coincide");
  }
}

/**
 * Filtro de tenant para listados de gestión. El centinela deja el listado
 * vacío en vez de devolverlo sin filtrar si el tenant faltara.
 */
export function manualTenantFilter(user: ManualUser): { tenantId?: string } {
  if (user.role === "SUPER_ADMIN" && !user.tenantId) return {};
  return { tenantId: user.tenantId ?? "__none__" };
}

export interface ManualManageContext {
  user: ManualUser;
  manual: {
    id: string;
    tenantId: string;
    status: string;
    title: string;
  };
}

/** Carga el manual y comprueba que el administrador puede tocarlo. */
export async function requireManualManageAccess(
  manualId: string,
): Promise<ManualManageContext> {
  const user = await requireManualAdmin();
  const manual = await db.manual.findUnique({
    where: { id: manualId },
    select: { id: true, tenantId: true, status: true, title: true },
  });
  if (!manual) throw new Error("Manual no encontrado");
  assertTenantScope(user, manual.tenantId);
  await assertDocumentsEnabled(manual.tenantId, user.role);
  return { user, manual };
}

export interface SectionManageContext extends ManualManageContext {
  section: { id: string; title: string; chapterId: string };
}

/** Carga sección → capítulo → manual y comprueba el alcance de tenant. */
export async function requireSectionManageAccess(
  sectionId: string,
): Promise<SectionManageContext> {
  const user = await requireManualAdmin();
  const section = await db.manualSection.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      title: true,
      chapterId: true,
      chapter: {
        select: {
          manual: {
            select: { id: true, tenantId: true, status: true, title: true },
          },
        },
      },
    },
  });
  if (!section) throw new Error("Sección no encontrada");
  const manual = section.chapter.manual;
  assertTenantScope(user, manual.tenantId);
  await assertDocumentsEnabled(manual.tenantId, user.role);
  return {
    user,
    manual,
    section: { id: section.id, title: section.title, chapterId: section.chapterId },
  };
}

export interface AssignmentManageContext {
  user: ManualUser;
  assignment: {
    id: string;
    tenantId: string;
    manualId: string;
    companyId: string;
    status: string;
    consultantId: string | null;
  };
}

/**
 * Carga la activación de una empresa para gestión (plantillas
 * personalizadas, panel por empresa, actividades). Abierta a revisores: el
 * consultor necesita el panel de su cliente aunque no escriba el manual.
 */
export async function requireAssignmentManageAccess(
  assignmentId: string,
): Promise<AssignmentManageContext> {
  const user = await requireManualReviewer();
  const assignment = await db.manualAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      tenantId: true,
      manualId: true,
      companyId: true,
      status: true,
      consultantId: true,
    },
  });
  if (!assignment) throw new Error("Activación no encontrada");
  assertTenantScope(user, assignment.tenantId);
  await assertDocumentsEnabled(assignment.tenantId, user.role);
  return { user, assignment };
}

export interface EvidenceReviewContext {
  user: ManualUser;
  evidence: {
    id: string;
    status: string;
    activityId: string;
    assignmentId: string;
    version: number;
    deletedAt: Date | null;
    assignment: { tenantId: string; companyId: string; consultantId: string | null };
  };
}

/** Carga la evidencia y comprueba que el revisor puede resolverla. */
export async function requireEvidenceReviewAccess(
  evidenceId: string,
): Promise<EvidenceReviewContext> {
  const user = await requireManualReviewer();
  const evidence = await db.evidence.findUnique({
    where: { id: evidenceId },
    select: {
      id: true,
      status: true,
      activityId: true,
      assignmentId: true,
      version: true,
      deletedAt: true,
      assignment: {
        select: { tenantId: true, companyId: true, consultantId: true },
      },
    },
  });
  if (!evidence) throw new Error("Evidencia no encontrada");
  assertTenantScope(user, evidence.assignment.tenantId);
  await assertDocumentsEnabled(evidence.assignment.tenantId, user.role);
  return { user, evidence };
}

/**
 * Comprueba que una empresa existe y pertenece al tenant sobre el que opera
 * el administrador. Es la barrera que impide activar un manual contra la
 * empresa de otro tenant.
 */
export async function requireCompanyInTenant(
  user: ManualUser,
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

// ─── Lado cliente ────────────────────────────────────────────────────────────

export interface AssignmentMemberContext {
  user: ManualUser;
  assignment: {
    id: string;
    manualId: string;
    companyId: string;
    tenantId: string;
    status: string;
  };
  /** Es líder de la empresa: supervisa evidencias y puede pedir bajas. */
  isLeader: boolean;
  /** Es consultor o administrador entrando a la vista del cliente. */
  isStaff: boolean;
}

/**
 * Acceso de lectura y trabajo a la activación de una empresa. Pasan los
 * miembros de esa empresa (incluido su líder) y el personal del tenant, que
 * necesita ver el manual tal como lo ve el cliente.
 */
export async function requireAssignmentMemberAccess(
  assignmentId: string,
): Promise<AssignmentMemberContext> {
  const user = await requireUser();
  const assignment = await db.manualAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      manualId: true,
      companyId: true,
      tenantId: true,
      status: true,
      company: { select: { leaderId: true } },
    },
  });
  if (!assignment) throw new Error("Manual no encontrado");
  await assertDocumentsEnabled(assignment.tenantId, user.role);

  const isStaff = isManualReviewer(user);
  if (isStaff) {
    assertTenantScope(user, assignment.tenantId);
  } else if (user.companyId !== assignment.companyId) {
    throw new Error("No autorizado: este manual es de otra empresa");
  }

  return {
    user,
    assignment: {
      id: assignment.id,
      manualId: assignment.manualId,
      companyId: assignment.companyId,
      tenantId: assignment.tenantId,
      status: assignment.status,
    },
    isLeader: assignment.company.leaderId === user.id,
    isStaff,
  };
}

export interface CompanyEvidencePanelContext {
  user: ManualUser;
  company: { id: string; name: string; tenantId: string };
}

/**
 * Panel de todas las evidencias de una empresa. Lo abre su líder; el personal
 * del tenant llega por su propia cola de revisión, no por aquí.
 */
export async function requireCompanyEvidencePanelAccess(): Promise<CompanyEvidencePanelContext> {
  const user = await requireUser();
  if (!user.companyId) {
    throw new Error("No autorizado: no perteneces a ninguna empresa");
  }
  const company = await db.company.findUnique({
    where: { id: user.companyId },
    select: { id: true, name: true, tenantId: true, leaderId: true },
  });
  if (!company) throw new Error("Empresa no encontrada");
  if (company.leaderId !== user.id) {
    throw new Error("No autorizado: solo el líder de proyecto supervisa las evidencias");
  }
  await assertDocumentsEnabled(company.tenantId, user.role);
  return {
    user,
    company: { id: company.id, name: company.name, tenantId: company.tenantId },
  };
}

export interface RiskAssessmentContext {
  user: ManualUser;
  assessment: {
    id: string;
    tenantId: string;
    companyId: string;
    status: string;
    assignmentId: string | null;
    requirementId: string | null;
  };
  canEdit: boolean;
}

/**
 * Acceso a una matriz de riesgos. Editarla exige que siga en borrador: una
 * vez enviada como evidencia, lo que se revisó no puede cambiar bajo los pies
 * del consultor — el siguiente ciclo se trabaja sobre una copia.
 */
export async function requireRiskAssessmentAccess(
  assessmentId: string,
  opts: { forEdit?: boolean } = {},
): Promise<RiskAssessmentContext> {
  const user = await requireUser();
  const assessment = await db.riskAssessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      tenantId: true,
      companyId: true,
      status: true,
      assignmentId: true,
      requirementId: true,
    },
  });
  if (!assessment) throw new Error("Matriz no encontrada");
  await assertDocumentsEnabled(assessment.tenantId, user.role);

  if (isManualReviewer(user)) {
    assertTenantScope(user, assessment.tenantId);
  } else if (user.companyId !== assessment.companyId) {
    throw new Error("No autorizado: esta matriz es de otra empresa");
  }

  const canEdit = assessment.status === "DRAFT";
  if (opts.forEdit && !canEdit) {
    throw new Error("Esta matriz ya se envió: duplícala para trabajar el siguiente periodo");
  }
  return { user, assessment, canEdit };
}
