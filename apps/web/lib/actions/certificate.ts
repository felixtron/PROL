"use server";

import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import crypto from "crypto";

/**
 * Issues a certificate for a completed enrollment.
 * Called automatically when a course is completed.
 */
export async function issueCertificate(enrollmentId: string) {
  const user = await requireUser();

  // Verify the enrollment exists, is COMPLETED, and belongs to the current user
  const enrollment = await db.enrollment.findFirst({
    where: {
      id: enrollmentId,
      studentId: user.id,
      status: "COMPLETED",
    },
    include: {
      course: {
        include: {
          professor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new Error("Inscripcion no encontrada o no completada");
  }

  // Check if a certificate already exists for this enrollment
  const existingCertificate = await db.certificate.findUnique({
    where: { enrollmentId },
  });

  if (existingCertificate) {
    return {
      success: true,
      certificateId: existingCertificate.id,
      message: "El certificado ya existe",
    };
  }

  // Generate a unique hash for the certificate
  const hash = crypto.randomBytes(16).toString("hex");

  // Create the certificate record
  const certificate = await db.certificate.create({
    data: {
      enrollmentId,
      tenantId: enrollment.tenantId,
      studentName: user.name ?? "Estudiante",
      courseName: enrollment.course.title,
      professorName: enrollment.course.professor.name ?? "Profesor",
      hash,
    },
  });

  return {
    success: true,
    certificateId: certificate.id,
    message: "Certificado emitido exitosamente",
  };
}
