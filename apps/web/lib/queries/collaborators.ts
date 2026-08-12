import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

/**
 * Colaboradores de un curso, más los profesores del tenant que todavía se
 * pueden invitar.
 *
 * Cualquiera con acceso al curso puede ver la lista; solo el dueño y los
 * admins del tenant pueden modificarla (`canManage`).
 */
export const getCourseCollaborators = cache(async (courseId: string) => {
  const user = await requireUser();

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      tenantId: true,
      professorId: true,
      professor: { select: { id: true, name: true, email: true } },
      collaborators: {
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!course) throw new Error("Curso no encontrado");

  const isOwner = course.professorId === user.id;
  const isCollaborator = course.collaborators.some(
    (c) => c.user.id === user.id,
  );
  const isTenantAdmin =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.tenantId === course.tenantId);
  if (!isOwner && !isCollaborator && !isTenantAdmin) {
    throw new Error("No autorizado");
  }

  const canManage = isOwner || isTenantAdmin;

  // Profesores del mismo tenant que aún no participan. Solo se cargan si
  // quien mira puede invitar; el filtrado por nombre es en el cliente.
  const excluded = [
    course.professorId,
    ...course.collaborators.map((c) => c.user.id),
  ];
  const assignable = canManage
    ? await db.user.findMany({
        where: {
          tenantId: course.tenantId,
          role: "PROFESSOR",
          disabledAt: null,
          id: { notIn: excluded },
        },
        select: { id: true, name: true, email: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        take: 500,
      })
    : [];

  return {
    owner: course.professor,
    collaborators: course.collaborators.map((c) => ({
      ...c.user,
      addedAt: c.createdAt,
    })),
    assignable,
    canManage,
  };
});
