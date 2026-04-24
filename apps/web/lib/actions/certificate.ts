"use server";

import { db, Prisma } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { issueCertificateForEnrollment } from "@/lib/certificate-issuer";

/**
 * Issues a certificate for a completed enrollment.
 * Idempotent: returns the existing certificate if one was already issued.
 *
 * Used by the student (self-service) and by the system when the final
 * exam is passed with >= the course's passing score.
 */
export async function issueCertificate(enrollmentId: string) {
  const user = await requireUser();

  // Require the enrollment to belong to the current user AND be completed.
  // Without this guard, students could mint certificates for courses they
  // have not finished. When a course has a final exam, completion is
  // triggered by passing that exam (see quiz submission flow).
  const enrollment = await db.enrollment.findFirst({
    where: {
      id: enrollmentId,
      studentId: user.id,
      status: "COMPLETED",
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new Error("Inscripción no encontrada o no completada");
  }

  return issueCertificateForEnrollment(enrollmentId);
}

/**
 * Revoke a certificate (ADMIN / PROFESSOR of the course).
 */
export async function revokeCertificate(
  certificateId: string,
  reason: string
) {
  const user = await requireUser();

  const cert = await db.certificate.findUnique({
    where: { id: certificateId },
    include: {
      enrollment: {
        include: { course: { select: { professorId: true } } },
      },
    },
  });

  if (!cert) throw new Error("Certificado no encontrado");

  // SUPER_ADMIN is global; ADMIN and PROFESSOR are tenant-scoped and must
  // only be able to revoke certificates inside their own tenant. The
  // previous check leaked authorization across tenants.
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isTenantAdmin =
    user.role === "ADMIN" && cert.tenantId === user.tenantId;
  const isProfessor =
    cert.enrollment.course.professorId === user.id &&
    cert.tenantId === user.tenantId;

  if (!isSuperAdmin && !isTenantAdmin && !isProfessor) {
    throw new Error("No autorizado");
  }

  // Basic input validation on the audit-visible reason string.
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3 || trimmedReason.length > 500) {
    throw new Error("La razón debe tener entre 3 y 500 caracteres");
  }

  await db.certificate.update({
    where: { id: certificateId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: trimmedReason,
    } satisfies Prisma.CertificateUpdateInput,
  });

  return { success: true };
}
