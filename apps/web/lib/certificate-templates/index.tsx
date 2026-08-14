import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { IbizaCertificate } from "./ibiza";
import { ClassicCertificate } from "./classic";
import type { CertificateTemplateId } from "./catalog";

export * from "./catalog";

/**
 * Datos con los que se imprime un diploma, ya resueltos: sin nulls que la
 * plantilla tenga que interpretar y con las imágenes convertidas a data
 * URLs. Lo llenan tanto la ruta de PDF real (a partir del Certificate
 * emitido) como la de vista previa (a partir del Course en edición), de
 * modo que lo que ve el profesor al configurar es lo mismo que recibirá
 * el alumno.
 */
export interface CertificateRenderData {
  tenantName: string;
  studentName: string;
  courseCode: string | null;
  courseName: string;
  description: string;
  professorName: string;
  signerName: string;
  signatureDataUrl: string | null;
  brandLogoDataUrl: string | null;
  folio: string;
  sha256: string;
  issuedAt: Date;
  verificationUrl: string;
  qrDataUrl: string;
  finalScore: number | null;
  verifyEmail: string;
  isRevoked: boolean;
  /** Sello diagonal para hojas que no acreditan nada (p. ej. la vista previa). */
  watermark?: string | null;
}

export function renderCertificate(
  templateId: CertificateTemplateId,
  d: CertificateRenderData
): ReactElement<DocumentProps> {
  if (templateId === "IBIZA") {
    return (
      <IbizaCertificate
        studentName={d.studentName}
        courseCode={d.courseCode}
        courseName={d.courseName}
        description={d.description}
        folio={d.folio}
        issuedDate={d.issuedAt.toLocaleDateString("es-MX", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
        authorizedByName={d.signerName}
        authorizedSignatureUrl={d.signatureDataUrl}
        brandLogoDataUrl={d.brandLogoDataUrl}
        qrDataUrl={d.qrDataUrl}
        verifyEmail={d.verifyEmail}
        isRevoked={d.isRevoked}
        watermark={d.watermark}
      />
    );
  }

  return (
    <ClassicCertificate
      tenantName={d.tenantName}
      studentName={d.studentName}
      courseCode={d.courseCode}
      courseName={d.courseName}
      description={d.description}
      professorName={d.professorName}
      signerName={d.signerName}
      signatureDataUrl={d.signatureDataUrl}
      folio={d.folio}
      sha256={d.sha256}
      issuedDate={d.issuedAt.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
      verificationUrl={d.verificationUrl}
      qrDataUrl={d.qrDataUrl}
      finalScore={d.finalScore}
      isRevoked={d.isRevoked}
      watermark={d.watermark}
    />
  );
}
