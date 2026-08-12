import { db, Prisma } from "@prol/db";
import { requireUser } from "@/lib/auth";

/**
 * Autorización de cursos en un solo lugar.
 *
 * Un curso tiene un dueño (`Course.professorId`) y, opcionalmente,
 * profesores colaboradores invitados a co-crearlo (`CourseCollaborator`).
 * El colaborador puede hacer todo sobre el curso —editar contenido,
 * publicarlo, ver a sus alumnos— MENOS archivarlo, transferirlo o
 * administrar la lista de colaboradores: eso queda para el dueño y para los
 * admins del tenant.
 */

/** Filtro de cursos sobre los que el usuario puede trabajar. */
export function courseAccessWhere(userId: string): Prisma.CourseWhereInput {
  return {
    OR: [{ professorId: userId }, { collaborators: { some: { userId } } }],
  };
}

/** ¿Puede este usuario editar el curso? */
export async function canEditCourse(
  courseId: string,
  userId: string,
): Promise<boolean> {
  const course = await db.course.findFirst({
    where: { id: courseId, ...courseAccessWhere(userId) },
    select: { id: true },
  });
  return course !== null;
}

/**
 * Lanza si el usuario no puede editar el curso. Es el gate que usan las
 * acciones que llegan por una entidad anidada (lección, módulo, quiz) y ya
 * resolvieron a qué curso pertenece.
 */
export async function assertCourseEditAccess(
  courseId: string,
  userId: string,
): Promise<void> {
  if (!(await canEditCourse(courseId, userId))) {
    throw new Error("No autorizado");
  }
}

/**
 * Gate de las acciones reservadas al dueño: archivar el curso y gestionar
 * colaboradores. Los admins del tenant también pasan.
 */
export async function assertCourseOwnerAccess(courseId: string) {
  const user = await requireUser();

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, professorId: true, tenantId: true, title: true },
  });
  if (!course) throw new Error("Curso no encontrado");

  const isOwner = course.professorId === user.id;
  const isTenantAdmin =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.tenantId === course.tenantId);
  if (!isOwner && !isTenantAdmin) throw new Error("No autorizado");

  return { user, course };
}
