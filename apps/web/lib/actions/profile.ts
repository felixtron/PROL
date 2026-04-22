"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

export async function updateProfile(data: {
  name?: string;
  avatar?: string | null;
}) {
  const user = await requireUser();

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new Error("El nombre debe tener entre 2 y 80 caracteres");
    }
  }

  // Avatar is expected to be a URL from /api/upload (validated there).
  // Defensive: reject anything that isn't a relative /uploads/... path or https URL.
  if (data.avatar !== undefined && data.avatar !== null) {
    const ok =
      data.avatar.startsWith("/uploads/") ||
      data.avatar.startsWith("https://");
    if (!ok) throw new Error("URL de avatar inválida");
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/professor/settings");
  revalidatePath("/admin/settings");
  revalidatePath("/tenant-admin/settings");
  return { success: true };
}
