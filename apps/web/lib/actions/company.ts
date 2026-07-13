"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import crypto from "node:crypto";
import {
  requireUser,
  requireTenantAdmin,
  assertSameTenant,
} from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function generateInvitationToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Find or create a fresh slug within a tenant.
async function uniqueCompanySlug(tenantId: string, name: string): Promise<string> {
  const base = slugify(name);
  if (!base) throw new Error("Nombre inválido");

  const existing = await db.company.findUnique({
    where: { tenantId_slug: { tenantId, slug: base } },
  });
  if (!existing) return base;

  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

// ─── Auto-enroll helpers ──────────────────────────────────────────────────────
//
// Cuando una empresa tiene un curso asignado, todos sus miembros deben verlo
// en su dashboard. El dashboard sólo lee `Enrollment`, así que hace falta
// materializar una fila por (miembro, curso). Estos helpers son idempotentes
// — el unique `studentId_courseId` + `skipDuplicates` evita duplicados.

async function enrollCompanyMembersInCourse(
  companyId: string,
  courseId: string,
  tenantId: string
): Promise<number> {
  // Sólo enrolamos cuando el curso está publicado: un DRAFT no debería
  // aparecer en el dashboard del alumno.
  const course = await db.course.findFirst({
    where: { id: courseId, tenantId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!course) return 0;

  const members = await db.user.findMany({
    where: { companyId, tenantId, role: "STUDENT" },
    select: { id: true },
  });
  if (members.length === 0) return 0;

  const result = await db.enrollment.createMany({
    data: members.map((m) => ({
      studentId: m.id,
      courseId,
      tenantId,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

async function enrollUserInCompanyCourses(
  userId: string,
  companyId: string,
  tenantId: string
): Promise<number> {
  // Asignaciones activas + no expiradas + curso PUBLISHED.
  const now = new Date();
  const assignments = await db.companyCourseAssignment.findMany({
    where: {
      companyId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      course: { status: "PUBLISHED", tenantId },
    },
    select: { courseId: true },
  });
  if (assignments.length === 0) return 0;

  const result = await db.enrollment.createMany({
    data: assignments.map((a) => ({
      studentId: userId,
      courseId: a.courseId,
      tenantId,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

// ─── Company CRUD (TENANT_ADMIN) ──────────────────────────────────────────────

export async function createCompany(formData: FormData) {
  const admin = await requireTenantAdmin();

  const name = (formData.get("name") as string | null)?.trim();
  const contactEmail = (formData.get("contactEmail") as string | null)?.trim() || null;
  const seatsLimitRaw = formData.get("seatsLimit") as string | null;
  const allowMemberInvitations = formData.get("allowMemberInvitations") === "true";

  if (!name || name.length < 2 || name.length > 80) {
    throw new Error("Nombre requerido (2-80 caracteres)");
  }
  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    throw new Error("Email de contacto inválido");
  }
  const seatsLimit = seatsLimitRaw ? Math.max(1, parseInt(seatsLimitRaw, 10)) : null;

  const tenantId = admin.tenantId!; // Guaranteed for non-SUPER_ADMIN by requireTenantAdmin.
  if (admin.role === "SUPER_ADMIN" && !tenantId) {
    throw new Error("SUPER_ADMIN debe especificar tenantId (no implementado en demo)");
  }

  const slug = await uniqueCompanySlug(tenantId, name);

  const company = await db.company.create({
    data: {
      tenantId,
      name,
      slug,
      contactEmail,
      seatsLimit,
      allowMemberInvitations,
    },
  });

  revalidatePath("/tenant-admin/companies");
  return { success: true, companyId: company.id, slug: company.slug };
}

export async function updateCompany(
  companyId: string,
  data: {
    name?: string;
    contactEmail?: string | null;
    seatsLimit?: number | null;
    allowMemberInvitations?: boolean;
  }
) {
  const admin = await requireTenantAdmin();

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Empresa no encontrada");
  assertSameTenant(admin, company.tenantId);

  if (data.name !== undefined && (data.name.length < 2 || data.name.length > 80)) {
    throw new Error("Nombre inválido");
  }
  if (data.contactEmail && !/^\S+@\S+\.\S+$/.test(data.contactEmail)) {
    throw new Error("Email inválido");
  }

  await db.company.update({
    where: { id: companyId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail } : {}),
      ...(data.seatsLimit !== undefined ? { seatsLimit: data.seatsLimit } : {}),
      ...(data.allowMemberInvitations !== undefined
        ? { allowMemberInvitations: data.allowMemberInvitations }
        : {}),
    },
  });

  revalidatePath("/tenant-admin/companies");
  revalidatePath(`/tenant-admin/companies/${companyId}`);
  return { success: true };
}

export async function deleteCompany(companyId: string) {
  const admin = await requireTenantAdmin();

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Empresa no encontrada");
  assertSameTenant(admin, company.tenantId);

  // Members keep their accounts but lose company association (SetNull on user.companyId).
  await db.company.delete({ where: { id: companyId } });

  revalidatePath("/tenant-admin/companies");
  return { success: true };
}

// ─── Member management ────────────────────────────────────────────────────────

export async function addMemberToCompany(companyId: string, userId: string) {
  const admin = await requireTenantAdmin();

  const [company, target] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
      include: { _count: { select: { members: true } } },
    }),
    db.user.findUnique({ where: { id: userId } }),
  ]);

  if (!company) throw new Error("Empresa no encontrada");
  if (!target) throw new Error("Usuario no encontrado");
  assertSameTenant(admin, company.tenantId);
  if (target.tenantId !== company.tenantId) {
    throw new Error("El usuario pertenece a otro tenant");
  }
  if (target.companyId === companyId) {
    return { success: true }; // already a member
  }
  if (
    company.seatsLimit !== null &&
    company._count.members >= company.seatsLimit
  ) {
    throw new Error("La empresa alcanzó su límite de miembros");
  }

  await db.user.update({
    where: { id: userId },
    data: { companyId },
  });

  revalidatePath(`/tenant-admin/companies/${companyId}`);
  return { success: true };
}

export async function removeMemberFromCompany(companyId: string, userId: string) {
  const admin = await requireTenantAdmin();

  const [company, target] = await Promise.all([
    db.company.findUnique({ where: { id: companyId } }),
    db.user.findUnique({ where: { id: userId } }),
  ]);
  if (!company) throw new Error("Empresa no encontrada");
  if (!target) throw new Error("Usuario no encontrado");
  assertSameTenant(admin, company.tenantId);
  if (target.companyId !== companyId) {
    throw new Error("El usuario no pertenece a esta empresa");
  }

  // If the removed user was the company leader, clear the leader slot.
  await db.$transaction([
    ...(company.leaderId === userId
      ? [
          db.company.update({
            where: { id: companyId },
            data: { leaderId: null },
          }),
        ]
      : []),
    db.user.update({
      where: { id: userId },
      data: { companyId: null },
    }),
  ]);

  revalidatePath(`/tenant-admin/companies/${companyId}`);
  return { success: true };
}

// ─── Leader ───────────────────────────────────────────────────────────────────

/**
 * Designate a company member as the company leader. Tenant admin only.
 *
 * The leader is a regular STUDENT member with two extra capabilities:
 *  - invite new members (regardless of the allowMemberInvitations flag)
 *  - access a team progress report on /dashboard/company
 *
 * Replaces any existing leader (Company.leaderId is @unique).
 */
export async function setCompanyLeader(companyId: string, userId: string) {
  const admin = await requireTenantAdmin();

  const [company, target] = await Promise.all([
    db.company.findUnique({ where: { id: companyId } }),
    db.user.findUnique({ where: { id: userId } }),
  ]);
  if (!company) throw new Error("Empresa no encontrada");
  if (!target) throw new Error("Usuario no encontrado");
  assertSameTenant(admin, company.tenantId);
  if (target.companyId !== companyId) {
    throw new Error("El usuario no pertenece a esta empresa");
  }
  if (target.role !== "STUDENT") {
    throw new Error("El líder debe ser un usuario tipo estudiante");
  }

  await db.company.update({
    where: { id: companyId },
    data: { leaderId: userId },
  });

  revalidatePath(`/tenant-admin/companies/${companyId}`);
  revalidatePath("/dashboard/company");
  return { success: true };
}

export async function unsetCompanyLeader(companyId: string) {
  const admin = await requireTenantAdmin();

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Empresa no encontrada");
  assertSameTenant(admin, company.tenantId);

  await db.company.update({
    where: { id: companyId },
    data: { leaderId: null },
  });

  revalidatePath(`/tenant-admin/companies/${companyId}`);
  revalidatePath("/dashboard/company");
  return { success: true };
}

// ─── Invitations ──────────────────────────────────────────────────────────────

export async function inviteToCompany(
  companyId: string,
  email: string,
): Promise<
  { success: true; invitationId: string } | { success: false; error: string }
> {
  const inviter = await requireUser();

  // Los rechazos de reglas de negocio se DEVUELVEN en vez de lanzarse:
  // Next enmascara los mensajes de errores lanzados en producción y el
  // formulario solo podría mostrar un error genérico.
  const trimmedEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
    return { success: false, error: "Email inválido" };
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    include: { _count: { select: { members: true } } },
  });
  if (!company) return { success: false, error: "Empresa no encontrada" };

  // Authorization: ADMIN/SUPER_ADMIN of the company's tenant can always invite.
  // The company leader can also always invite, regardless of the
  // allowMemberInvitations flag. Other members can invite only if that flag
  // is enabled.
  const isAdmin =
    inviter.role === "SUPER_ADMIN" ||
    (inviter.role === "ADMIN" && inviter.tenantId === company.tenantId);
  const isLeader =
    company.leaderId === inviter.id &&
    inviter.tenantId === company.tenantId;
  const isMember =
    inviter.companyId === companyId &&
    inviter.tenantId === company.tenantId;

  if (!isAdmin && !isLeader && !(isMember && company.allowMemberInvitations)) {
    return { success: false, error: "No autorizado para invitar a esta empresa" };
  }

  // Block if the email already belongs to a user in this company.
  const existingUser = await db.user.findUnique({
    where: { email: trimmedEmail },
  });
  if (existingUser && existingUser.companyId === companyId) {
    return { success: false, error: "El usuario ya es miembro de esta empresa" };
  }
  if (existingUser && existingUser.tenantId && existingUser.tenantId !== company.tenantId) {
    return { success: false, error: "El usuario pertenece a otro tenant" };
  }

  // Idempotency: if a PENDING invite for this email exists, refresh its
  // token. Va antes del check de capacidad — reenviar una invitación
  // existente no consume un asiento adicional.
  const existingInvite = await db.companyInvitation.findFirst({
    where: { companyId, email: trimmedEmail, status: "PENDING" },
  });

  // Capacity check: miembros actuales + invitaciones pendientes VIGENTES
  // contra el límite. Las vencidas se quedan en PENDING hasta que alguien
  // intenta aceptarlas, así que contarlas ocuparía cupo para siempre.
  if (!existingInvite && company.seatsLimit !== null) {
    const pending = await db.companyInvitation.count({
      where: { companyId, status: "PENDING", expiresAt: { gt: new Date() } },
    });
    if (company._count.members + pending >= company.seatsLimit) {
      return {
        success: false,
        error: "La empresa alcanzó su límite (incluyendo invitaciones pendientes)",
      };
    }
  }

  const token = generateInvitationToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  const invitation = existingInvite
    ? await db.companyInvitation.update({
        where: { id: existingInvite.id },
        data: { token, expiresAt, invitedBy: inviter.id },
      })
    : await db.companyInvitation.create({
        data: {
          companyId,
          email: trimmedEmail,
          invitedBy: inviter.id,
          token,
          expiresAt,
        },
      });

  // Send email (non-blocking)
  try {
    const { sendEmail, companyInvitationEmail } = await import("@prol/email");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://prol.prosuite.pro";
    const acceptUrl = `${appUrl}/invite/${token}`;
    const tpl = companyInvitationEmail({
      companyName: company.name,
      inviterName: inviter.name ?? "Un miembro",
      acceptUrl,
      expiresInDays: 7,
    });
    await sendEmail({
      to: trimmedEmail,
      subject: tpl.subject,
      html: tpl.html,
    });
  } catch (err) {
    console.error("Error enviando email de invitación:", err);
  }

  revalidatePath(`/tenant-admin/companies/${companyId}`);
  return { success: true, invitationId: invitation.id };
}

export async function revokeInvitation(invitationId: string) {
  const inviter = await requireUser();

  const invitation = await db.companyInvitation.findUnique({
    where: { id: invitationId },
    include: { company: { select: { tenantId: true } } },
  });
  if (!invitation) throw new Error("Invitación no encontrada");

  // Same authorization as inviting.
  const isAdmin =
    inviter.role === "SUPER_ADMIN" ||
    (inviter.role === "ADMIN" && inviter.tenantId === invitation.company.tenantId);
  const isInviter = inviter.id === invitation.invitedBy;

  if (!isAdmin && !isInviter) {
    throw new Error("No autorizado");
  }

  if (invitation.status !== "PENDING") {
    throw new Error("Solo se pueden revocar invitaciones pendientes");
  }

  await db.companyInvitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  });

  revalidatePath(`/tenant-admin/companies/${invitation.companyId}`);
  return { success: true };
}

// Public action — called from /invite/[token] by an authenticated user.
export async function acceptCompanyInvitation(token: string) {
  const user = await requireUser();

  const invitation = await db.companyInvitation.findUnique({
    where: { token },
    include: { company: { include: { _count: { select: { members: true } } } } },
  });
  if (!invitation) throw new Error("Invitación no encontrada");
  if (invitation.status !== "PENDING") {
    throw new Error("Esta invitación ya no es válida");
  }
  if (invitation.expiresAt < new Date()) {
    await db.companyInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("La invitación ha expirado");
  }

  // The accepting user's email must match the invited email.
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("Esta invitación fue enviada a otro email");
  }

  // The user must belong to the company's tenant (or have no tenant yet,
  // which would happen for a brand-new sign-up landing on /invite/[token]).
  if (user.tenantId && user.tenantId !== invitation.company.tenantId) {
    throw new Error("Tu cuenta pertenece a otra academia");
  }

  if (
    invitation.company.seatsLimit !== null &&
    invitation.company._count.members >= invitation.company.seatsLimit
  ) {
    throw new Error("La empresa alcanzó su límite de miembros");
  }

  // Atomically: assign user to tenant + company, mark invitation accepted.
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        tenantId: invitation.company.tenantId,
        companyId: invitation.companyId,
      },
    }),
    db.companyInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
  ]);

  // Auto-enroll en las asignaciones vigentes de la empresa. Side-effect:
  // un fallo aquí no debe bloquear la aceptación de la invitación.
  try {
    await enrollUserInCompanyCourses(
      user.id,
      invitation.companyId,
      invitation.company.tenantId
    );
  } catch (err) {
    console.error("Auto-enroll al aceptar invitación falló:", err);
  }

  // Notify the inviter
  try {
    await createNotification({
      userId: invitation.invitedBy,
      tenantId: invitation.company.tenantId,
      type: "SYSTEM",
      title: "Invitación aceptada",
      message: `${user.name ?? user.email} se unió a ${invitation.company.name}.`,
      link: `/tenant-admin/companies/${invitation.companyId}`,
    });
  } catch {
    /* ignore */
  }

  return { success: true, companyId: invitation.companyId };
}

// ─── Course assignments ───────────────────────────────────────────────────────

export async function assignCourseToCompany(
  companyId: string,
  courseId: string,
  expiresAt?: Date | null
) {
  const admin = await requireTenantAdmin();

  const [company, course] = await Promise.all([
    db.company.findUnique({ where: { id: companyId } }),
    db.course.findUnique({ where: { id: courseId } }),
  ]);
  if (!company) throw new Error("Empresa no encontrada");
  if (!course) throw new Error("Curso no encontrado");
  assertSameTenant(admin, company.tenantId);
  assertSameTenant(admin, course.tenantId);
  if (course.tenantId !== company.tenantId) {
    throw new Error("La empresa y el curso pertenecen a tenants distintos");
  }

  // Upsert: if previously revoked (isActive=false), re-activate it.
  const assignment = await db.companyCourseAssignment.upsert({
    where: { companyId_courseId: { companyId, courseId } },
    create: {
      companyId,
      courseId,
      assignedBy: admin.id,
      expiresAt: expiresAt ?? null,
      isActive: true,
    },
    update: {
      assignedBy: admin.id,
      expiresAt: expiresAt ?? null,
      isActive: true,
      assignedAt: new Date(),
    },
  });

  // Materializar enrollments para los miembros actuales. Side-effect: no
  // queremos que un fallo aquí rompa la asignación administrativa, así que
  // se loguea y se sigue.
  let enrolledCount = 0;
  try {
    enrolledCount = await enrollCompanyMembersInCourse(
      companyId,
      courseId,
      company.tenantId
    );
  } catch (err) {
    console.error("Auto-enroll de miembros al asignar curso falló:", err);
  }

  revalidatePath(`/tenant-admin/companies/${companyId}`);
  return { success: true, assignmentId: assignment.id, enrolledCount };
}

export async function revokeCourseFromCompany(
  companyId: string,
  courseId: string
) {
  const admin = await requireTenantAdmin();

  const assignment = await db.companyCourseAssignment.findUnique({
    where: { companyId_courseId: { companyId, courseId } },
    include: { company: { select: { tenantId: true } } },
  });
  if (!assignment) throw new Error("Asignación no encontrada");
  assertSameTenant(admin, assignment.company.tenantId);

  await db.companyCourseAssignment.update({
    where: { id: assignment.id },
    data: { isActive: false },
  });

  revalidatePath(`/tenant-admin/companies/${companyId}`);
  return { success: true };
}
