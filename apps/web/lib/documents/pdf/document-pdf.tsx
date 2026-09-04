// Armazón del PDF de un documento nativo — encabezado ISO, pie numerado,
// sello y bloque de identidad de la primera página.
//
// Un renderer, un juego de estilos, sin variantes: instrucción explícita del
// usuario al cerrar la discusión de la fase («ya no le des más vueltas,
// hazlo más sencillo»). Las dos rutas de descarga (plantilla y empresa) son
// handlers finos sobre esta función — mismo patrón que `renderCertificate`
// en `lib/certificate-templates/index.tsx`: datos ya resueltos entran, un
// `ReactElement<DocumentProps>` sale.
//
// El logo (`companyLogoDataUrl`) se resuelve UNA vez en la ruta, vía
// `loadUploadAsDataUrl` — nunca aquí dentro. La banda es `fixed` y se
// repinta en cada página: no puede haber trabajo caro ni asíncrono dentro.
//
// El aviso de DOC-07 ("hay una versión más reciente de la plantilla") NO
// viaja al PDF a propósito: es estado vivo de la plataforma, envejece mal
// impreso. Decisión cerrada en `04-CONTEXT.md`.

import type { ReactElement } from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { DocumentIdentity } from "@/lib/documents/document-identity";
import { htmlToPdfNodes } from "./html-to-pdf-nodes";

export interface DocumentPdfProps {
  identity: DocumentIdentity;
  /** Ya saneado en la base — NO se vuelve a sanear aquí. */
  contentHtml: string;
  /** Resuelto UNA vez en la ruta, vía `loadUploadAsDataUrl`. */
  companyLogoDataUrl: string | null;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 78,
    paddingBottom: 48,
    paddingHorizontal: 46,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },

  // ─── Banda fija (todas las páginas) ────────────────────────────────────
  band: {
    position: "absolute",
    top: 20,
    left: 46,
    right: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    borderBottom: "0.5pt solid #cbd5e1",
  },
  bandLogo: { width: 34, height: 34, objectFit: "contain" },
  bandLogoPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 5,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  bandLogoInitial: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#4338ca",
  },
  bandTextCol: { flex: 1, flexDirection: "column" },
  bandCode: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  bandName: { fontSize: 8, color: "#475569", marginTop: 1 },
  bandVersion: { fontSize: 8, color: "#64748b" },

  // ─── Pie fijo, numerado (todas las páginas) ────────────────────────────
  footer: {
    position: "absolute",
    bottom: 18,
    left: 46,
    right: 46,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
    paddingTop: 6,
    borderTop: "0.5pt solid #e2e8f0",
  },

  // ─── Sello diagonal (BORRADOR/OBSOLETO), todas las páginas ─────────────
  // Mismo estilo que `lib/dc3/template.tsx:226-237`.
  watermark: {
    position: "absolute",
    top: 330,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 54,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
    opacity: 0.16,
    transform: "rotate(-28deg)",
  },

  // ─── Bloque de identidad, sólo primera página (no fixed) ───────────────
  identityBlock: { marginBottom: 14 },
  identityCompany: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  identityDocLine: { fontSize: 11, marginTop: 3, color: "#334155" },
  identityMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  identityMeta: { fontSize: 8, color: "#64748b" },
});

/** Recorta con `…`; nunca deja la banda sin nombre por un título larguísimo. */
function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function DocumentPdf(props: DocumentPdfProps): ReactElement<DocumentProps> {
  const { identity, contentHtml, companyLogoDataUrl } = props;
  const { body, warnings } = htmlToPdfNodes(contentHtml);

  if (warnings.length > 0) {
    console.warn(
      `PDF de ${identity.code} (v${identity.version}): degradaciones en el mapeo HTML->PDF`,
      warnings,
    );
  }

  const isSealed = identity.status !== "VIGENTE";

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.band} fixed>
          {companyLogoDataUrl ? (
            <Image src={companyLogoDataUrl} style={styles.bandLogo} />
          ) : (
            <View style={styles.bandLogoPlaceholder}>
              <Text style={styles.bandLogoInitial}>
                {identity.companyName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.bandTextCol}>
            <Text style={styles.bandCode}>{identity.code}</Text>
            <Text style={styles.bandName}>{truncate(identity.name, 70)}</Text>
          </View>
          <Text style={styles.bandVersion}>v{identity.version}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{`${identity.code} · v${identity.version}`}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>

        {isSealed && (
          <Text fixed style={styles.watermark}>
            {identity.status}
          </Text>
        )}

        <View style={styles.identityBlock}>
          <Text style={styles.identityCompany}>{identity.companyName}</Text>
          <Text style={styles.identityDocLine}>
            {identity.code} · {identity.name}
          </Text>
          <View style={styles.identityMetaRow}>
            <Text style={styles.identityMeta}>{identity.kindLabel}</Text>
            <Text style={styles.identityMeta}>v{identity.version}</Text>
            <Text style={styles.identityMeta}>{identity.statusLabel}</Text>
            <Text style={styles.identityMeta}>{identity.issuedAt}</Text>
            {identity.normaLabel && (
              <Text style={styles.identityMeta}>{identity.normaLabel}</Text>
            )}
          </View>
        </View>

        {body}
      </Page>
    </Document>
  );
}

/** `${code}-v${version}.pdf` — para que las dos rutas nunca puedan divergir
 * en el nombre del archivo descargado. */
export function documentPdfFileName(identity: DocumentIdentity): string {
  return `${identity.code}-v${identity.version}.pdf`;
}
