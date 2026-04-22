import crypto from "node:crypto";

/**
 * Format a sequential certificate folio: PREFIX-YYYY-NNNN
 * Example: PROL-2026-0042
 */
export function generateCertificateFolio(
  prefix: string,
  year: number,
  seq: number
): string {
  const safePrefix = (prefix || "PROL")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const seqStr = String(seq).padStart(4, "0");
  return `${safePrefix}-${year}-${seqStr}`;
}

/**
 * Build the canonical string used to compute the certificate's SHA-256.
 * The verification page recomputes this string and compares hashes.
 *
 * Order matters — do NOT change without updating the verifier.
 */
export function canonicalCertificateString(input: {
  folio: string;
  studentName: string;
  courseName: string;
  professorName: string;
  tenantName: string;
  issuedAt: Date;
}): string {
  return [
    input.folio,
    input.studentName,
    input.courseName,
    input.professorName,
    input.tenantName,
    input.issuedAt.toISOString(),
  ].join("|");
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Build the public verification URL embedded in the QR code.
 * Uses NEXT_PUBLIC_APP_URL with /verify/{folio}.
 */
export function buildVerificationUrl(folio: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/verify/${folio}`;
}
