"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

export async function createModule(courseId: string, formData: FormData) {
  const user = await requireUser();

  const course = await db.course.findFirst({
    where: { id: courseId, professorId: user.id },
    include: { modules: { select: { position: true } } },
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
    include: { course: { select: { professorId: true, id: true } } },
  });
  if (!module || module.course.professorId !== user.id)
    throw new Error("No autorizado");

  await db.module.delete({ where: { id: moduleId } });

  revalidatePath(`/professor/courses/${module.course.id}/edit`);
  return { success: true };
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
        type: type as "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT",
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
  data: { title?: string; type?: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT"; content?: string }
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
    include: { modules: { include: { lessons: true } } },
  });
  if (!course) throw new Error("Curso no encontrado");

  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );
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
