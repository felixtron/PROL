/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Line,
} from "@react-pdf/renderer";

const PRIMARY = "#3aa1d6"; // azul del header de IBIZA
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";
const TEXT_LIGHT = "#94a3b8";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: TEXT_DARK,
  },
  // Security pattern — diagonal hairlines covering the page below all
  // content. Acts as the "papel de seguridad" backdrop.
  securityBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  brandBox: {
    backgroundColor: PRIMARY,
    width: 143,
    height: 143,
    alignItems: "center",
    justifyContent: "center",
    padding: 13,
  },
  brandLogo: {
    maxWidth: 121,
    maxHeight: 88,
    objectFit: "contain",
  },
  brandTextWrapper: {
    alignItems: "center",
  },
  brandTextLine1: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center",
  },
  brandTextLine2: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: -2,
  },
  brandTagline: {
    color: "white",
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
    textAlign: "center",
  },
  evolutionText: {
    fontSize: 11,
    color: TEXT_DARK,
    textAlign: "right",
  },
  evolutionStrong: { fontWeight: "bold", color: PRIMARY },
  // Title
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: TEXT_DARK,
    letterSpacing: 6,
    marginBottom: 36,
  },

  // Body with the left vertical bar
  bodyWrap: {
    flexDirection: "row",
    marginBottom: 20,
  },
  leftBar: {
    width: 6,
    backgroundColor: PRIMARY,
    marginRight: 24,
  },
  bodyContent: {
    flex: 1,
  },
  studentName: {
    fontSize: 26,
    fontWeight: "bold",
    color: TEXT_DARK,
    marginBottom: 14,
  },
  introLine: {
    fontSize: 11,
    color: TEXT_DARK,
    marginBottom: 14,
  },
  introStrong: { fontWeight: "bold" },
  courseCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  courseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: TEXT_DARK,
    marginBottom: 16,
  },
  description: {
    fontSize: 10,
    lineHeight: 1.6,
    color: TEXT_DARK,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: "auto",
    paddingTop: 18,
  },
  footerLeft: {
    flexDirection: "column",
    width: "33%",
  },
  footerCenter: {
    flexDirection: "column",
    alignItems: "center",
    width: "33%",
  },
  footerRight: {
    flexDirection: "column",
    alignItems: "center",
    width: "33%",
  },
  metaTitle: {
    fontSize: 8,
    color: TEXT_MUTED,
    lineHeight: 1.45,
  },
  metaTitleBold: { fontWeight: "bold", color: TEXT_DARK },

  authorizedLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: TEXT_DARK,
    marginBottom: 30,
  },
  authorizedName: {
    fontSize: 11,
    fontWeight: "bold",
    color: TEXT_DARK,
  },
  signatureLine: {
    width: 130,
    borderBottom: "1pt solid #cbd5e1",
    marginBottom: 6,
  },

  qrImage: { width: 80, height: 80, marginBottom: 4 },
  qrCaption: { fontSize: 7, color: TEXT_LIGHT, textAlign: "center" },

  bottomBar: {
    height: 22,
    backgroundColor: "#000",
    marginTop: 14,
  },

  revokedStamp: {
    position: "absolute",
    top: 240,
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

export interface IbizaCertificateProps {
  studentName: string;
  courseCode?: string | null; // e.g. "ISO 39001"
  courseName: string;
  description: string; // párrafo editable por el profesor en el curso
  folio: string;
  issuedDate: string; // formateada para display
  // Entidad autorizadora — nombre que aparece bajo el bloque "Autorizado
  // por". Por defecto el nombre de la consultora; el cargo individual
  // ya no se muestra para que el documento represente a la empresa,
  // no a una persona específica.
  authorizedByName: string;
  authorizedSignatureUrl?: string | null; // dataURL/URL absoluta opcional
  brandLogoDataUrl?: string | null; // logo del tenant como data URI (opcional)
  qrDataUrl: string;
  verifyEmail?: string;
  isRevoked: boolean;
}

/**
 * Fine diagonal hairlines — two crossing sets — that mimic security
 * paper without overwhelming the foreground. Drawn once with @react-pdf
 * SVG primitives.
 */
function SecurityPattern() {
  const width = 612; // LETTER portrait in pt
  const height = 792;
  const step = 8;
  const stroke = "#3aa1d6";
  const opacity = 0.06;
  // Diagonals going both directions cover the page.
  const downward: number[] = [];
  for (let x = -height; x < width; x += step) downward.push(x);
  const upward: number[] = [];
  for (let x = 0; x < width + height; x += step) upward.push(x);
  return (
    <Svg
      style={styles.securityBg}
      viewBox={`0 0 ${width} ${height}`}
    >
      {downward.map((x, i) => (
        <Line
          key={`d-${i}`}
          x1={x}
          y1={0}
          x2={x + height}
          y2={height}
          stroke={stroke}
          strokeWidth={0.25}
          strokeOpacity={opacity}
        />
      ))}
      {upward.map((x, i) => (
        <Line
          key={`u-${i}`}
          x1={x}
          y1={0}
          x2={x - height}
          y2={height}
          stroke={stroke}
          strokeWidth={0.25}
          strokeOpacity={opacity}
        />
      ))}
    </Svg>
  );
}

// Recorta a `n` caracteres con elipsis para evitar que campos largos rompan
// el layout y empujen contenido a una segunda página.
function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function IbizaCertificate(p: IbizaCertificateProps) {
  return (
    <Document>
      <Page size="LETTER" orientation="portrait" style={styles.page} wrap={false}>
        <SecurityPattern />
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brandBox}>
            {p.brandLogoDataUrl ? (
              <Image src={p.brandLogoDataUrl} style={styles.brandLogo} />
            ) : (
              <View style={styles.brandTextWrapper}>
                <Text style={styles.brandTextLine1}>IBIZA</Text>
                <Text style={styles.brandTextLine2}>ConsultoreS</Text>
                <Text style={styles.brandTagline}>
                  CONOCIMIENTOS Y EXPERIENCIA
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.evolutionText}>
            BMB ha evolucionado como{"\n"}
            <Text style={styles.evolutionStrong}>IBIZA CONSULTORES</Text>
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>D I P L O M A</Text>

        {/* Body */}
        <View style={styles.bodyWrap}>
          <View style={styles.leftBar} />
          <View style={styles.bodyContent}>
            <Text style={styles.studentName}>
              {truncate(p.studentName.toUpperCase(), 48)}
            </Text>
            <Text style={styles.introLine}>
              <Text style={styles.introStrong}>IBIZA Consultores</Text> hace
              constar que cursó la siguiente formación:
            </Text>
            {p.courseCode && (
              <Text style={styles.courseCode}>{truncate(p.courseCode, 32)}</Text>
            )}
            <Text style={styles.courseName}>{truncate(p.courseName, 90)}</Text>
            <Text style={styles.description}>{truncate(p.description, 420)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.metaTitle}>
              <Text style={styles.metaTitleBold}>Folio No.:</Text>{" "}
              {p.folio}.{"\n"}
              <Text style={styles.metaTitleBold}>Fecha de emisión:</Text>{" "}
              {p.issuedDate}.{"\n"}
              Emitido por IBIZA Consultores y/o Total Conformity Assessment
              and Certification, S.C. Registro en la Secretaría del Trabajo,
              México, BBM0003076K9. Información sobre su validez:{" "}
              {p.verifyEmail ?? "soporte@ibizabmb.com"}.
            </Text>
          </View>

          <View style={styles.footerCenter}>
            <Text style={styles.authorizedLabel}>Autorizado por:</Text>
            {p.authorizedSignatureUrl && (
              <Image
                src={p.authorizedSignatureUrl}
                style={{ width: 120, height: 36, marginBottom: 6 }}
              />
            )}
            <View style={styles.signatureLine} />
            <Text style={styles.authorizedName}>{p.authorizedByName}</Text>
          </View>

          <View style={styles.footerRight}>
            <Image src={p.qrDataUrl} style={styles.qrImage} />
            <Text style={styles.qrCaption}>Escanea para verificar</Text>
          </View>
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar} />

        {p.isRevoked && <Text style={styles.revokedStamp}>REVOCADO</Text>}
      </Page>
    </Document>
  );
}
