"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireTenantAdmin } from "@/lib/auth";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Update branding (logo, colors) of the current admin's tenant.
 * Affects sidebars across roles + the public sign-in page when accessed
 * via the tenant's subdomain.
 */
export async function updateTenantBranding(data: {
  name?: string;
  logo?: string | null;
  primaryColor?: string;
  accentColor?: string;
}) {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) {
    throw new Error("SUPER_ADMIN debe seleccionar un tenant");
  }

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new Error("El nombre de la academia debe tener 2-80 caracteres");
    }
  }
  if (data.logo !== undefined && data.logo !== null) {
    const ok =
      data.logo.startsWith("/uploads/") || data.logo.startsWith("https://");
    if (!ok) throw new Error("URL del logotipo inválida");
  }
  if (data.primaryColor !== undefined && !HEX_COLOR_RE.test(data.primaryColor)) {
    throw new Error("Color primario inválido (usa formato #RRGGBB)");
  }
  if (data.accentColor !== undefined && !HEX_COLOR_RE.test(data.accentColor)) {
    throw new Error("Color de acento inválido (usa formato #RRGGBB)");
  }

  await db.tenant.update({
    where: { id: admin.tenantId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.logo !== undefined ? { logo: data.logo } : {}),
      ...(data.primaryColor !== undefined
        ? { primaryColor: data.primaryColor }
        : {}),
      ...(data.accentColor !== undefined
        ? { accentColor: data.accentColor }
        : {}),
    },
  });

  // Revalidate every layout that displays branding
  revalidatePath("/dashboard", "layout");
  revalidatePath("/professor", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/tenant-admin", "layout");
  revalidatePath("/", "layout");
  return { success: true };
}
