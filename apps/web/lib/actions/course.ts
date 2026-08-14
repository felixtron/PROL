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
import { isCertificateTemplateId } from "@/lib/certificate-templates/catalog";

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

  // Campos del diploma. `undefined` significa "el formulario no mandó este
  // campo", y entonces no se toca; un string vacío sí es una orden de
  // borrarlo. Distinguirlos importa porque hay formularios parciales.
  const diplomaField = (key: string, maxLength: number, label: string) => {
    const raw = formData.get(key);
    if (typeof raw !== "string") return undefined;
    const value = raw.trim();
    if (value.length > maxLength) {
      throw new Error(`${label} no puede exceder ${maxLength} caracteres`);
    }
    return value || null;
  };

  const certificateCode = diplomaField(
    "certificateCode",
    60,
    "El código del diploma"
  );
  const certificateCourseName = diplomaField(
    "certificateCourseName",
    200,
    "El nombre de la formación en el diploma"
  );
  const certificateDescription = diplomaField(
    "certificateDescription",
    1000,
    "El texto del diploma"
  );
  const certificateSignerName = diplomaField(
    "certificateSignerName",
    80,
    "El nombre de quien firma el diploma"
  );

  // Cadena vacía = "Automática": se guarda null y la plantilla la decide
  // el tenant, como antes de que esto fuera configurable.
  const templateRaw = formData.get("certificateTemplate");
  const certificateTemplate =
    typeof templateRaw !== "string"
      ? undefined
      : isCertificateTemplateId(templateRaw)
        ? templateRaw
        : null;

  await db.course.update({
    where: { id: courseId },
    data: {
      ...validated,
      ...(validated.title ? { slug: slugify(validated.title) } : {}),
      ...(category !== null ? { category: category || null } : {}),
      ...(certificateTemplate !== undefined ? { certificateTemplate } : {}),
      ...(certificateCode !== undefined ? { certificateCode } : {}),
      ...(certificateCourseName !== undefined
        ? { certificateCourseName }
        : {}),
      ...(certificateDescription !== undefined
        ? { certificateDescription }
        : {}),
      ...(certificateSignerName !== undefined
        ? { certificateSignerName }
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
