"use server";

import { revalidatePath } from "next/cache";
import { db, Prisma } from "@prol/db";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  requireTenantAdmin,
  assertSameTenant,
} from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssignableRole = "STUDENT" | "PROFESSOR" | "ADMIN";

interface CsvRow {
  email: string;
  name: string;
  role?: string;
  companyName?: string;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; email?: string; reason: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTempPassword(): string {
  // 16-char base64url password — strong enough for an initial password the
  // user must reset on first login.
  return crypto.randomBytes(12).toString("base64url");
}

function isValidRole(role: string | undefined): role is AssignableRole {
  return role === "STUDENT" || role === "PROFESSOR" || role === "ADMIN";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Single-user CRUD ─────────────────────────────────────────────────────────

export async function createTenantUser(formData: FormData) {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) {
    throw new Error("Como SUPER_ADMIN, usa el panel global para crear usuarios cross-tenant");
  }

  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const name = (formData.get("name") as string | null)?.trim();
  const role = (formData.get("role") as string | null) ?? "STUDENT";
  const companyId = (formData.get("companyId") as string | null) || null;

  if (!email || !isValidEmail(email)) throw new Error("Email inválido");
  if (!name || name.length < 2) throw new Error("Nombre requerido (mín 2 caracteres)");
  if (!isValidRole(role)) throw new Error("Rol inválido");
  // Tenant admins cannot create other ADMINs (only SUPER_ADMIN can).
  if (role === "ADMIN" && admin.role !== "SUPER_ADMIN") {
    throw new Error("No autorizado para crear administradores");
  }

  // If companyId provided, verify it belongs to admin's tenant
  if (companyId) {
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company || company.tenantId !== admin.tenantId) {
      throw new Error("Empresa inválida");
    }
  }

  // Check for existing email
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("El email ya está registrado");

  // Use Better Auth API to create the user (handles password hashing + accounts row)
  const tempPassword = generateTempPassword();
  const reqHeaders = await headers();

  const result = await auth.api.signUpEmail({
    body: { email, name, password: tempPassword },
    headers: reqHeaders,
    asResponse: false,
  });

  const userId = result.user?.id;
  if (!userId) throw new Error("No se pudo crear el usuario");

  // Set tenant + role + company + force password reset.
  // onboardingCompleted=true: this user already has a tenant (we just
  // assigned it), so they should skip the self-service /onboarding wizard
  // that exists only for users creating their own academy from scratch.
  await db.user.update({
    where: { id: userId },
    data: {
      tenantId: admin.tenantId,
      role,
      companyId,
      mustResetPassword: true,
      onboardingCompleted: true,
    },
  });

  // Send welcome email with temporary password
  await sendInvitationEmail({
    email,
    name,
    tempPassword,
    tenantName: admin.tenant?.name ?? "PROL",
  });

  revalidatePath("/tenant-admin/users");
  return { success: true, userId };
}

/**
 * Super-admin variant: create a user in the specified tenant. Mirrors
 * createTenantUser but takes the target tenantId explicitly so SUPER_ADMIN
 * can populate any tenant from /admin/tenants/[id]. ADMIN role is allowed
 * here (this is the only entry point for it).
 */
export async function createUserInTenant(
  targetTenantId: string,
  formData: FormData,
) {
  const caller = await requireTenantAdmin();
  if (caller.role !== "SUPER_ADMIN") {
    throw new Error("Solo SUPER_ADMIN puede crear usuarios en otros tenants");
  }

  const tenant = await db.tenant.findUnique({
    where: { id: targetTenantId },
    select: { id: true, name: true },
  });
  if (!tenant) throw new Error("Tenant no encontrado");

  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const name = (formData.get("name") as string | null)?.trim();
  const role = (formData.get("role") as string | null) ?? "STUDENT";
  const companyId = (formData.get("companyId") as string | null) || null;

  if (!email || !isValidEmail(email)) throw new Error("Email inválido");
  if (!name || name.length < 2) throw new Error("Nombre requerido (mín 2 caracteres)");
  if (!isValidRole(role)) throw new Error("Rol inválido");

  if (companyId) {
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company || company.tenantId !== tenant.id) {
      throw new Error("Empresa inválida");
    }
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("El email ya está registrado");

  const tempPassword = generateTempPassword();
  const reqHeaders = await headers();

  const result = await auth.api.signUpEmail({
    body: { email, name, password: tempPassword },
    headers: reqHeaders,
    asResponse: false,
  });

  const userId = result.user?.id;
  if (!userId) throw new Error("No se pudo crear el usuario");

  await db.user.update({
    where: { id: userId },
    data: {
      tenantId: tenant.id,
      role,
      companyId,
      mustResetPassword: true,
      onboardingCompleted: true,
    },
  });

  await sendInvitationEmail({
    email,
    name,
    tempPassword,
    tenantName: tenant.name,
  });

  revalidatePath(`/admin/tenants/${tenant.id}`);
  revalidatePath("/admin/users");
  return { success: true, userId };
}

export async function updateTenantUser(
  userId: string,
  data: {
    name?: string;
    role?: AssignableRole;
    companyId?: string | null;
    disabled?: boolean;
  }
) {
  const admin = await requireTenantAdmin();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, tenantId: true, role: true, email: true },
  });
  if (!user) throw new Error("Usuario no encontrado");
  if (!user.tenantId) throw new Error("Usuario sin tenant");
  assertSameTenant(admin, user.tenantId);

  // Prevent self-disable / self-demote
  if (user.id === admin.id) {
    if (data.disabled === true) {
      throw new Error("No puedes deshabilitarte a ti mismo");
    }
    if (data.role && data.role !== admin.role) {
      throw new Error("No puedes cambiar tu propio rol");
    }
  }

  // Tenant admins cannot promote others to ADMIN.
  if (data.role === "ADMIN" && admin.role !== "SUPER_ADMIN") {
    throw new Error("No autorizado para asignar el rol ADMIN");
  }
  // Tenant admins cannot edit other ADMINs (separation of concern).
  if (
    user.role === "ADMIN" &&
    admin.role !== "SUPER_ADMIN" &&
    user.id !== admin.id
  ) {
    throw new Error("No autorizado para editar otro administrador");
  }

  // Validate company belongs to same tenant
  if (data.companyId) {
    const company = await db.company.findUnique({
      where: { id: data.companyId },
    });
    if (!company || company.tenantId !== user.tenantId) {
      throw new Error("Empresa inválida");
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
      ...(data.disabled !== undefined
        ? { disabledAt: data.disabled ? new Date() : null }
        : {}),
    },
  });

  revalidatePath("/tenant-admin/users");
  revalidatePath(`/tenant-admin/users/${userId}`);
  return { success: true };
}

export async function deleteTenantUser(userId: string) {
  const admin = await requireTenantAdmin();

  if (userId === admin.id) {
    throw new Error("No puedes eliminarte a ti mismo");
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuario no encontrado");
  if (!user.tenantId) throw new Error("Usuario sin tenant");
  assertSameTenant(admin, user.tenantId);

  if (user.role === "ADMIN" && admin.role !== "SUPER_ADMIN") {
    throw new Error("No autorizado para eliminar administradores");
  }

  await db.user.delete({ where: { id: userId } });

  revalidatePath("/tenant-admin/users");
  return { success: true };
}

export async function resendWelcomeEmail(userId: string) {
  const admin = await requireTenantAdmin();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, tenantId: true },
  });
  if (!user || !user.tenantId) throw new Error("Usuario no encontrado");
  assertSameTenant(admin, user.tenantId);

  // Use Better Auth to send a password reset link instead of regenerating
  // the temp password — the user can choose their own.
  const reqHeaders = await headers();
  await auth.api.requestPasswordReset({
    body: { email: user.email, redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password` },
    headers: reqHeaders,
    asResponse: false,
  });

  return { success: true };
}

// ─── CSV bulk import ──────────────────────────────────────────────────────────

/**
 * Parses and imports a CSV string of users. Format (header required):
 *   email,name,role,companyName
 *
 * - role: STUDENT | PROFESSOR | ADMIN (defaults to STUDENT if blank)
 * - companyName: optional. If a company with that name already exists in
 *   the tenant, the user is added to it. Otherwise a new company is created.
 *
 * Each successfully created user receives a welcome email with a temporary
 * password they must reset on first login.
 */
export async function bulkImportUsers(
  rows: CsvRow[]
): Promise<ImportResult> {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) {
    throw new Error("SUPER_ADMIN debe seleccionar un tenant para esta operación");
  }
  const tenantId = admin.tenantId;

  // Hard cap to prevent abuse
  if (rows.length > 500) {
    throw new Error("Límite por importación: 500 filas");
  }

  const result: ImportResult = {
    total: rows.length,
    created: 0,
    skipped: 0,
    errors: [],
  };

  // Pre-resolve companies (avoid N+1 lookups). Build a name → id map.
  const companyNames = Array.from(
    new Set(
      rows
        .map((r) => r.companyName?.trim())
        .filter((n): n is string => !!n && n.length > 0)
    )
  );

  const existingCompanies = await db.company.findMany({
    where: { tenantId, name: { in: companyNames } },
    select: { id: true, name: true },
  });
  const companyIdByName = new Map(existingCompanies.map((c) => [c.name, c.id]));

  // Create missing companies
  for (const cname of companyNames) {
    if (companyIdByName.has(cname)) continue;
    try {
      const slug =
        cname
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40) +
        "-" +
        Date.now().toString(36).slice(-4);
      const c = await db.company.create({
        data: { tenantId, name: cname, slug },
      });
      companyIdByName.set(cname, c.id);
    } catch (err) {
      result.errors.push({
        row: 0,
        reason: `No se pudo crear empresa "${cname}": ${err instanceof Error ? err.message : "error"}`,
      });
    }
  }

  // Pre-load existing emails (avoid N queries inside the loop)
  const emails = rows.map((r) => r.email.trim().toLowerCase());
  const existing = await db.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((u) => u.email));

  const reqHeaders = await headers();
  const tenantName = admin.tenant?.name ?? "PROL";

  // Process row by row (sequential to allow per-row error reporting + emails)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const lineNum = i + 2; // +1 for header, +1 for 1-based
    const email = row.email?.trim().toLowerCase();
    const name = row.name?.trim();
    const roleRaw = row.role?.trim().toUpperCase() || "STUDENT";
    const companyName = row.companyName?.trim();

    if (!email || !isValidEmail(email)) {
      result.errors.push({ row: lineNum, email, reason: "Email inválido" });
      result.skipped++;
      continue;
    }
    if (!name || name.length < 2) {
      result.errors.push({ row: lineNum, email, reason: "Nombre inválido" });
      result.skipped++;
      continue;
    }
    if (!isValidRole(roleRaw)) {
      result.errors.push({
        row: lineNum,
        email,
        reason: `Rol inválido: ${roleRaw}`,
      });
      result.skipped++;
      continue;
    }
    if (roleRaw === "ADMIN" && admin.role !== "SUPER_ADMIN") {
      result.errors.push({
        row: lineNum,
        email,
        reason: "No autorizado para crear ADMIN",
      });
      result.skipped++;
      continue;
    }
    if (existingEmails.has(email)) {
      result.errors.push({ row: lineNum, email, reason: "Email ya registrado" });
      result.skipped++;
      continue;
    }

    const companyId = companyName ? companyIdByName.get(companyName) ?? null : null;

    try {
      const tempPassword = generateTempPassword();
      const created = await auth.api.signUpEmail({
        body: { email, name, password: tempPassword },
        headers: reqHeaders,
        asResponse: false,
      });
      const userId = created.user?.id;
      if (!userId) throw new Error("Better Auth no devolvió userId");

      await db.user.update({
        where: { id: userId },
        data: {
          tenantId,
          role: roleRaw,
          companyId,
          mustResetPassword: true,
          onboardingCompleted: true,
        },
      });

      // Send email (don't fail the import if email fails)
      try {
        await sendInvitationEmail({
          email,
          name,
          tempPassword,
          tenantName,
        });
      } catch (mailErr) {
        console.error(`Email failed for ${email}:`, mailErr);
      }

      result.created++;
      existingEmails.add(email); // dedupe within the same batch
    } catch (err) {
      const reason =
        err instanceof Prisma.PrismaClientKnownRequestError
          ? `DB error: ${err.code}`
          : err instanceof Error
            ? err.message
            : "Error desconocido";
      result.errors.push({ row: lineNum, email, reason });
      result.skipped++;
    }
  }

  revalidatePath("/tenant-admin/users");
  return result;
}

// ─── Email helper ─────────────────────────────────────────────────────────────

async function sendInvitationEmail(params: {
  email: string;
  name: string;
  tempPassword: string;
  tenantName: string;
}) {
  const { sendEmail } = await import("@prol/email");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://prol.prosuite.pro";
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:32px;">
      <h1 style="color:#6366f1;margin:0 0 16px;">Bienvenido a ${escapeHtml(params.tenantName)}</h1>
      <p style="color:#374151;line-height:1.6;">
        Hola <strong>${escapeHtml(params.name)}</strong>,<br/><br/>
        Se te ha creado una cuenta en la plataforma. Éstas son tus credenciales de acceso:
      </p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#374151;"><strong>Email:</strong> ${escapeHtml(params.email)}</p>
        <p style="margin:8px 0 0;color:#374151;"><strong>Contraseña temporal:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${escapeHtml(params.tempPassword)}</code></p>
      </div>
      <p style="color:#374151;line-height:1.6;">
        Por seguridad, tendrás que cambiar tu contraseña al iniciar sesión por primera vez.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${appUrl}/sign-in" style="background:#6366f1;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">
          Iniciar sesión
        </a>
      </div>
    </div>
  `;
  await sendEmail({
    to: params.email,
    subject: `Bienvenido a ${params.tenantName}`,
    html,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
