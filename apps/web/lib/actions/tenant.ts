"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireTenantAdmin } from "@/lib/auth";
import {
  DOCUMENTS_MENU_LABEL_MAX,
  DOCUMENTS_MENU_LABEL_MIN,
} from "@/lib/tenant-labels";

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
    // Only accept logos uploaded through our own /api/upload pipeline.
    // Allowing arbitrary https:// URLs lets a tenant admin embed a remote
    // tracking pixel into every page that renders the brand.
    if (!data.logo.startsWith("/uploads/")) {
      throw new Error(
        "El logotipo debe subirse desde el panel (no se permiten URLs externas)",
      );
    }
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

/**
 * Rótulo del menú del módulo de gestión documental de este tenant.
 *
 * Vive aquí y no en el panel de super-admin (decisión (c) del CONTEXT): es marca
 * del tenant, igual que el nombre y el logo, y el ADMIN de IBIZA ya existe en
 * producción — no necesita que nadie se lo configure.
 */
export async function updateDocumentsMenuLabel(label: string | null) {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) {
    throw new Error("SUPER_ADMIN debe seleccionar un tenant");
  }

  const trimmed = (label ?? "").trim();
  // Vaciarlo es una operación válida: devuelve el menú al neutro de
  // `tenant-labels.ts`. Por eso se guarda `null` y no la cadena vacía — así la
  // columna sólo tiene dos estados y `resolveDocumentsMenuLabel` no tiene que
  // desempatar entre "" y null.
  const next = trimmed.length > 0 ? trimmed : null;
  if (
    next !== null &&
    (next.length < DOCUMENTS_MENU_LABEL_MIN || next.length > DOCUMENTS_MENU_LABEL_MAX)
  ) {
    throw new Error(
      `El rótulo del menú debe tener ${DOCUMENTS_MENU_LABEL_MIN}-${DOCUMENTS_MENU_LABEL_MAX} caracteres`,
    );
  }

  await db.tenant.update({
    where: { id: admin.tenantId },
    data: { documentsMenuLabel: next },
  });

  // El rótulo se pinta en el sidebar de los tres paneles.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/professor", "layout");
  revalidatePath("/tenant-admin", "layout");
  return { success: true };
}
