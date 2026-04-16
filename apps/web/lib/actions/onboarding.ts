"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function createTenant(formData: FormData) {
  const user = await requireUser();

  // Only users without a tenant can create one
  if (user.tenantId) {
    throw new Error("Ya tienes una academia asociada");
  }

  const name = formData.get("name") as string;
  const contactEmail = formData.get("contactEmail") as string;

  if (!name || name.length < 2) {
    throw new Error("El nombre de la academia es requerido (minimo 2 caracteres)");
  }

  if (!contactEmail) {
    throw new Error("El correo de contacto es requerido");
  }

  // Generate slug from name
  let slug = slugify(name);

  // Ensure slug is unique
  const existing = await db.tenant.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Create tenant and update user in a transaction
  const tenant = await db.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: {
        name,
        slug,
        contactEmail,
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day trial
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        tenantId: newTenant.id,
        role: "PROFESSOR",
        onboardingCompleted: true,
      },
    });

    return newTenant;
  });

  revalidatePath("/professor");
  redirect("/professor");
}
