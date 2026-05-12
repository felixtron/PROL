import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@prol/db";
import { getCurrentUser } from "@/lib/auth";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { buildVerificationUrl } from "@/lib/certificates";
import { resolveUploadDir } from "@/lib/upload-paths";
import { IbizaCertificate } from "@/lib/certificate-templates/ibiza";

/**
 * Load a /uploads/... URL from the local volume and return a data: URL,
 * which is what @react-pdf/renderer's <Image> consumes reliably. Returns
 * null on any failure so the template can fall back to its placeholder.
 */
async function loadAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || !url.startsWith("/uploads/")) return null;
  // Expected shape: /uploads/<subdir>/<file.ext>
  const parts = url.replace(/^\/uploads\//, "").split("/");
  if (parts.length < 2) return null;
  const [subdir, ...rest] = parts;
  const filename = rest.join("/");
  if (!subdir || !filename || filename.includes("..")) return null;
  const dir = resolveUploadDir(subdir);
  const filePath = join(dir, filename);
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  const mime =
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    null;
  if (!mime) return null;
  try {
    const buf = await readFile(filePath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
  },
  border: {
    border: "4pt solid #6366f1",
    borderRadius: 8,
    padding: 30,
    flexGrow: 1,
  },
  innerBorder: {
    border: "1pt solid #6366f1",
    borderRadius: 4,
    padding: 28,
    flexGrow: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  header: { textAlign: "center", marginBottom: 20 },
  tenantName: { fontSize: 18, color: "#6366f1", fontWeight: "bold", marginBottom: 8 },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 2,
  },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 12 },
  studentName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 18,
  },
  courseName: {
    fontSize: 18,
    color: "#6366f1",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "bold",
  },
  professorSection: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  professorName: { fontSize: 14, color: "#1e293b", fontWeight: "bold" },
  scoreBadge: {
    alignSelf: "center",
    backgroundColor: "#ecfdf5",
    color: "#047857",
    fontSize: 11,
    fontWeight: "bold",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 999,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1pt solid #e2e8f0",
  },
  footerLeft: { flexDirection: "column", flexGrow: 1, paddingRight: 16 },
  footerRight: { flexDirection: "column", alignItems: "center" },
  qrImage: { width: 90, height: 90 },
  qrCaption: { fontSize: 7, color: "#94a3b8", marginTop: 4, textAlign: "center" },
  metaLabel: { fontSize: 8, color: "#94a3b8", marginBottom: 1 },
  folioValue: {
    fontSize: 11,
    color: "#1e293b",
    fontFamily: "Courier",
    fontWeight: "bold",
    marginBottom: 6,
  },
  metaValue: { fontSize: 9, color: "#64748b" },
  hashValue: { fontSize: 7, color: "#94a3b8", fontFamily: "Courier" },
  revokedStamp: {
    position: "absolute",
    top: 200,
    left: 0,
    right: 0,
    fontSize: 80,
    fontWeight: "bold",
    color: "#dc2626",
    opacity: 0.3,
    textAlign: "center",
    letterSpacing: 12,
    transform: "rotate(-15deg)",
  },
});

interface CertificatePDFProps {
  tenantName: string;
  studentName: string;
  courseName: string;
  professorName: string;
  folio: string;
  sha256: string;
  issuedDate: string;
  verificationUrl: string;
  qrDataUrl: string;
  finalScore: number | null;
  isRevoked: boolean;
}

const CertificatePDF = (p: CertificatePDFProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.border}>
        <View style={styles.innerBorder}>
          <View style={styles.header}>
            <Text style={styles.tenantName}>{p.tenantName}</Text>
          </View>

          <View>
            <Text style={styles.title}>CERTIFICADO DE FINALIZACION</Text>
            <Text style={styles.subtitle}>Se certifica que</Text>
            <Text style={styles.studentName}>{p.studentName}</Text>
            <Text style={styles.subtitle}>ha aprobado el examen final del curso</Text>
            <Text style={styles.courseName}>{p.courseName}</Text>
            {p.finalScore !== null && (
              <Text style={styles.scoreBadge}>
                Calificacion: {p.finalScore}%
              </Text>
            )}
            <View style={styles.professorSection}>
              <Text style={styles.subtitle}>Impartido por</Text>
              <Text style={styles.professorName}>{p.professorName}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.metaLabel}>FOLIO</Text>
              <Text style={styles.folioValue}>{p.folio}</Text>
              <Text style={styles.metaLabel}>FECHA DE EMISION</Text>
              <Text style={styles.metaValue}>{p.issuedDate}</Text>
              <Text style={[styles.metaLabel, { marginTop: 6 }]}>SHA-256</Text>
              <Text style={styles.hashValue}>{p.sha256}</Text>
            </View>
            <View style={styles.footerRight}>
              <Image src={p.qrDataUrl} style={styles.qrImage} />
              <Text style={styles.qrCaption}>Escanea para verificar</Text>
              <Text style={styles.qrCaption}>{p.verificationUrl}</Text>
            </View>
          </View>
        </View>
      </View>

      {p.isRevoked && <Text style={styles.revokedStamp}>REVOCADO</Text>}
    </Page>
  </Document>
);

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
      include: { tenant: { select: { name: true, slug: true, logo: true, contactEmail: true } } },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });
    }

    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const issuedDateShort = new Date(certificate.issuedAt).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const verificationUrl = buildVerificationUrl(certificate.folio);

    // Generate QR as PNG data URL — pdf-renderer's Image accepts data URIs.
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 360,
      margin: 1,
      color: { dark: "#1e293b", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });

    // Owner-only download? For now allow any authenticated user (and even
    // unauthenticated for sharing). The verify page already exposes data
    // publicly so this matches the trust model.
    void getCurrentUser; // (no-op import to keep the helper available)

    // ── Tenant-specific template selection ─────────────────────────────
    // Each tenant can opt into a custom certificate layout. New layouts
    // are added here by slug. Default for every other tenant is the
    // generic indigo certificate below.
    if (certificate.tenant.slug === "ibiza-consultores") {
      const meta = (certificate.metadata ?? {}) as Record<string, unknown>;
      const description = typeof meta.description === "string"
        ? meta.description
        : `Curso impartido por ${certificate.professorName}.`;
      const courseCode = typeof meta.courseCode === "string"
        ? meta.courseCode
        : null;
      // Default authorizer is the consultora itself (no individual name
      // or job title). Metadata can still override per certificate if
      // ever needed.
      const authorizedByName = typeof meta.authorizedByName === "string"
        ? meta.authorizedByName
        : certificate.tenant.name;
      const authorizedSignatureUrl = typeof meta.authorizedSignatureUrl === "string"
        ? await loadAsDataUrl(meta.authorizedSignatureUrl)
        : null;

      const brandLogoDataUrl = await loadAsDataUrl(certificate.tenant.logo);

      const pdf = (
        <IbizaCertificate
          studentName={certificate.studentName}
          courseCode={courseCode}
          courseName={certificate.courseName}
          description={description}
          folio={certificate.folio}
          issuedDate={issuedDateShort}
          authorizedByName={authorizedByName}
          authorizedSignatureUrl={authorizedSignatureUrl}
          brandLogoDataUrl={brandLogoDataUrl}
          qrDataUrl={qrDataUrl}
          verifyEmail={certificate.tenant.contactEmail ?? "soporte@ibizabmb.com"}
          isRevoked={certificate.status === "REVOKED"}
        />
      );

      const stream = await renderToStream(pdf);
      return new NextResponse(stream as unknown as ReadableStream, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="diploma-${certificate.folio}.pdf"`,
        },
      });
    }

    const pdf = (
      <CertificatePDF
        tenantName={certificate.tenant.name}
        studentName={certificate.studentName}
        courseName={certificate.courseName}
        professorName={certificate.professorName}
        folio={certificate.folio}
        sha256={certificate.sha256}
        issuedDate={issuedDate}
        verificationUrl={verificationUrl}
        qrDataUrl={qrDataUrl}
        finalScore={certificate.finalExamScore}
        isRevoked={certificate.status === "REVOKED"}
      />
    );

    const stream = await renderToStream(pdf);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificado-${certificate.folio}.pdf"`,
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
