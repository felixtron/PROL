import crypto from "crypto";
import { db } from "@prol/db";
import {
  generateCertificateFolio,
  canonicalCertificateString,
  sha256Hex,
} from "@/lib/certificates";

/**
 * System-level certificate issuer. NOT exported from a "use server" module,
 * so it is not reachable as a Server Action RPC. Callers (server actions
 * that have already validated authorization) import it directly.
 *
 * Idempotent: returns the existing certificate if one already exists for
 * this enrollment.
 *
 * Why: Next.js App Router exposes every async export of a `"use server"`
 * file as a callable RPC. Keeping this helper in a plain module prevents
 * an authenticated client from minting certificates by invoking the action
 * directly with an arbitrary enrollmentId.
 */
export async function issueCertificateForEnrollment(
  enrollmentId: string,
  opts?: { finalExamScore?: number }
) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: { select: { name: true } },
      course: {
        include: {
          professor: { select: { name: true } },
        },
      },
      tenant: { select: { name: true, certificatePrefix: true } },
    },
  });

  if (!enrollment) {
    throw new Error("Inscripción no encontrada");
  }

  // Defense in depth: even though callers validate completion, refuse to
  // mint a certificate for a non-completed enrollment.
  if (enrollment.status !== "COMPLETED") {
    throw new Error("La inscripción no está completada");
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

  const issuedAt = new Date();
  const year = issuedAt.getUTCFullYear();
  const prefix = enrollment.tenant.certificatePrefix ?? "PROL";

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

  // Snapshot the course-level certificate description so future edits
  // to the course don't change the wording of already-issued diplomas.
  const courseDescription =
    enrollment.course.certificateDescription?.trim() || null;
  const metadata = courseDescription
    ? { description: courseDescription }
    : undefined;

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
      ...(metadata ? { metadata } : {}),
    },
  });

  return {
    success: true,
    certificateId: certificate.id,
    folio: certificate.folio,
    message: "Certificado emitido exitosamente",
  };
}
