"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { sendEmail, enrollmentConfirmation } from "@prol/email";
import { requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import crypto from "crypto";

export async function enrollInCourse(courseId: string) {
  const user = await requireUser();

  // Check if already enrolled
  const existing = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId } },
  });
  if (existing) throw new Error("Ya estas inscrito en este curso");

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
    console.error("Error enviando email de inscripcion:", emailError);
  }

  return { success: true, enrollmentId: enrollment.id };
}

export async function updateLessonProgress(
  enrollmentId: string,
  lessonId: string,
  data: { status?: "IN_PROGRESS" | "COMPLETED"; videoPositionSeconds?: number }
) {
  const user = await requireUser();

  // Verify enrollment belongs to user
  const enrollment = await db.enrollment.findFirst({
    where: { id: enrollmentId, studentId: user.id },
    include: { course: { select: { totalLessons: true } } },
  });
  if (!enrollment) throw new Error("Inscripcion no encontrada");

  const progress = await db.lessonProgress.upsert({
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

  // Recalculate enrollment progress
  if (data.status === "COMPLETED") {
    const completedCount = await db.lessonProgress.count({
      where: { enrollmentId, status: "COMPLETED" },
    });
    const newProgress = enrollment.course.totalLessons > 0
      ? completedCount / enrollment.course.totalLessons
      : 0;

    // Update enrollment status if all lessons are completed
    if (newProgress >= 1.0) {
      await db.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          progress: newProgress,
        },
      });

      // Auto-issue certificate upon course completion
      try {
        // Check if certificate already exists
        const existingCertificate = await db.certificate.findUnique({
          where: { enrollmentId },
        });

        if (!existingCertificate) {
          // Get course and professor info for the certificate
          const enrollmentWithDetails = await db.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
              course: {
                include: {
                  professor: {
                    select: { name: true },
                  },
                },
              },
            },
          });

          if (enrollmentWithDetails) {
            // Generate unique hash for certificate
            const hash = crypto.randomBytes(16).toString("hex");

            // Create certificate
            const certificate = await db.certificate.create({
              data: {
                enrollmentId,
                tenantId: enrollment.tenantId,
                studentName: user.name ?? "Estudiante",
                courseName: enrollmentWithDetails.course.title,
                professorName: enrollmentWithDetails.course.professor.name ?? "Profesor",
                hash,
              },
            });

            // Create certificate notification
            try {
              await createNotification({
                userId: user.id,
                tenantId: enrollment.tenantId,
                type: "CERTIFICATE",
                title: "Certificado emitido",
                message: `Has completado el curso "${enrollmentWithDetails.course.title}" y tu certificado está listo.`,
                link: `/verify/${hash}`,
              });
            } catch (notifError) {
              console.error("Error creando notificación de certificado:", notifError);
            }
          }
        }
      } catch (certError) {
        // Log error but don't fail the lesson completion
        console.error("Error emitiendo certificado:", certError);
      }
    } else {
      // Just update progress if not completed yet
      await db.enrollment.update({
        where: { id: enrollmentId },
        data: { progress: newProgress },
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/certificates");
  return { success: true, progressId: progress.id };
}
