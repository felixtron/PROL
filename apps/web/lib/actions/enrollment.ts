"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { sendEmail, enrollmentConfirmation } from "@prol/email";
import { requireUser, requireTenantAdmin, assertSameTenant } from "@/lib/auth";
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

  // Defensa: sólo permitimos inscripción directa cuando el curso es gratis
  // o cuando la empresa del alumno tiene asignación activa (no expirada).
  // En cualquier otro caso, el cliente debe pasar por createCheckoutSession.
  // Sin este guard, cualquier usuario podría inscribirse a un curso de pago
  // bypassando Stripe llamando esta server action directamente.
  if (course.priceInCents > 0) {
    let coveredByCompany = false;
    if (user.companyId) {
      const assignment = await db.companyCourseAssignment.findUnique({
        where: {
          companyId_courseId: { companyId: user.companyId, courseId },
        },
        select: { isActive: true, expiresAt: true },
      });
      coveredByCompany =
        !!assignment?.isActive &&
        (!assignment.expiresAt || assignment.expiresAt > new Date());
    }
    if (!coveredByCompany) {
      throw new Error("Este curso requiere pago; usa el flujo de checkout");
    }
  }

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

/**
 * Inscripción manual hecha por un tenant admin. Pensado para casos donde el
 * pago ocurre por fuera del checkout (transferencia, efectivo, regalo, beca).
 * Crea (idempotente) un Enrollment y, opcionalmente, un CoursePayment con
 * stripePaymentId prefijado `manual-` para distinguirlo de los pagos Stripe.
 *
 * El admin no necesita pasar por `enrollInCourse`, que rechaza B2C en cursos
 * de pago — esa restricción protege contra usuarios bypassando Stripe, no
 * contra administradores.
 */
export async function manualEnrollStudent(input: {
  studentId: string;
  courseId: string;
  recordPayment: boolean;
  amountInCents?: number; // si recordPayment, default = course.priceInCents
  paymentMethod?: "SPEI" | "OXXO" | "CARD"; // default SPEI (transferencia)
  sendWelcomeEmail: boolean;
}): Promise<{
  success: true;
  enrollmentId: string;
  paymentId: string | null;
  alreadyEnrolled: boolean;
}> {
  const admin = await requireTenantAdmin();

  const [student, course] = await Promise.all([
    db.user.findUnique({
      where: { id: input.studentId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        disabledAt: true,
        tenant: { select: { name: true } },
      },
    }),
    db.course.findUnique({
      where: { id: input.courseId },
      select: {
        id: true,
        title: true,
        tenantId: true,
        status: true,
        priceInCents: true,
        currency: true,
        tenant: { select: { revenueShareRate: true } },
      },
    }),
  ]);

  if (!student) throw new Error("Alumno no encontrado");
  if (!course) throw new Error("Curso no encontrado");
  if (!student.tenantId) throw new Error("El usuario no pertenece a ningún tenant");
  if (student.tenantId !== course.tenantId) {
    throw new Error("Alumno y curso pertenecen a tenants distintos");
  }
  assertSameTenant(admin, student.tenantId);
  if (student.role !== "STUDENT") {
    throw new Error("Solo se pueden inscribir usuarios con rol Alumno");
  }
  if (student.disabledAt) {
    throw new Error("El alumno está deshabilitado");
  }
  if (course.status === "ARCHIVED") {
    throw new Error("No se puede inscribir a un curso archivado");
  }

  const existing = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    select: { id: true },
  });

  const amount = input.recordPayment
    ? Math.max(0, input.amountInCents ?? course.priceInCents)
    : 0;
  const paymentMethod = input.paymentMethod ?? "SPEI";

  let paymentId: string | null = null;

  if (input.recordPayment) {
    const revenueShareRate = course.tenant.revenueShareRate;
    const prolFee = Math.round(amount * revenueShareRate);
    const creatorReceives = amount - prolFee;

    const payment = await db.coursePayment.create({
      data: {
        tenantId: course.tenantId,
        studentId: student.id,
        courseId: course.id,
        amount,
        currency: course.currency,
        revenueShareRate,
        prolFee,
        creatorReceives,
        stripeFee: 0,
        stripePaymentId: `manual-${crypto.randomBytes(12).toString("base64url")}`,
        paymentMethod,
        status: "COMPLETED",
        paidAt: new Date(),
      },
    });
    paymentId = payment.id;
  }

  // Upsert para que dos clicks del admin no fallen con violation de unique.
  const enrollment = await db.enrollment.upsert({
    where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    create: {
      studentId: student.id,
      courseId: course.id,
      tenantId: course.tenantId,
    },
    update: {}, // ya estaba inscrito, no tocamos progreso ni status
  });

  try {
    await createNotification({
      userId: student.id,
      tenantId: course.tenantId,
      type: "ENROLLMENT",
      title: existing ? "Curso reactivado" : "Inscripción exitosa",
      message: `Te han inscrito al curso "${course.title}".`,
      link: `/dashboard/courses/${course.id}`,
    });
  } catch (err) {
    console.error("Error creando notificación de inscripción manual:", err);
  }

  if (input.sendWelcomeEmail) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://prol.prosuite.pro";
      const courseUrl = `${appUrl}/dashboard/courses/${course.id}`;
      const tenantName = student.tenant?.name ?? "PROL";
      const emailData = enrollmentConfirmation({
        name: student.name ?? "Estudiante",
        courseName: course.title,
        courseUrl,
        tenantName,
      });
      await sendEmail({
        to: student.email,
        subject: emailData.subject,
        html: emailData.html,
      });
    } catch (err) {
      console.error("Error enviando email de inscripción manual:", err);
    }
  }

  revalidatePath("/tenant-admin/users");
  revalidatePath("/tenant-admin/courses");
  revalidatePath(`/dashboard/courses/${course.id}`);

  return {
    success: true,
    enrollmentId: enrollment.id,
    paymentId,
    alreadyEnrolled: !!existing,
  };
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
    // Serialize concurrent updates for THIS enrollment so the
    // `count completed lessons → write progress` sequence below is
    // free of lost updates. Without this, two transactions marking
    // different lessons COMPLETED at the same time can each compute a
    // stale count and leave Enrollment.progress one step behind reality
    // (and worse: prevent the auto-COMPLETED + certificate side effect
    // from firing on the last lesson). The lock is released at commit.
    await tx.$queryRaw`SELECT 1 FROM enrollments WHERE id = ${enrollmentId} FOR UPDATE`;

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
