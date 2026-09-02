import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { DC3_OCCUPATION_AREAS, DC3_THEMATIC_AREAS } from "@/lib/dc3/catalogs";
import { dc3DateCells } from "@/lib/dc3/dates";
import { DC3_NOT_APPLICABLE } from "@/lib/dc3/validation";

/**
 * Formato DC-3 — Constancia de Competencias o de Habilidades Laborales.
 *
 * Reproduce la plantilla oficial de la STPS, incluidas las notas al pie y
 * el reverso con los dos catálogos. Se respeta el maquetado (bandas
 * grises, casillas de CURP/RFC, tres bloques de firma) porque es un
 * documento que se presenta ante la autoridad: un rediseño "más bonito"
 * lo invalida.
 *
 * El único añadido al formato es el folio interno impreso en el pie, que
 * sirve para rastrear reimpresiones y no ocupa ninguna casilla oficial.
 */

const BAND = "#8c8c8c";
const LINE = "#000000";
const HAIRLINE = "#000000";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 34,
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#000000",
  },

  logoNote: {
    fontSize: 6.5,
    marginBottom: 18,
  },
  logoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 8,
    height: 42,
  },
  logoImage: {
    maxHeight: 40,
    maxWidth: 130,
    objectFit: "contain",
  },

  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 10,
  },

  band: {
    backgroundColor: BAND,
    paddingVertical: 2.5,
    borderTop: `1.4pt solid ${LINE}`,
    borderBottom: `1.4pt solid ${LINE}`,
    marginTop: 8,
  },
  bandText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#000000",
  },

  // Celda con etiqueta arriba y el valor debajo, encerrada en el marco
  // fino del formato.
  field: {
    borderLeft: `0.7pt solid ${HAIRLINE}`,
    borderRight: `0.7pt solid ${HAIRLINE}`,
    borderBottom: `0.7pt solid ${HAIRLINE}`,
  },
  fieldLabel: {
    fontSize: 6,
    paddingHorizontal: 3,
    paddingTop: 1.5,
  },
  fieldValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 4,
    paddingTop: 3,
    paddingBottom: 4,
    minHeight: 18,
  },
  row: { flexDirection: "row" },

  // Casillas de un carácter (CURP, RFC, fechas).
  boxRow: { flexDirection: "row", paddingHorizontal: 3, paddingBottom: 3 },
  box: {
    width: 11,
    height: 13,
    border: `0.5pt solid ${HAIRLINE}`,
    marginRight: -0.5,
    textAlign: "center",
    paddingTop: 3,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  boxSep: {
    width: 6,
    textAlign: "center",
    paddingTop: 3,
    fontSize: 7.5,
  },

  // Fila del periodo de ejecución.
  periodHeaderCell: {
    fontSize: 6,
    textAlign: "center",
    borderRight: `0.7pt solid ${HAIRLINE}`,
    paddingVertical: 1.5,
  },

  // Bloque de firmas.
  oathBox: {
    marginTop: 10,
    border: `0.7pt solid ${HAIRLINE}`,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 10,
  },
  oathText: {
    fontSize: 7,
    textAlign: "center",
    lineHeight: 1.35,
    paddingHorizontal: 28,
  },
  signRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 26,
  },
  signCol: { width: "31%", alignItems: "center" },
  signRole: { fontSize: 7.5, textAlign: "center", marginBottom: 22 },
  signName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 2,
    minHeight: 10,
  },
  signLine: {
    borderTop: `1pt solid ${LINE}`,
    width: "100%",
    marginBottom: 2,
  },
  signCaption: { fontSize: 6.5, textAlign: "center" },

  instructionsTitle: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
  },
  instruction: { fontSize: 6, marginTop: 2.5, paddingLeft: 10 },

  pageMark: {
    position: "absolute",
    right: 34,
    bottom: 22,
    textAlign: "right",
    fontSize: 6.5,
  },
  folioMark: {
    position: "absolute",
    left: 34,
    bottom: 22,
    fontSize: 6,
    color: "#333333",
  },

  // Reverso
  reverseTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 14,
  },
  catalogHeadRow: { flexDirection: "row", marginBottom: 6 },
  catalogCol: { width: "50%", flexDirection: "row" },
  catalogHeadCode: {
    width: 74,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  catalogHeadName: {
    flex: 1,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    paddingLeft: 14,
  },
  catalogRow: { flexDirection: "row", marginTop: 1.5 },
  catalogCode: { width: 74, fontSize: 6.5, textAlign: "center" },
  catalogName: { flex: 1, fontSize: 6.5, paddingLeft: 14 },
  catalogAreaCode: {
    width: 74,
    fontSize: 6.5,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
  },
  catalogAreaName: {
    flex: 1,
    fontSize: 6.5,
    paddingLeft: 14,
    fontFamily: "Helvetica-Bold",
  },

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
});

export interface Dc3RenderData {
  // Trabajador
  workerName: string;
  workerCurp: string;
  occupationCode: string;
  occupationLabel: string;
  jobPosition: string | null;
  // Empresa
  employerName: string;
  employerRfc: string;
  legalRepName: string;
  workersRepName: string | null;
  // Programa
  courseName: string;
  durationHours: number;
  startDate: Date;
  endDate: Date;
  thematicAreaCode: string;
  thematicAreaLabel: string;
  trainingAgentName: string;
  trainingAgentRegistry: string | null;
  instructorName: string;
  // Control interno
  folio: string;
  issuedAt: Date;
  companyLogoDataUrl: string | null;
  agentLogoDataUrl: string | null;
  /** Sello diagonal para hojas que no acreditan nada (vista previa). */
  watermark?: string | null;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Fila de casillas de un carácter, rellenadas con `value`. */
function CharBoxes({ value, count }: { value: string; count: number }) {
  const chars = value.slice(0, count).split("");
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Text key={i} style={styles.box}>
          {chars[i] ?? " "}
        </Text>
      ))}
    </>
  );
}

/**
 * RFC en el grupo de casillas del formato: letras — fecha — homoclave.
 * Una persona moral trae 3 letras y una física 4, así que el primer
 * grupo se dimensiona a partir del propio RFC.
 */
function RfcBoxes({ rfc }: { rfc: string }) {
  const letters = rfc.length >= 13 ? 4 : 3;
  return (
    <View style={styles.boxRow}>
      <CharBoxes value={rfc.slice(0, letters)} count={letters} />
      <Text style={styles.boxSep}>-</Text>
      <CharBoxes value={rfc.slice(letters, letters + 6)} count={6} />
      <Text style={styles.boxSep}>-</Text>
      <CharBoxes value={rfc.slice(letters + 6)} count={3} />
    </View>
  );
}

function DateBoxes({ date }: { date: Date }) {
  const { year, month, day } = dc3DateCells(date);
  return (
    <View style={[styles.row, { alignItems: "center" }]}>
      <View style={{ flexDirection: "row", width: 58, justifyContent: "center" }}>
        <CharBoxes value={year} count={4} />
      </View>
      <View style={{ flexDirection: "row", width: 34, justifyContent: "center" }}>
        <CharBoxes value={month} count={2} />
      </View>
      <View style={{ flexDirection: "row", width: 34, justifyContent: "center" }}>
        <CharBoxes value={day} count={2} />
      </View>
    </View>
  );
}

function PeriodHeader() {
  return (
    <View style={[styles.row, { borderBottom: `0.7pt solid ${HAIRLINE}` }]}>
      <View style={{ width: 12 }} />
      <Text style={[styles.periodHeaderCell, { width: 58 }]}>Año</Text>
      <Text style={[styles.periodHeaderCell, { width: 34 }]}>Mes</Text>
      <Text style={[styles.periodHeaderCell, { width: 34 }]}>Día</Text>
      <View style={{ width: 12 }} />
      <Text style={[styles.periodHeaderCell, { width: 58 }]}>Año</Text>
      <Text style={[styles.periodHeaderCell, { width: 34 }]}>Mes</Text>
      <Text style={[styles.periodHeaderCell, { width: 34 }]}>Día</Text>
    </View>
  );
}

export function Dc3Document(d: Dc3RenderData) {
  const issued = new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d.issuedAt);

  return (
    <Document
      title={`DC-3 ${d.folio}`}
      author={d.employerName}
      subject="Constancia de Competencias o de Habilidades Laborales"
    >
      {/* ── ANVERSO ─────────────────────────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        {(d.companyLogoDataUrl || d.agentLogoDataUrl) && (
          <View style={styles.logoStrip}>
            {d.companyLogoDataUrl && (
              <Image src={d.companyLogoDataUrl} style={styles.logoImage} />
            )}
            {d.agentLogoDataUrl && (
              <Image src={d.agentLogoDataUrl} style={styles.logoImage} />
            )}
          </View>
        )}
        <Text style={styles.logoNote}>
          En éste espacio la empresa puede imprimir su logotipo y, en su caso,
          también se puede imprimir el del agente capacitador externo
        </Text>

        <Text style={styles.title}>FORMATO DC-3</Text>
        <Text style={styles.subtitle}>
          CONSTANCIA DE COMPETENCIAS O DE HABILIDADES LABORALES
        </Text>

        {/* ── DATOS DEL TRABAJADOR ───────────────────────────────── */}
        <View style={styles.band}>
          <Text style={styles.bandText}>DATOS DEL TRABAJADOR</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Nombre (Anotar apellido paterno, materno y nombre (s)
          </Text>
          <Text style={styles.fieldValue}>{truncate(d.workerName, 90)}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { width: "58%" }]}>
            <Text style={styles.fieldLabel}>
              Clave única de Registro de Población
            </Text>
            <View style={styles.boxRow}>
              <CharBoxes value={d.workerCurp} count={18} />
            </View>
          </View>
          <View style={[styles.field, { width: "42%", borderLeft: "none" }]}>
            <Text style={styles.fieldLabel}>
              Ocupación específica (Catálogo Nacional de Ocupaciones) 1/
            </Text>
            {/* Solo la denominación. La clave (04.4, 8000…) se sigue
                guardando en el snapshot para poder auditar de qué entrada
                del catálogo salió, pero no se imprime: en el papel lo que
                se lee es el nombre. */}
            <Text style={styles.fieldValue}>
              {truncate(d.occupationLabel, 46)}
            </Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Puesto *</Text>
          <Text style={styles.fieldValue}>
            {d.jobPosition ? truncate(d.jobPosition, 90) : " "}
          </Text>
        </View>

        {/* ── DATOS DE LA EMPRESA ────────────────────────────────── */}
        <View style={styles.band}>
          <Text style={styles.bandText}>DATOS DE LA EMPRESA</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Nombre o razón social (En caso de persona física, anotar apellido
            paterno, materno y nombre (s)
          </Text>
          <Text style={styles.fieldValue}>{truncate(d.employerName, 90)}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Registro Federal de Contribuyentes con homoclave (SHCP)
          </Text>
          <RfcBoxes rfc={d.employerRfc} />
        </View>

        {/* ── DATOS DEL PROGRAMA ─────────────────────────────────── */}
        <View style={styles.band}>
          <Text style={styles.bandText}>
            DATOS DEL PROGRAMA DE CAPACITACION, ADIESTRAMIENTO Y PRODUCTIVIDAD
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nombre del curso</Text>
          <Text style={styles.fieldValue}>{truncate(d.courseName, 110)}</Text>
        </View>

        <View style={[styles.row, styles.field]}>
          <View
            style={{
              width: "34%",
              borderRight: `0.7pt solid ${HAIRLINE}`,
              justifyContent: "center",
            }}
          >
            <Text style={[styles.fieldLabel, { textAlign: "center" }]}>
              Duración en horas
            </Text>
            <Text style={[styles.fieldValue, { textAlign: "center" }]}>
              {d.durationHours}
            </Text>
          </View>
          <View
            style={{
              width: "16%",
              borderRight: `0.7pt solid ${HAIRLINE}`,
              justifyContent: "center",
              paddingHorizontal: 3,
            }}
          >
            <Text style={{ fontSize: 6 }}>Periodo de ejecución</Text>
          </View>
          <View style={{ flex: 1 }}>
            <PeriodHeader />
            <View
              style={[
                styles.row,
                { alignItems: "center", paddingVertical: 2 },
              ]}
            >
              <Text style={{ width: 12, fontSize: 6.5, paddingLeft: 2 }}>
                De
              </Text>
              <DateBoxes date={d.startDate} />
              <Text
                style={{ width: 12, fontSize: 6.5, textAlign: "center" }}
              >
                a
              </Text>
              <DateBoxes date={d.endDate} />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Área temática del curso 2/</Text>
          <Text style={styles.fieldValue}>
            {truncate(d.thematicAreaLabel, 90)}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Nombre del agente capacitador o STPS 3/
          </Text>
          <Text style={styles.fieldValue}>
            {truncate(
              d.trainingAgentRegistry
                ? `${d.trainingAgentName} — Registro STPS: ${d.trainingAgentRegistry}`
                : d.trainingAgentName,
              110
            )}
          </Text>
        </View>

        {/* ── PROTESTA Y FIRMAS ──────────────────────────────────── */}
        <View style={styles.oathBox}>
          <Text style={styles.oathText}>
            Los datos se asientan en esta constancia bajo protesta de decir
            verdad, apercibidos de la responsabilidad en que incurre todo aquel
            que no se conduce con verdad.
          </Text>

          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <Text style={styles.signRole}>Instructor o Tutor</Text>
              <Text style={styles.signName}>
                {truncate(d.instructorName, 46)}
              </Text>
              <View style={styles.signLine} />
              <Text style={styles.signCaption}>Nombre y Firma</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signRole}>
                Patrón o representante legal 4/
              </Text>
              <Text style={styles.signName}>
                {truncate(d.legalRepName, 46)}
              </Text>
              <View style={styles.signLine} />
              <Text style={styles.signCaption}>Nombre y Firma</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signRole}>
                Representante de los trabajadores 5/
              </Text>
              {/* Vacío no es lo mismo que "se me olvidó": la nota 5 sólo
                  obliga a las empresas de más de 50 trabajadores. Se
                  imprime "No aplica" para que quien reciba la constancia
                  lea una decisión y no un hueco. */}
              <Text style={styles.signName}>
                {d.workersRepName
                  ? truncate(d.workersRepName, 46)
                  : DC3_NOT_APPLICABLE}
              </Text>
              <View style={styles.signLine} />
              <Text style={styles.signCaption}>Nombre y Firma</Text>
            </View>
          </View>
        </View>

        {/* ── INSTRUCCIONES ──────────────────────────────────────── */}
        <Text style={styles.instructionsTitle}>INSTRUCCIONES</Text>
        <Text style={styles.instruction}>- Llenar a máquina o con letra de molde</Text>
        <Text style={styles.instruction}>
          - Deberá entregarse al trabajador dentro de los veinte días hábiles
          siguientes al término del curso de capacitación aprobado.
        </Text>
        <Text style={styles.instruction}>
          1/ Las áreas y subáreas ocupacionales del Catálogo Nacional de
          Ocupaciones se encuentran disponibles en el reverso de este formato y
          en la página www.stps.gob.mx
        </Text>
        <Text style={styles.instruction}>
          2/ Las áreas temáticas de los cursos se encuentran disponibles en el
          reverso de este formato y en la página www.stps.gob.mx
        </Text>
        <Text style={styles.instruction}>
          3/ Cursos impartidos por el área competente de la Secretaría del
          Trabajo y Previsión Social
        </Text>
        <Text style={styles.instruction}>
          4/ Para empresas con menos de 51 trabajadores. Para empresas con mas
          de 50 trabajadores firmaría el representante del patrón ante la
          Comisión Mixta de capacitación adiestramiento y productividad
        </Text>
        <Text style={styles.instruction}>
          5/ Solo para empresas con mas de 50 trabajadores
        </Text>
        <Text style={styles.instruction}>* Dato no obligatorio</Text>

        <Text style={styles.folioMark}>
          Folio de control {d.folio} · Emitida el {issued}
        </Text>
        <Text style={styles.pageMark}>DC-3{"\n"}ANVERSO</Text>

        {d.watermark && <Text style={styles.watermark}>{d.watermark}</Text>}
      </Page>

      {/* ── REVERSO: catálogos oficiales ────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.reverseTitle}>
          CLAVES Y DENOMINACIONES DE AREAS Y SUBAREAS DEL CATALOGO NACIONAL DE
          OCUPACIONES
        </Text>

        <View style={styles.catalogHeadRow}>
          {[0, 1].map((col) => (
            <View key={col} style={styles.catalogCol}>
              <Text style={styles.catalogHeadCode}>
                CLAVE DEL{"\n"}AREA/SUBAREA
              </Text>
              <Text style={styles.catalogHeadName}>DENOMINACION</Text>
            </View>
          ))}
        </View>

        <View style={styles.row}>
          {[DC3_OCCUPATION_AREAS.slice(0, 5), DC3_OCCUPATION_AREAS.slice(5)].map(
            (areas, col) => (
              <View key={col} style={{ width: "50%" }}>
                {areas.map((area) => (
                  <View key={area.code} wrap={false}>
                    <View style={[styles.catalogRow, { marginTop: 7 }]}>
                      <Text style={styles.catalogAreaCode}>{area.code}</Text>
                      <Text style={styles.catalogAreaName}>{area.label}</Text>
                    </View>
                    {area.subareas.map((sub) => (
                      <View key={sub.code} style={styles.catalogRow}>
                        <Text style={styles.catalogCode}>{sub.code}</Text>
                        <Text style={styles.catalogName}>{sub.label}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )
          )}
        </View>

        <Text style={[styles.reverseTitle, { marginTop: 22 }]}>
          CLAVES Y DENOMINACIONES DEL CATALOGO DE AREAS TEMATICAS DE LOS CURSOS
        </Text>

        <View style={styles.catalogHeadRow}>
          {[0, 1].map((col) => (
            <View key={col} style={styles.catalogCol}>
              <Text style={styles.catalogHeadCode}>CLAVE DEL AREA</Text>
              <Text style={styles.catalogHeadName}>DENOMINACION</Text>
            </View>
          ))}
        </View>

        <View style={styles.row}>
          {[DC3_THEMATIC_AREAS.slice(0, 5), DC3_THEMATIC_AREAS.slice(5)].map(
            (areas, col) => (
              <View key={col} style={{ width: "50%" }}>
                {areas.map((area) => (
                  <View key={area.code} style={styles.catalogRow}>
                    <Text style={styles.catalogCode}>{area.code}</Text>
                    <Text style={styles.catalogName}>{area.label}</Text>
                  </View>
                ))}
              </View>
            )
          )}
        </View>

        <Text style={styles.pageMark}>DC-3{"\n"}REVERSO</Text>
      </Page>
    </Document>
  );
}
