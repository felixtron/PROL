"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { sendEmail, enrollmentConfirmation } from "@prol/email";
import { requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { issueCertificateForEnrollment } from "@/lib/certificate-issuer";
import crypto from "crypto";

export async function enrollInCourse(courseId: string) {
  const user = await requireUser();

  // Check if already enrolled
  const existing = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId } },
  });
  if (existing) throw new Error("Ya estás inscrito en este curso");

  // Verify course exists and is published
  const course = await db.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
  });
  if (!course) throw new Error("Curso no disponible");

  const enrollment = await db.enrollment.create({
    data: {
      studentId: user.id,
      courseId,
      tenantId: course.tenantId,
    },
  });

  // Create enrollment notification
  try {
    await createNotification({
      userId: user.id,
      tenantId: course.tenantId,
      type: "ENROLLMENT",
      title: "Inscripción exitosa",
      message: `Te has inscrito exitosamente al curso "${course.title}".`,
      link: `/dashboard/courses/${courseId}`,
    });
  } catch (notifError) {
    console.error("Error creando notificación de inscripción:", notifError);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");

  // Send enrollment confirmation email (non-blocking — failures don't affect enrollment)
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://prol.prosuite.pro";
    const courseUrl = `${appUrl}/dashboard/courses/${courseId}`;
    const tenantName = user.tenant?.name ?? "PROL";

    const emailData = enrollmentConfirmation({
      name: user.name ?? "Estudiante",
      courseName: course.title,
      courseUrl,
      tenantName,
    });

    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
    });
  } catch (emailError) {
    console.error("Error enviando email de inscripción:", emailError);
  }

  return { success: true, enrollmentId: enrollment.id };
}

export async function updateLessonProgress(
  enrollmentId: string,
  lessonId: string,
  data: { status?: "IN_PROGRESS" | "COMPLETED"; videoPositionSeconds?: number }
) {
  // Preview mode: the synthetic enrollment id used by professors/admins
  // viewing their own course doesn't correspond to a real DB row. We
  // accept the call and skip persistence so the client UI still works.
  if (enrollmentId.startsWith("preview-")) {
    return { success: true, preview: true as const, lessonProgressId: null };
  }

  const user = await requireUser();

  // Verify enrollment belongs to user
  const enrollment = await db.enrollment.findFirst({
    where: { id: enrollmentId, studentId: user.id },
    include: { course: { select: { id: true, totalLessons: true } } },
  });
  if (!enrollment) throw new Error("Inscripción no encontrada");

  // Atomically: upsert lesson progress and recompute enrollment progress
  // (and mark COMPLETED if all lessons done). Certificate issuance + the
  // notification are post-commit side-effects: issueCertificateForEnrollment
  // opens its own $transaction and is idempotent, so a transient failure
  // does not leave inconsistent state.
  const { progress, becameCompleted } = await db.$transaction(async (tx) => {
    const upserted = await tx.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: {
        enrollmentId,
        lessonId,
        status: data.status ?? "IN_PROGRESS",
        videoPositionSeconds: data.videoPositionSeconds ?? 0,
        ...(data.status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
      update: {
        status: data.status,
        videoPositionSeconds: data.videoPositionSeconds,
        ...(data.status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });

    if (data.status !== "COMPLETED") {
      return { progress: upserted, becameCompleted: false };
    }

    const completedCount = await tx.lessonProgress.count({
      where: { enrollmentId, status: "COMPLETED" },
    });
    const newProgress =
      enrollment.course.totalLessons > 0
        ? completedCount / enrollment.course.totalLessons
        : 0;

    if (newProgress >= 1.0) {
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          progress: newProgress,
        },
      });
      return { progress: upserted, becameCompleted: true };
    }

    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { progress: newProgress },
    });
    return { progress: upserted, becameCompleted: false };
  });

  // Side-effect after commit: auto-issue certificate when the course just
  // became fully completed AND there's no final exam (the quiz flow handles
  // certificates when there is one).
  if (becameCompleted) {
    try {
      const courseHasFinalExam = await db.quiz.findFirst({
        where: {
          isFinalExam: true,
          lesson: { module: { courseId: enrollment.course.id } },
        },
        select: { id: true },
      });
      if (!courseHasFinalExam) {
        const result = await issueCertificateForEnrollment(enrollmentId);
        if (result.folio) {
          try {
            await createNotification({
              userId: user.id,
              tenantId: enrollment.tenantId,
              type: "CERTIFICATE",
              title: "Certificado emitido",
              message: `Has completado el curso y tu certificado está listo.`,
              link: `/verify/${result.folio}`,
            });
          } catch (notifError) {
            console.error("Error creando notificación de certificado:", notifError);
          }
        }
      }
    } catch (certError) {
      console.error("Error emitiendo certificado:", certError);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/certificates");
  return { success: true, lessonProgressId: progress.id };
}
