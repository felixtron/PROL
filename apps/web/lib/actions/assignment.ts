"use server";

import { revalidatePath } from "next/cache";
import { db, Prisma } from "@prol/db";
import { requireUser } from "@/lib/auth";
import type { AssignmentContent } from "@/lib/assignment-content";

// ─── Professor: configure the assignment ──────────────────────────────────────

export async function updateAssignment(
  lessonId: string,
  data: {
    instructions: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    dueAt?: string | null;
  }
) {
  const user = await requireUser();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: { select: { id: true, professorId: true } } } },
    },
  });
  if (!lesson) throw new Error("Lección no encontrada");
  if (lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }
  if (lesson.type !== "ASSIGNMENT") {
    throw new Error("Esta acción solo aplica a lecciones tipo tarea");
  }

  const trimmed = data.instructions?.trim() ?? "";
  if (trimmed.length < 10) {
    throw new Error("Las instrucciones deben tener al menos 10 caracteres");
  }

  const content: AssignmentContent = {
    instructions: trimmed,
    fileUrl: data.fileUrl ?? null,
    fileName: data.fileName ?? null,
    fileSize: data.fileSize ?? null,
    dueAt: data.dueAt ?? null,
  };

  await db.lesson.update({
    where: { id: lessonId },
    data: { content: content as unknown as Prisma.InputJsonValue },
  });

  revalidatePath(`/professor/courses/${lesson.module.course.id}/edit`);
  return { success: true };
}

// ─── Student: submit the assignment ───────────────────────────────────────────

export async function submitAssignment(
  enrollmentId: string,
  lessonId: string,
  data: {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    notes?: string;
  }
) {
  const user = await requireUser();

  const enrollment = await db.enrollment.findFirst({
    where: { id: enrollmentId, studentId: user.id },
    select: { id: true, courseId: true, tenantId: true },
  });
  if (!enrollment) throw new Error("Inscripción no encontrada");

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson || lesson.module.courseId !== enrollment.courseId) {
    throw new Error("Lección inválida");
  }
  if (lesson.type !== "ASSIGNMENT") {
    throw new Error("Esta lección no es una tarea");
  }
  if (!data.fileUrl && !data.notes?.trim()) {
    throw new Error("Sube un archivo o escribe una respuesta");
  }

  const submission = await db.assignmentSubmission.upsert({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    create: {
      enrollmentId,
      lessonId,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      fileSize: data.fileSize ?? null,
      notes: data.notes?.trim() ?? null,
      status: "SUBMITTED",
    },
    update: {
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      fileSize: data.fileSize ?? null,
      notes: data.notes?.trim() ?? null,
      status: "SUBMITTED",
      submittedAt: new Date(),
      // Reset feedback when re-submitting
      grade: null,
      feedback: null,
      reviewedAt: null,
    },
  });

  // Mark lesson as completed (the actual grading happens later by professor)
  await db.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    create: {
      enrollmentId,
      lessonId,
      status: "COMPLETED",
      completedAt: new Date(),
    },
    update: { status: "COMPLETED", completedAt: new Date() },
  });

  revalidatePath(`/dashboard/courses/${enrollment.courseId}`);
  return { success: true, submissionId: submission.id };
}

// ─── Professor: grade a submission ────────────────────────────────────────────

export async function gradeAssignment(
  submissionId: string,
  data: { grade: number; feedback?: string }
) {
  const user = await requireUser();

  const submission = await db.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      lesson: {
        include: {
          module: {
            include: { course: { select: { id: true, professorId: true } } },
          },
        },
      },
    },
  });
  if (!submission) throw new Error("Entrega no encontrada");
  if (submission.lesson.module.course.professorId !== user.id) {
    throw new Error("No autorizado");
  }
  if (data.grade < 0 || data.grade > 100) {
    throw new Error("La calificación debe estar entre 0 y 100");
  }

  await db.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      grade: data.grade,
      feedback: data.feedback?.trim() ?? null,
      status: "REVIEWED",
      reviewedAt: new Date(),
    },
  });

  return { success: true };
}

