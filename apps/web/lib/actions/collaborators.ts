"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { assertCourseOwnerAccess } from "@/lib/course-access";

/**
 * Invita a otro profesor del tenant a co-crear el curso.
 *
 * Solo el dueño del curso (o un admin del tenant) puede hacerlo — un
 * colaborador no puede sumar más colaboradores.
 */
export async function addCourseCollaborator(courseId: string, userId: string) {
  const { user, course } = await assertCourseOwnerAccess(courseId);

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, tenantId: true, disabledAt: true },
  });
  if (!target) throw new Error("Usuario no encontrado");
  if (target.tenantId !== course.tenantId) {
    throw new Error("El profesor pertenece a otra academia");
  }
  if (target.role !== "PROFESSOR") {
    throw new Error("Solo un profesor puede colaborar en un curso");
  }
  if (target.disabledAt) throw new Error("El profesor está deshabilitado");
  if (target.id === course.professorId) {
    throw new Error("El dueño del curso ya tiene acceso");
  }

  // Idempotente: reinvitar a alguien que ya colabora no es un error.
  await db.courseCollaborator.upsert({
    where: { courseId_userId: { courseId, userId } },
    create: { courseId, userId, addedById: user.id },
    update: {},
  });

  revalidatePath(`/professor/courses/${courseId}/edit`);
  return { success: true };
}

/** Quita a un colaborador. El dueño nunca aparece en esta lista. */
export async function removeCourseCollaborator(
  courseId: string,
  userId: string,
) {
  await assertCourseOwnerAccess(courseId);

  await db.courseCollaborator.deleteMany({ where: { courseId, userId } });

  revalidatePath(`/professor/courses/${courseId}/edit`);
  return { success: true };
}
