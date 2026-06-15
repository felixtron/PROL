"use server";

import { revalidatePath } from "next/cache";
import { db, Prisma } from "@prol/db";
import { requireUser } from "@/lib/auth";

export async function createModule(courseId: string, formData: FormData) {
  const user = await requireUser();

  const course = await db.course.findFirst({
    where: { id: courseId, professorId: user.id },
    // Solo módulos de nivel superior para calcular la siguiente posición
    // (los submódulos tienen su propio espacio de posiciones por padre).
    include: {
      modules: { where: { parentModuleId: null }, select: { position: true } },
    },
  });
  if (!course) throw new Error("Curso no encontrado");

  const title = formData.get("title") as string;
  if (!title || title.length < 2) throw new Error("El título es requerido");

  const maxPosition = course.modules.reduce(
    (max, m) => Math.max(max, m.position),
    -1
  );

  await db.module.create({
    data: {
      title,
      position: maxPosition + 1,
      courseId,
    },
  });

  revalidatePath(`/professor/courses/${courseId}/edit`);
  return { success: true };
}

export async function updateModule(moduleId: string, formData: FormData) {
  const user = await requireUser();
  const title = formData.get("title") as string;

  const module = await db.module.findFirst({
    where: { id: moduleId },
    include: { course: { select: { professorId: true, id: true } } },
  });
  if (!module || module.course.professorId !== user.id)
    throw new Error("No autorizado");

  await db.module.update({
    where: { id: moduleId },
    data: { title },
  });

  revalidatePath(`/professor/courses/${module.course.id}/edit`);
  return { success: true };
}

export async function deleteModule(moduleId: string) {
  const user = await requireUser();

  const module = await db.module.findFirst({
    where: { id: moduleId },
    include: {
      course: { select: { professorId: true, id: true } },
    },
  });
  if (!module || module.course.professorId !== user.id)
    throw new Error("No autorizado");

  // Borrado del módulo + cascade de sus lecciones Y de sus submódulos (con
  // las lecciones de éstos). Decrementamos course.totalLessons por el
  // SUBÁRBOL completo — lecciones directas del módulo + lecciones de sus
  // submódulos — si no, el contador queda desfasado y los enrollments se
  // atascan por debajo del 100% (caso ISO 27001: 177 vs 140 reales tras
  // borrar módulos en producción).
  const subtreeLessons = await db.lesson.count({
    where: {
      OR: [{ moduleId }, { module: { parentModuleId: moduleId } }],
    },
  });

  await db.$transaction([
    db.module.delete({ where: { id: moduleId } }),
    ...(subtreeLessons > 0
      ? [
          db.course.update({
            where: { id: module.course.id },
            data: {
              totalLessons: { decrement: subtreeLessons },
            },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/professor/courses/${module.course.id}/edit`);
  return { success: true };
}

/**
 * Crea un submódulo dentro de un módulo (1 nivel de anidamiento). El
 * submódulo es un Module con `parentModuleId` apuntando al padre y el mismo
 * `courseId` — así toda la navegación lesson → module → course sigue válida.
 * La posición es la siguiente entre los submódulos hermanos.
 */
export async function createSubmodule(
  parentModuleId: string,
  formData: FormData,
) {
  const user = await requireUser();

  const parent = await db.module.findFirst({
    where: { id: parentModuleId },
    include: {
      course: { select: { professorId: true, id: true } },
      submodules: { select: { position: true } },
    },
  });
  if (!parent || parent.course.professorId !== user.id)
    throw new Error("No autorizado");
  // Defensa: no permitir anidar un submódulo dentro de otro submódulo
  // (solo 1 nivel). Un módulo top-level tiene parentModuleId null.
  if (parent.parentModuleId !== null)
    throw new Error("No se permite anidar submódulos en más de un nivel");

  const title = formData.get("title") as string;
  if (!title || title.length < 2) throw new Error("El título es requerido");

  const maxPosition = parent.submodules.reduce(
    (max, s) => Math.max(max, s.position),
    -1,
  );

  await db.module.create({
    data: {
      title,
      position: maxPosition + 1,
      courseId: parent.course.id,
      parentModuleId,
    },
  });

  revalidatePath(`/professor/courses/${parent.course.id}/edit`);
  return { success: true };
}

/**
 * Move a module up or down within its course by swapping its `position`
 * with the adjacent module. No-op if the module is already at the edge.
 */
export async function moveModule(
  moduleId: string,
  direction: "up" | "down",
) {
  const user = await requireUser();

  const module = await db.module.findFirst({
    where: { id: moduleId },
    include: { course: { select: { professorId: true, id: true } } },
  });
  if (!module || module.course.professorId !== user.id)
    throw new Error("No autorizado");

  // El swap es entre HERMANOS: módulos top-level entre sí (parentModuleId
  // null) y submódulos entre los de su mismo padre.
  const neighbor = await db.module.findFirst({
    where: {
      courseId: module.course.id,
      parentModuleId: module.parentModuleId,
      position:
        direction === "up"
          ? { lt: module.position }
          : { gt: module.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) {
    return { success: true, moved: false };
  }

  await db.$transaction([
    db.module.update({
      where: { id: module.id },
      data: { position: neighbor.position },
    }),
    db.module.update({
      where: { id: neighbor.id },
      data: { position: module.position },
    }),
  ]);

  revalidatePath(`/professor/courses/${module.course.id}/edit`);
  return { success: true, moved: true };
}

export async function createLesson(moduleId: string, formData: FormData) {
  const user = await requireUser();

  const module = await db.module.findFirst({
    where: { id: moduleId },
    include: {
      course: { select: { professorId: true, id: true } },
      lessons: { select: { position: true } },
    },
  });
  if (!module || module.course.professorId !== user.id)
    throw new Error("No autorizado");

  const title = formData.get("title") as string;
  const type = (formData.get("type") as string) || "VIDEO";
  if (!title || title.length < 3) throw new Error("El título es requerido");

  const maxPosition = module.lessons.reduce(
    (max, l) => Math.max(max, l.position),
    -1
  );

  await db.$transaction([
    db.lesson.create({
      data: {
        title,
        type: type as "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "MULTI",
        position: maxPosition + 1,
        moduleId,
      },
    }),
    db.course.update({
      where: { id: module.course.id },
      data: { totalLessons: { increment: 1 } },
    }),
  ]);

  revalidatePath(`/professor/courses/${module.course.id}/edit`);
  return { success: true };
}

export async function updateLesson(
  lessonId: string,
  data: {
    title?: string;
    type?: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "MULTI" | "DOWNLOAD";
    // Lesson.content is Prisma's Json column. Accept anything serialisable
    // so callers can pass a plain string (markdown for TEXT) or a structured
    // object (e.g. { fileUrl, fileName, ... } for DOWNLOAD).
    content?: Prisma.InputJsonValue;
  }
) {
  const user = await requireUser();

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: { select: { professorId: true, id: true } } },
      },
    },
  });
  if (!lesson || lesson.module.course.professorId !== user.id)
    throw new Error("No autorizado");

  await db.lesson.update({
    where: { id: lessonId },
    data: {
      ...(data.title ? { title: data.title } : {}),
      ...(data.type ? { type: data.type } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
    },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true };
}

/**
 * Move a lesson up or down within its module by swapping its `position`
 * with the adjacent lesson. No-op if the lesson is already at the
 * requested edge.
 */
export async function moveLesson(
  lessonId: string,
  direction: "up" | "down",
) {
  const user = await requireUser();

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: { select: { professorId: true, id: true } } },
      },
    },
  });
  if (!lesson || lesson.module.course.professorId !== user.id)
    throw new Error("No autorizado");

  const neighbor = await db.lesson.findFirst({
    where: {
      moduleId: lesson.moduleId,
      position:
        direction === "up"
          ? { lt: lesson.position }
          : { gt: lesson.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) {
    return { success: true, moved: false };
  }

  // Swap positions atomically. Since (moduleId, position) is not unique,
  // we can do a simple two-step update inside a transaction.
  await db.$transaction([
    db.lesson.update({
      where: { id: lesson.id },
      data: { position: neighbor.position },
    }),
    db.lesson.update({
      where: { id: neighbor.id },
      data: { position: lesson.position },
    }),
  ]);

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true, moved: true };
}

/**
 * Mueve una lección a otro contenedor (módulo o submódulo) DENTRO del mismo
 * curso — reparenting. Caso de uso: agrupar lecciones sueltas de un módulo
 * dentro de un submódulo, o sacarlas de vuelta al módulo principal.
 *
 * Solo cambia `moduleId` + `position` (al final del destino). NO toca
 * course.totalLessons (la lección sigue en el curso) y la navegación
 * lesson → module → course se mantiene (el destino conserva su courseId).
 */
export async function moveLessonToContainer(
  lessonId: string,
  targetModuleId: string,
) {
  const user = await requireUser();

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: { select: { professorId: true, id: true } } },
      },
    },
  });
  if (!lesson || lesson.module.course.professorId !== user.id)
    throw new Error("No autorizado");

  if (targetModuleId === lesson.moduleId) {
    return { success: true, moved: false };
  }

  const target = await db.module.findFirst({
    where: { id: targetModuleId },
    include: {
      course: { select: { id: true } },
      lessons: { select: { position: true } },
    },
  });
  if (!target) throw new Error("Destino no encontrado");
  if (target.course.id !== lesson.module.course.id)
    throw new Error("El destino pertenece a otro curso");

  const maxPosition = target.lessons.reduce(
    (max, l) => Math.max(max, l.position),
    -1,
  );

  await db.lesson.update({
    where: { id: lessonId },
    data: { moduleId: targetModuleId, position: maxPosition + 1 },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true, moved: true };
}

export async function deleteLesson(lessonId: string) {
  const user = await requireUser();

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: { select: { professorId: true, id: true } } },
      },
    },
  });
  if (!lesson || lesson.module.course.professorId !== user.id)
    throw new Error("No autorizado");

  await db.$transaction([
    db.lesson.delete({ where: { id: lessonId } }),
    db.course.update({
      where: { id: lesson.module.course.id },
      data: { totalLessons: { decrement: 1 } },
    }),
  ]);

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true };
}

export async function publishCourse(courseId: string) {
  const user = await requireUser();

  const course = await db.course.findFirst({
    where: { id: courseId, professorId: user.id },
    select: { id: true, title: true },
  });
  if (!course) throw new Error("Curso no encontrado");

  // Cuenta TODAS las lecciones del curso (módulos + submódulos) vía la
  // relación lesson → module → course, sin asumir la jerarquía.
  const totalLessons = await db.lesson.count({
    where: { module: { courseId } },
  });
  if (totalLessons === 0)
    throw new Error("El curso debe tener al menos una lección");

  if (!course.title || course.title.length < 3)
    throw new Error("El curso debe tener un título válido");

  await db.course.update({
    where: { id: courseId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      totalLessons,
    },
  });

  revalidatePath(`/professor/courses/${courseId}/edit`);
  revalidatePath("/professor/courses");
  return { success: true };
}
