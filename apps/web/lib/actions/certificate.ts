"use server";

import { db, Prisma } from "@prol/db";
import { requireUser } from "@/lib/auth";
import crypto from "crypto";
import {
  generateCertificateFolio,
  canonicalCertificateString,
  sha256Hex,
} from "@/lib/certificates";

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
    include: {
      course: {
        include: {
          professor: { select: { name: true } },
        },
      },
      tenant: { select: { name: true, certificatePrefix: true } },
    },
  });

  if (!enrollment) {
    throw new Error("Inscripcion no encontrada o no completada");
  }

  const existing = await db.certificate.findUnique({ where: { enrollmentId } });
  if (existing) {
    return {
      success: true,
      certificateId: existing.id,
      folio: existing.folio,
      message: "El certificado ya existe",
    };
  }

  return issueCertificateForEnrollment(enrollmentId);
}

/**
 * System-level issuer (no auth check). Safe to call from server actions
 * that have already validated authorization (e.g. the quiz submission flow
 * when the student passes the final exam).
 *
 * Returns the existing certificate if one already exists for this enrollment.
 */
export async function issueCertificateForEnrollment(
  enrollmentId: string,
  opts?: { finalExamScore?: number }
) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: { select: { name: true } },
      course: { include: { professor: { select: { name: true } } } },
      tenant: { select: { name: true, certificatePrefix: true } },
    },
  });

  if (!enrollment) {
    throw new Error("Inscripcion no encontrada");
  }

  // Idempotent
  const existing = await db.certificate.findUnique({ where: { enrollmentId } });
  if (existing) {
    return {
      success: true,
      certificateId: existing.id,
      folio: existing.folio,
      message: "El certificado ya existe",
    };
  }

  const issuedAt = new Date();
  const year = issuedAt.getUTCFullYear();
  const prefix = enrollment.tenant.certificatePrefix ?? "PROL";

  // Reserve a sequential folio for (tenantId, year) using a counter row.
  // Using a transaction with upsert + increment avoids race conditions.
  const folio = await db.$transaction(async (tx) => {
    const counter = await tx.certificateCounter.upsert({
      where: { tenantId_year: { tenantId: enrollment.tenantId, year } },
      create: { tenantId: enrollment.tenantId, year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    return generateCertificateFolio(prefix, year, counter.lastSeq);
  });

  const studentName = enrollment.student.name ?? "Estudiante";
  const courseName = enrollment.course.title;
  const professorName = enrollment.course.professor.name ?? "Profesor";
  const tenantName = enrollment.tenant.name;

  const hash = crypto.randomBytes(16).toString("hex");
  const sha256 = sha256Hex(
    canonicalCertificateString({
      folio,
      studentName,
      courseName,
      professorName,
      tenantName,
      issuedAt,
    })
  );

  const certificate = await db.certificate.create({
    data: {
      enrollmentId,
      tenantId: enrollment.tenantId,
      studentName,
      courseName,
      professorName,
      folio,
      hash,
      sha256,
      status: "ACTIVE",
      issuedAt,
      ...(opts?.finalExamScore !== undefined
        ? { finalExamScore: opts.finalExamScore }
        : {}),
    },
  });

  return {
    success: true,
    certificateId: certificate.id,
    folio: certificate.folio,
    message: "Certificado emitido exitosamente",
  };
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
    throw new Error("La razon debe tener entre 3 y 500 caracteres");
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
