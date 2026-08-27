import crypto from "crypto";
import { db } from "@prol/db";
import {
  generateCertificateFolio,
  canonicalCertificateString,
  sha256Hex,
} from "@/lib/certificates";
import { resolveCertificateTemplate } from "@/lib/certificate-templates/catalog";
import { triggerSurveysForStudent } from "@/lib/survey-dispatch";

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
      tenant: { select: { name: true, slug: true, certificatePrefix: true } },
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

  const issuedAt = new Date();
  const year = issuedAt.getUTCFullYear();
  const prefix = enrollment.tenant.certificatePrefix ?? "PROL";

  const studentName = enrollment.student.name ?? "Estudiante";
  const professorName = enrollment.course.professor.name ?? "Profesor";
  const tenantName = enrollment.tenant.name;

  // Snapshot de la configuración de diploma del curso. Se congela aquí y
  // no se vuelve a leer del curso al imprimir el PDF, para que editar la
  // plantilla o los textos no reescriba diplomas ya entregados.
  const clean = (v: string | null | undefined) => v?.trim() || null;
  const courseCode = clean(enrollment.course.certificateCode);
  const courseDescription = clean(enrollment.course.certificateDescription);
  const signerName = clean(enrollment.course.certificateSignerName);

  // Se resuelve aquí, no al imprimir. Cuando el curso no elige plantilla
  // la decide el nombre del tenant, y ese nombre puede cambiar: dejar la
  // decisión para el momento de imprimir haría que un diploma ya entregado
  // saliera con otro diseño el día que la empresa se renombre.
  const template = resolveCertificateTemplate(
    enrollment.course.certificateTemplate,
    enrollment.tenant
  );

  // El nombre que se imprime puede diferir del título del curso en la
  // plataforma (que suele traer el código pegado delante). Se guarda en
  // `courseName` —y no solo en metadata— para que la página pública de
  // verificación diga exactamente lo mismo que el papel: si no coinciden,
  // quien verifica un diploma legítimo cree que es falso.
  const courseName =
    clean(enrollment.course.certificateCourseName) ?? enrollment.course.title;

  const metadata: Record<string, string> = { template };
  if (courseCode) metadata.courseCode = courseCode;
  if (courseDescription) metadata.description = courseDescription;
  if (signerName) metadata.authorizedByName = signerName;

  // All mutations live inside one $transaction so a failure in `create()`
  // also rolls back the counter increment. Without this, a partial failure
  // (network/timeout/validation between counter upsert and certificate
  // create) leaves the folio counter at N+1 with no certificate emitted,
  // so the next retry burns folio N+1 and emits the new one as N+2 — the
  // visible sequence ends up with holes. Concurrent calls for the same
  // enrollment are still safe: the second one collides on the unique
  // `(enrollmentId)` constraint and its tx rolls back too.
  const outcome = await db.$transaction(async (tx) => {
    // Idempotency: if a certificate already exists for this enrollment,
    // return it without touching the counter.
    const existing = await tx.certificate.findUnique({
      where: { enrollmentId },
    });
    if (existing) {
      return {
        success: true,
        created: false,
        certificateId: existing.id,
        folio: existing.folio,
        message: "El certificado ya existe",
      };
    }

    const counter = await tx.certificateCounter.upsert({
      where: { tenantId_year: { tenantId: enrollment.tenantId, year } },
      create: { tenantId: enrollment.tenantId, year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    const folio = generateCertificateFolio(prefix, year, counter.lastSeq);

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

    const certificate = await tx.certificate.create({
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
        metadata,
      },
    });

    return {
      success: true,
      created: true,
      certificateId: certificate.id,
      folio: certificate.folio,
      message: "Certificado emitido exitosamente",
    };
  });

  // Disparador de encuestas configuradas con CERTIFICATE_ISSUED. Va después
  // del commit y sólo cuando el diploma se acaba de emitir: reemitir o
  // reimprimir uno existente no debe volver a encuestar al alumno.
  // `triggerSurveysForStudent` nunca lanza — un problema con la encuesta no
  // puede tumbar la emisión del diploma.
  if (outcome.created) {
    await triggerSurveysForStudent({
      userId: enrollment.studentId,
      courseId: enrollment.courseId,
      reason: "CERTIFICATE_ISSUED",
    });
  }

  return outcome;
}
