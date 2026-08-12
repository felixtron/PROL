"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import {
  assertCourseOwnerAccess,
  courseAccessWhere,
  isCourseManager,
} from "@/lib/course-access";
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
    where: { id: courseId, ...courseAccessWhere(user.id) },
  });
  if (!existing) throw new Error("Curso no encontrado");

  const raw = {
    title: formData.get("title") ?? undefined,
    description: formData.get("description") ?? undefined,
    priceInCents: formData.get("priceInCents") ? Number(formData.get("priceInCents")) : undefined,
  };

  const validated = updateCourseSchema.parse(raw);

  // Precio y título son decisiones del dueño, no del colaborador: el precio
  // porque puede quedar desalineado con los links de pago ya creados en
  // Stripe, y el título porque regenera el slug y rompe cualquier enlace
  // externo a /courses/<slug>. Se compara contra el valor actual —y no se
  // rechaza el campo— porque el formulario los manda siempre, se hayan
  // tocado o no.
  if (!isCourseManager(existing, user)) {
    if (
      validated.priceInCents !== undefined &&
      validated.priceInCents !== existing.priceInCents
    ) {
      throw new Error("Solo el dueño del curso puede cambiar el precio");
    }
    if (validated.title !== undefined && validated.title !== existing.title) {
      throw new Error("Solo el dueño del curso puede cambiar el título");
    }
  }

  const category = formData.get("category") as string | null;
  const certificateDescriptionRaw = formData.get("certificateDescription");
  const certificateDescription =
    typeof certificateDescriptionRaw === "string"
      ? certificateDescriptionRaw.trim() || null
      : undefined;

  await db.course.update({
    where: { id: courseId },
    data: {
      ...validated,
      ...(validated.title ? { slug: slugify(validated.title) } : {}),
      ...(category !== null ? { category: category || null } : {}),
      ...(certificateDescription !== undefined
        ? { certificateDescription }
        : {}),
    },
  });

  revalidatePath("/professor/courses");
  revalidatePath(`/professor/courses/${courseId}`);
  return { success: true };
}

export async function archiveCourse(courseId: string) {
  // Archivar saca el curso de circulación: queda fuera de lo que puede
  // hacer un colaborador. Solo el dueño (o un admin del tenant).
  const { course: existing } = await assertCourseOwnerAccess(courseId);

  await db.course.update({
    where: { id: existing.id },
    data: { status: "ARCHIVED" },
  });

  revalidatePath("/professor/courses");
  return { success: true };
}

export async function updateCourseThumbnail(courseId: string, thumbnailUrl: string) {
  const user = await requireUser();

  const existing = await db.course.findFirst({
    where: { id: courseId, ...courseAccessWhere(user.id) },
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
