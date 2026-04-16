"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

async function requireAIEnabled() {
  const user = await requireUser();
  if (!user.tenantId) throw new Error("Sin tenant asignado");

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { aiEnabled: true },
  });

  if (!tenant?.aiEnabled) throw new Error("Modulo de AI no habilitado");
  return user;
}

export async function startCourseOutlineGeneration(formData: FormData) {
  const user = await requireAIEnabled();

  const topic = formData.get("topic") as string;
  const audience = formData.get("audience") as string;
  const moduleCount = Number(formData.get("moduleCount") || 3);
  const lessonsPerModule = Number(formData.get("lessonsPerModule") || 5);
  const level = (formData.get("level") as string) || "intermediate";

  if (!topic?.trim()) throw new Error("El tema es requerido");
  if (!audience?.trim()) throw new Error("La audiencia es requerida");

  const job = await db.aIGenerationJob.create({
    data: {
      tenantId: user.tenantId!,
      userId: user.id,
      type: "COURSE_OUTLINE",
      status: "PENDING",
      input: { topic, audience, moduleCount, lessonsPerModule, level },
    },
  });

  // In production, this would trigger the worker job via Trigger.dev
  // For now, return the job ID for polling
  return { success: true, jobId: job.id };
}

export async function startVideoTranscription(lessonId: string) {
  const user = await requireAIEnabled();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      videoUrl: true,
      title: true,
      module: {
        select: {
          courseId: true,
          course: { select: { professorId: true } },
        },
      },
    },
  });

  if (!lesson) throw new Error("Leccion no encontrada");
  if (lesson.module.course.professorId !== user.id)
    throw new Error("No autorizado");
  if (!lesson.videoUrl) throw new Error("No hay video para transcribir");

  const job = await db.aIGenerationJob.create({
    data: {
      tenantId: user.tenantId!,
      userId: user.id,
      type: "VIDEO_TRANSCRIPTION",
      status: "PENDING",
      input: { lessonId, videoUrl: lesson.videoUrl },
      entityType: "lesson",
      entityId: lessonId,
    },
  });

  await db.lesson.update({
    where: { id: lessonId },
    data: { aiStatus: "pending" },
  });

  revalidatePath(`/professor/courses/${lesson.module.courseId}/edit`);
  return { success: true, jobId: job.id };
}

export async function startLessonContentGeneration(lessonId: string) {
  const user = await requireAIEnabled();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      type: true,
      module: {
        select: {
          courseId: true,
          course: { select: { professorId: true } },
        },
      },
    },
  });

  if (!lesson) throw new Error("Leccion no encontrada");
  if (lesson.module.course.professorId !== user.id)
    throw new Error("No autorizado");
  if (lesson.type === "VIDEO")
    throw new Error("Usa transcripcion para lecciones de video");

  const job = await db.aIGenerationJob.create({
    data: {
      tenantId: user.tenantId!,
      userId: user.id,
      type: "LESSON_CONTENT",
      status: "PENDING",
      input: { lessonId },
      entityType: "lesson",
      entityId: lessonId,
    },
  });

  await db.lesson.update({
    where: { id: lessonId },
    data: { aiStatus: "pending" },
  });

  revalidatePath(`/professor/courses/${lesson.module.courseId}/edit`);
  return { success: true, jobId: job.id };
}

export async function getAIJobStatus(jobId: string) {
  const user = await requireUser();

  const job = await db.aIGenerationJob.findFirst({
    where: { id: jobId, userId: user.id },
    select: {
      id: true,
      status: true,
      output: true,
      error: true,
      completedAt: true,
    },
  });

  if (!job) throw new Error("Job no encontrado");
  return job;
}
