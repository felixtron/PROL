/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

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
  courseCode: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 4,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  courseName: {
    fontSize: 18,
    color: "#6366f1",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "bold",
  },
  description: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
    paddingLeft: 40,
    paddingRight: 40,
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
  footerCenter: {
    flexDirection: "column",
    alignItems: "center",
    paddingRight: 16,
  },
  footerRight: { flexDirection: "column", alignItems: "center" },
  authorizedLabel: {
    fontSize: 9,
    color: "#94a3b8",
    marginBottom: 24,
  },
  signatureLine: {
    width: 130,
    borderBottom: "1pt solid #cbd5e1",
    marginBottom: 6,
  },
  authorizedName: { fontSize: 10, color: "#1e293b", fontWeight: "bold" },
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
  // Más pequeño que el de revocado porque el texto es más largo: a 80pt
  // "VISTA PREVIA" se sale del ancho de la hoja.
  watermarkStamp: {
    position: "absolute",
    top: 230,
    left: 0,
    right: 0,
    fontSize: 56,
    fontWeight: "bold",
    color: "#64748b",
    opacity: 0.25,
    textAlign: "center",
    letterSpacing: 10,
    transform: "rotate(-15deg)",
  },
});

export interface ClassicCertificateProps {
  tenantName: string;
  studentName: string;
  courseCode?: string | null;
  courseName: string;
  description?: string | null;
  professorName: string;
  signerName: string;
  signatureDataUrl?: string | null;
  folio: string;
  sha256: string;
  issuedDate: string;
  verificationUrl: string;
  qrDataUrl: string;
  finalScore: number | null;
  isRevoked: boolean;
  /** Sello diagonal para hojas que no acreditan nada (p. ej. la vista previa). */
  watermark?: string | null;
}

// Recorta a `n` caracteres con elipsis para impedir que campos largos
// empujen contenido a una segunda página.
function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function ClassicCertificate(p: ClassicCertificateProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
        <View style={styles.border}>
          <View style={styles.innerBorder}>
            <View style={styles.header}>
              <Text style={styles.tenantName}>{truncate(p.tenantName, 60)}</Text>
            </View>

            <View>
              <Text style={styles.title}>DIPLOMA DE FINALIZACIÓN</Text>
              <Text style={styles.subtitle}>Se otorga a</Text>
              <Text style={styles.studentName}>{truncate(p.studentName, 48)}</Text>
              <Text style={styles.subtitle}>
                por haber aprobado el examen final del curso
              </Text>
              {p.courseCode && (
                <Text style={styles.courseCode}>{truncate(p.courseCode, 32)}</Text>
              )}
              <Text style={styles.courseName}>{truncate(p.courseName, 90)}</Text>
              {p.description && (
                <Text style={styles.description}>
                  {truncate(p.description, 300)}
                </Text>
              )}
              {p.finalScore !== null && (
                <Text style={styles.scoreBadge}>
                  Calificacion: {p.finalScore}%
                </Text>
              )}
              <View style={styles.professorSection}>
                <Text style={styles.subtitle}>Impartido por</Text>
                <Text style={styles.professorName}>
                  {truncate(p.professorName, 60)}
                </Text>
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
              <View style={styles.footerCenter}>
                <Text style={styles.authorizedLabel}>Autorizado por:</Text>
                {p.signatureDataUrl && (
                  <Image
                    src={p.signatureDataUrl}
                    style={{ width: 110, height: 32, marginBottom: 4 }}
                  />
                )}
                <View style={styles.signatureLine} />
                <Text style={styles.authorizedName}>
                  {truncate(p.signerName, 40)}
                </Text>
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
        {!p.isRevoked && p.watermark && (
          <Text style={styles.watermarkStamp}>{p.watermark}</Text>
        )}
      </Page>
    </Document>
  );
}
