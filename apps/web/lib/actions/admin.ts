"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireAdmin } from "@/lib/auth";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function createTenantAdmin(formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const status = (formData.get("status") as string) || "TRIAL";

  if (!name || name.length < 2)
    throw new Error("El nombre es requerido (mínimo 2 caracteres)");
  if (!contactEmail) throw new Error("El email de contacto es requerido");

  let slug = slugify(name);
  const existing = await db.tenant.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const tenant = await db.tenant.create({
    data: {
      name,
      slug,
      contactEmail,
      status: status as "TRIAL" | "ACTIVE",
      trialEndsAt:
        status === "TRIAL"
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null,
    },
  });

  revalidatePath("/admin/tenants");
  return { success: true, tenantId: tenant.id };
}

export async function updateTenant(
  tenantId: string,
  data: { name?: string; contactEmail?: string; customDomain?: string }
) {
  await requireAdmin();

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.contactEmail ? { contactEmail: data.contactEmail } : {}),
      ...(data.customDomain !== undefined
        ? { customDomain: data.customDomain || null }
        : {}),
    },
  });

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { success: true };
}

export async function toggleTenantFeature(
  tenantId: string,
  feature: "aiEnabled" | "workshopsEnabled" | "evaluationsEnabled",
  enabled: boolean
) {
  await requireAdmin();
  await db.tenant.update({
    where: { id: tenantId },
    data: { [feature]: enabled },
  });
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { success: true };
}

const TENANT_STATUSES = ["TRIAL", "ACTIVE", "PAUSED", "CHURNED"] as const;
const USER_ROLES = ["STUDENT", "PROFESSOR", "ADMIN", "SUPER_ADMIN"] as const;
type TenantStatus = (typeof TENANT_STATUSES)[number];
type UserRoleLiteral = (typeof USER_ROLES)[number];

export async function updateTenantStatus(tenantId: string, status: string) {
  await requireAdmin();
  if (!TENANT_STATUSES.includes(status as TenantStatus)) {
    throw new Error("Estado inválido");
  }
  await db.tenant.update({
    where: { id: tenantId },
    data: { status: status as TenantStatus },
  });
  revalidatePath("/admin/tenants");
  return { success: true };
}

export async function updateUserRole(userId: string, newRole: string) {
  await requireAdmin();
  if (!USER_ROLES.includes(newRole as UserRoleLiteral)) {
    throw new Error("Rol inválido");
  }
  await db.user.update({
    where: { id: userId },
    data: { role: newRole as UserRoleLiteral },
  });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateTenantRevenueShare(
  tenantId: string,
  rate: number
) {
  await requireAdmin();
  if (rate < 0.05 || rate > 0.95) {
    throw new Error("El porcentaje debe estar entre 5% y 95%");
  }
  await db.tenant.update({
    where: { id: tenantId },
    data: { revenueShareRate: rate },
  });
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { success: true };
}
