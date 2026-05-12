import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@prol/db";
import { headers } from "next/headers";
import { cache } from "react";
import { assertCriticalServerEnv } from "@/lib/env";

// Falla rápido al primer import si faltan variables críticas en producción.
assertCriticalServerEnv();

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const { sendEmail } = await import("@prol/email");
      await sendEmail({
        to: user.email,
        subject: "Restablecer tu contraseña — PROL",
        html: `
          <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;padding:40px 20px;">
            <h1 style="color:#6366f1;font-size:28px;margin-bottom:8px;">PROL</h1>
            <h2 style="color:#1e293b;font-size:20px;">Restablece tu contraseña</h2>
            <p style="color:#64748b;font-size:14px;line-height:1.6;">
              Hola ${user.name || ""},<br/><br/>
              Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${url}" style="background:#6366f1;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                Restablecer Contraseña
              </a>
            </div>
            <p style="color:#94a3b8;font-size:12px;">
              Si no solicitaste este cambio, puedes ignorar este correo. El enlace expira en 1 hora.
            </p>
          </div>
        `,
      });
    },
  },
  session: {
    // cookieCache stores the session payload encrypted in a cookie so
    // we can avoid hitting the DB on every request. Disabled because a
    // pre-fix admin-side createUser flow (signUpEmail) leaked a session
    // cookie into the admin's browser; with cookieCache on, that cookie
    // remained valid for up to 5 minutes even after we revoked the
    // underlying DB row. Always validate against the sessions table.
    cookieCache: {
      enabled: false,
    },
  },
  plugins: [nextCookies()],
});

export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          primaryColor: true,
          accentColor: true,
        },
      },
    },
  });

  return user;
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  return user;
});

export const requireAdmin = cache(async () => {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new Error("No autorizado");
  }
  return user;
});

/**
 * Requires the current user to be a tenant-scoped administrator: ADMIN or
 * SUPER_ADMIN. SUPER_ADMIN bypasses the tenant check.
 *
 * Returns the user augmented with a guaranteed `tenantId`. Server actions
 * that operate on tenant-scoped resources (companies, users in a tenant,
 * certificates, etc.) should use this and then filter all queries by the
 * returned tenantId.
 */
export const requireTenantAdmin = cache(async () => {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new Error("No autorizado");
  }
  if (user.role !== "SUPER_ADMIN" && !user.tenantId) {
    throw new Error("No autorizado: tenant requerido");
  }
  return user;
});

/**
 * Requires the current user to be allowed to author evaluations: a
 * PROFESSOR, ADMIN or SUPER_ADMIN with a tenant (SUPER_ADMIN bypasses).
 */
export const requireEvaluationAuthor = cache(async () => {
  const user = await requireUser();
  if (
    user.role !== "PROFESSOR" &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    throw new Error("No autorizado");
  }
  if (user.role !== "SUPER_ADMIN" && !user.tenantId) {
    throw new Error("No autorizado: tenant requerido");
  }
  return user;
});

/**
 * Requires the current user to be allowed to author surveys: same gating
 * as evaluation authors. Kept as a separate helper so future scoping
 * (e.g. allowing tenant ADMIN but not regular PROFESSOR) can change in
 * one place without touching evaluations.
 */
export const requireSurveyAuthor = cache(async () => {
  const user = await requireUser();
  if (
    user.role !== "PROFESSOR" &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    throw new Error("No autorizado");
  }
  if (user.role !== "SUPER_ADMIN" && !user.tenantId) {
    throw new Error("No autorizado: tenant requerido");
  }
  return user;
});

/**
 * Requires the AI module to be enabled for the user's tenant. By default
 * any authenticated user with a tenant is acceptable; pass `roles` to
 * additionally restrict the caller (e.g. only PROFESSOR/ADMIN may author
 * AI-generated drafts).
 */
export const requireAIEnabled = cache(
  async (roles?: ("PROFESSOR" | "ADMIN" | "SUPER_ADMIN")[]) => {
    const user = await requireUser();
    if (roles && !roles.includes(user.role as (typeof roles)[number])) {
      throw new Error("No autorizado");
    }
    if (!user.tenantId) throw new Error("Sin tenant asignado");
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { aiEnabled: true },
    });
    if (!tenant?.aiEnabled) throw new Error("Módulo de IA no habilitado");
    return user as typeof user & { tenantId: string };
  },
);

/**
 * Asserts that the given resource's tenantId matches the current user's,
 * unless the user is a SUPER_ADMIN. Throws otherwise.
 */
export function assertSameTenant(
  user: { role: string; tenantId: string | null },
  resourceTenantId: string
): void {
  if (user.role === "SUPER_ADMIN") return;
  if (!user.tenantId || user.tenantId !== resourceTenantId) {
    throw new Error("No autorizado: tenant no coincide");
  }
}

/**
 * Requires the current user to be the designated leader of a company. The
 * leader is a regular STUDENT to whom a tenant admin granted two extra
 * capabilities — invite members and view the team report. With surveys, the
 * leader also becomes a co-author of surveys scoped to their company.
 * Returns `{ user, company }` for downstream tenant/company-scoped queries.
 */
export const requireCompanyLeader = cache(async () => {
  const user = await requireUser();
  if (user.role !== "STUDENT") {
    throw new Error("No autorizado");
  }
  const company = await db.company.findUnique({
    where: { leaderId: user.id },
    select: { id: true, tenantId: true, name: true, slug: true },
  });
  if (!company) {
    throw new Error("No autorizado: no eres líder de ninguna empresa");
  }
  return { user, company };
});

/**
 * Returns the company the user leads, or null if they don't lead any. Use
 * this in query layers that need to branch on leadership without throwing.
 */
export const getCompanyLed = cache(async (userId: string) => {
  return db.company.findUnique({
    where: { leaderId: userId },
    select: { id: true, tenantId: true, name: true, slug: true },
  });
});

export type Auth = typeof auth;
