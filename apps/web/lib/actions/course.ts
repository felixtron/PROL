"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { createCourseSchema, updateCourseSchema } from "@prol/shared";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createCourse(formData: FormData) {
  const user = await requireUser();

  if (user.role !== "PROFESSOR" && user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }

  const raw = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priceInCents: Number(formData.get("priceInCents") || 0),
  };

  const validated = createCourseSchema.parse(raw);
  const slug = slugify(validated.title);
  const category = (formData.get("category") as string) || undefined;

  const course = await db.course.create({
    data: {
      ...validated,
      slug,
      category,
      professorId: user.id,
      tenantId: user.tenantId!,
    },
  });

  revalidatePath("/professor/courses");
  return { success: true, courseId: course.id, slug: course.slug };
}

export async function updateCourse(courseId: string, formData: FormData) {
  const user = await requireUser();

  const existing = await db.course.findFirst({
    where: { id: courseId, professorId: user.id },
  });
  if (!existing) throw new Error("Curso no encontrado");

  const raw = {
    title: formData.get("title") ?? undefined,
    description: formData.get("description") ?? undefined,
    priceInCents: formData.get("priceInCents") ? Number(formData.get("priceInCents")) : undefined,
  };

  const validated = updateCourseSchema.parse(raw);
  const category = formData.get("category") as string | null;

  await db.course.update({
    where: { id: courseId },
    data: {
      ...validated,
      ...(validated.title ? { slug: slugify(validated.title) } : {}),
      ...(category !== null ? { category: category || null } : {}),
    },
  });

  revalidatePath("/professor/courses");
  revalidatePath(`/professor/courses/${courseId}`);
  return { success: true };
}

export async function archiveCourse(courseId: string) {
  const user = await requireUser();

  const existing = await db.course.findFirst({
    where: { id: courseId, professorId: user.id },
  });
  if (!existing) throw new Error("Curso no encontrado");

  await db.course.update({
    where: { id: courseId },
    data: { status: "ARCHIVED" },
  });

  revalidatePath("/professor/courses");
  return { success: true };
}

export async function updateCourseThumbnail(courseId: string, thumbnailUrl: string) {
  const user = await requireUser();

  const existing = await db.course.findFirst({
    where: { id: courseId, professorId: user.id },
  });
  if (!existing) throw new Error("Curso no encontrado");

  await db.course.update({
    where: { id: courseId },
    data: { thumbnail: thumbnailUrl },
  });

  revalidatePath("/professor/courses");
  revalidatePath(`/professor/courses/${courseId}`);
  revalidatePath(`/professor/courses/${courseId}/edit`);
  return { success: true };
}
