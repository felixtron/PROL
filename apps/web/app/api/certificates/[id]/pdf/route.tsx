import { NextRequest, NextResponse } from "next/server";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { Document, Page, Text, View, StyleSheet, renderToStream } from "@react-pdf/renderer";

// Create styles for the PDF certificate
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 60,
  },
  border: {
    border: "4pt solid #6366f1",
    borderRadius: 8,
    padding: 40,
    flexGrow: 1,
  },
  innerBorder: {
    border: "1pt solid #6366f1",
    borderRadius: 4,
    padding: 30,
    flexGrow: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  tenantName: {
    fontSize: 18,
    color: "#6366f1",
    fontWeight: "bold",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 12,
  },
  studentName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 20,
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
    marginBottom: 30,
  },
  professorName: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "bold",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 20,
    borderTop: "1pt solid #e2e8f0",
  },
  dateSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 10,
    color: "#64748b",
  },
  hashSection: {
    marginTop: 8,
  },
  hashLabel: {
    fontSize: 8,
    color: "#94a3b8",
    marginBottom: 2,
  },
  hashValue: {
    fontSize: 9,
    color: "#64748b",
    fontFamily: "Courier",
  },
  verificationUrl: {
    fontSize: 8,
    color: "#6366f1",
    marginTop: 4,
  },
});

// Certificate PDF Document Component
const CertificatePDF = ({
  tenantName,
  studentName,
  courseName,
  professorName,
  issuedDate,
  hash,
  verificationUrl,
}: {
  tenantName: string;
  studentName: string;
  courseName: string;
  professorName: string;
  issuedDate: string;
  hash: string;
  verificationUrl: string;
}) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.border}>
        <View style={styles.innerBorder}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.tenantName}>{tenantName}</Text>
          </View>

          {/* Main Content */}
          <View>
            <Text style={styles.title}>CERTIFICADO DE FINALIZACION</Text>

            <Text style={styles.subtitle}>Se certifica que</Text>

            <Text style={styles.studentName}>{studentName}</Text>

            <Text style={styles.subtitle}>ha completado exitosamente el curso</Text>

            <Text style={styles.courseName}>{courseName}</Text>

            <View style={styles.professorSection}>
              <Text style={styles.subtitle}>Impartido por</Text>
              <Text style={styles.professorName}>{professorName}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.dateSection}>
              <Text style={styles.dateText}>Fecha de emision: {issuedDate}</Text>
            </View>

            <View style={styles.hashSection}>
              <Text style={styles.hashLabel}>ID de Certificado:</Text>
              <Text style={styles.hashValue}>{hash}</Text>
              <Text style={styles.verificationUrl}>
                Verificar en: {verificationUrl}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Look up the certificate
    const certificate = await db.certificate.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
        tenant: true,
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificado no encontrado" },
        { status: 404 }
      );
    }

    // Verify the requesting user owns this certificate
    if (certificate.enrollment.studentId !== user.id) {
      return NextResponse.json(
        { error: "No autorizado para descargar este certificado" },
        { status: 403 }
      );
    }

    // Format the issue date in Spanish
    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build verification URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://prol.prosuite.pro";
    const verificationUrl = `${appUrl}/verify/${certificate.hash}`;

    // Generate PDF
    const pdf = (
      <CertificatePDF
        tenantName={certificate.tenant.name}
        studentName={certificate.studentName}
        courseName={certificate.courseName}
        professorName={certificate.professorName}
        issuedDate={issuedDate}
        hash={certificate.hash}
        verificationUrl={verificationUrl}
      />
    );

    // Render to stream
    const stream = await renderToStream(pdf);

    // Return as downloadable PDF
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificado-${certificate.hash}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating certificate PDF:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Error al generar el certificado" },
      { status: 500 }
    );
  }
}
