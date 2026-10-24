"use server";

import { revalidatePath } from "next/cache";
import { db, Prisma } from "@prol/db";
import { isKnownStudentToolId, setStudentToolPreference } from "@prol/shared";
import { requireTenantAdmin, requireUser } from "@/lib/auth";

export async function setProfessorMode(enabled: boolean) {
  const user = await requireUser();
  if (user.role !== "ADMIN" || !user.tenantId) {
    throw new Error("No autorizado");
  }
  if (typeof enabled !== "boolean") {
    throw new Error("Valor inválido");
  }

  await db.user.update({
    where: { id: user.id },
    data: { professorModeEnabled: enabled },
  });

  revalidatePath("/tenant-admin");
  revalidatePath("/tenant-admin/settings");
  revalidatePath("/professor");
  return { success: true as const };
}

export async function setStudentToolEnabled(toolId: string, enabled: boolean) {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) {
    throw new Error("No autorizado: tenant requerido");
  }
  if (!isKnownStudentToolId(toolId) || typeof enabled !== "boolean") {
    throw new Error("Herramienta desconocida");
  }

  const tenant = await db.tenant.findUnique({
    where: { id: admin.tenantId },
    select: { studentTools: true },
  });
  if (!tenant) throw new Error("Academia no encontrada");

  const next = setStudentToolPreference(tenant.studentTools, toolId, enabled);
  await db.tenant.update({
    where: { id: admin.tenantId },
    data: { studentTools: next as Prisma.InputJsonValue },
  });

  revalidatePath("/tenant-admin/settings");
  revalidatePath("/dashboard");
  return { success: true as const };
}
