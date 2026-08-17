import { NextRequest, NextResponse } from "next/server";
import { db } from "@prol/db";
import { renderToStream } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { buildVerificationUrl } from "@/lib/certificates";
import {
  loadBundledCertAsset,
  loadUploadAsDataUrl,
} from "@/lib/certificate-assets";
import {
  isIbizaTenant,
  renderCertificate,
  resolveCertificateTemplate,
} from "@/lib/certificate-templates";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Public read access: anyone with the certificate ID can download.
    // The QR/verify URL exposes this; we accept that download is also public.
    const certificate = await db.certificate.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { name: true, slug: true, logo: true, contactEmail: true },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });
    }

    const verificationUrl = buildVerificationUrl(certificate.folio);

    // Generate QR as PNG data URL — pdf-renderer's Image accepts data URIs.
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 360,
      margin: 1,
      color: { dark: "#1e293b", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });

    // Todo lo específico del diploma se congeló en metadata al emitirlo
    // (ver certificate-issuer). Aquí NO se vuelve a leer el curso: si el
    // profesor cambia la plantilla o los textos mañana, los diplomas ya
    // entregados siguen imprimiéndose tal y como se emitieron.
    const meta = (certificate.metadata ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v ? v : null);

    const templateId = resolveCertificateTemplate(
      str(meta.template),
      certificate.tenant
    );

    // Logo y firma canónicos bundled en el repo: garantizan que TODOS los
    // diplomas de Ibiza salgan con el mismo logo y misma firma (sin
    // depender de qué se haya subido en tenant.logo o metadata).
    const ibizaBranding = isIbizaTenant(certificate.tenant);
    const brandLogoDataUrl = ibizaBranding
      ? ((await loadBundledCertAsset("ibiza-white.png", "image/png")) ??
        (await loadUploadAsDataUrl(certificate.tenant.logo)))
      : await loadUploadAsDataUrl(certificate.tenant.logo);
    const signatureDataUrl = ibizaBranding
      ? ((await loadBundledCertAsset("firma-diploma.png", "image/png")) ??
        (await loadUploadAsDataUrl(str(meta.authorizedSignatureUrl))))
      : await loadUploadAsDataUrl(str(meta.authorizedSignatureUrl));

    const pdf = renderCertificate(templateId, {
      tenantName: certificate.tenant.name,
      studentName: certificate.studentName,
      courseCode: str(meta.courseCode),
      courseName: certificate.courseName,
      description:
        str(meta.description) ??
        `Curso impartido por ${certificate.professorName}.`,
      professorName: certificate.professorName,
      // Por defecto firma la consultora, no una persona concreta: el
      // documento representa a la empresa que lo emite.
      signerName: str(meta.authorizedByName) ?? certificate.tenant.name,
      signatureDataUrl,
      brandLogoDataUrl,
      folio: certificate.folio,
      sha256: certificate.sha256,
      issuedAt: new Date(certificate.issuedAt),
      verificationUrl,
      qrDataUrl,
      finalScore: certificate.finalExamScore,
      verifyEmail: certificate.tenant.contactEmail ?? "asesoria@ibizabmb.com",
      isRevoked: certificate.status === "REVOKED",
    });

    const stream = await renderToStream(pdf);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="diploma-${certificate.folio}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating certificate PDF:", error);
    return NextResponse.json(
      { error: "Error al generar el certificado" },
      { status: 500 }
    );
  }
}
