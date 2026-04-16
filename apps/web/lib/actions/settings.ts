"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  if (!name || name.length < 2) throw new Error("El nombre es requerido");

  await db.user.update({
    where: { id: user.id },
    data: { name },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/professor/settings");
  revalidatePath("/professor");
}
