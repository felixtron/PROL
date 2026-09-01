import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Path,
  Circle,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import { db, type EvaluationKind } from "@prol/db";
import { getEvaluationResults } from "@/lib/queries/evaluation";
import { loadUploadAsDataUrl } from "@/lib/certificate-assets";

type ResultsData = Awaited<ReturnType<typeof getEvaluationResults>>;
type SectionData = ResultsData["sections"][number];
type QuestionData = SectionData["questions"][number];
type Verdict = QuestionData["verdict"];
type Counts = QuestionData["counts"];

/** Misma paleta que las vistas web de resultados. */
const COLOR = {
  positive: "#10b981", // emerald-500
  partial: "#f59e0b", // amber-500
  negative: "#ef4444", // red-500
  opportunity: "#3b82f6", // blue-500
  track: "#e2e8f0", // slate-200
};

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 36,
    fontSize: 10,
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1pt solid #e2e8f0",
  },
  brandBox: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 48, height: 48, objectFit: "contain" },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#eef2ff",
    color: "#4338ca",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 14,
  },
  tenantName: { fontSize: 12, fontWeight: "bold" },
  tenantMeta: { fontSize: 8, color: "#64748b" },
  headerRight: { flexDirection: "column", alignItems: "flex-end" },
  reportTag: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  reportDate: { fontSize: 9, color: "#475569", marginTop: 2 },

  title: { fontSize: 20, fontWeight: "bold", marginTop: 6 },
  subtitle: { fontSize: 11, color: "#475569", marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 8 },
  metaCell: { flexDirection: "column" },
  metaLabel: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metaValue: { fontSize: 10, color: "#1e293b", marginTop: 2 },

  summaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    flexDirection: "column",
  },
  summaryLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryValue: { fontSize: 18, fontWeight: "bold", marginTop: 4 },
  summaryFoot: { fontSize: 8, marginTop: 2 },

  // ─── Bloques de resumen con gráfica ──────────────────────────────────────
  panel: {
    marginTop: 18,
    borderRadius: 8,
    border: "0.5pt solid #e2e8f0",
    padding: 12,
  },
  panelTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 8 },
  panelRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  eyebrow: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bigValue: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#047857",
    marginTop: 4,
  },
  hintText: { fontSize: 8, color: "#94a3b8", marginTop: 3, lineHeight: 1.4 },

  legendGrid: { flexDirection: "row", gap: 10, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  legendSwatch: { width: 6, height: 6, borderRadius: 1.5 },
  legendText: { fontSize: 8, color: "#475569" },

  // Tabla del resumen DAFO
  tableHeadRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #e2e8f0",
    paddingBottom: 4,
  },
  tableHeadCell: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 5,
    paddingBottom: 5,
    borderBottom: "0.5pt solid #f1f5f9",
  },
  tableCellLabel: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  tableCellNum: { width: 42, textAlign: "right", fontSize: 9, color: "#475569" },
  tableCellPct: {
    width: 46,
    textAlign: "right",
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e293b",
  },

  // Cuadrantes DAFO
  quadrantGrid: { flexDirection: "row", gap: 8, marginTop: 10 },
  quadrant: {
    flex: 1,
    borderRadius: 8,
    border: "0.5pt solid #e2e8f0",
    padding: 10,
  },
  quadrantCells: { flexDirection: "row", gap: 8, marginTop: 6 },
  quadrantCell: { flex: 1, borderRadius: 6, padding: 8 },
  quadrantCellLabel: { fontSize: 8, fontWeight: "bold" },
  quadrantCellValue: { fontSize: 20, fontWeight: "bold", marginTop: 2 },
  quadrantCellFoot: { fontSize: 7, marginTop: 1 },

  sectionHeader: {
    marginTop: 18,
    paddingBottom: 4,
    borderBottom: "0.5pt solid #cbd5e1",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: "bold" },
  sectionKind: { fontSize: 8, color: "#64748b", marginTop: 1 },
  sectionScore: { fontSize: 8, color: "#64748b" },
  sectionScoreStrong: { fontWeight: "bold", color: "#1e293b" },

  question: {
    marginTop: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    gap: 6,
  },
  questionBody: { flex: 1 },
  questionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  questionLabel: { fontSize: 10, lineHeight: 1.4, flex: 1 },
  questionCode: { fontWeight: "bold", color: "#475569" },
  questionPct: { fontSize: 9, fontWeight: "bold", color: "#475569" },
  verdictRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  verdictPill: {
    fontSize: 8,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    borderRadius: 9,
    fontWeight: "bold",
  },
  countsText: { fontSize: 8, color: "#64748b" },

  factorRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  factorPill: {
    fontSize: 8,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    borderRadius: 9,
    fontWeight: "bold",
  },

  textAnswerBox: {
    marginTop: 4,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 7,
    paddingRight: 7,
    borderLeft: "2pt solid #6366f1",
    backgroundColor: "#ffffff",
  },
  textAuthor: { fontSize: 8, color: "#64748b", fontWeight: "bold" },
  textBody: { fontSize: 9, marginTop: 2, lineHeight: 1.4 },

  emptyRow: {
    fontSize: 9,
    fontStyle: "italic",
    color: "#94a3b8",
    marginTop: 4,
  },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
    paddingTop: 6,
    borderTop: "0.5pt solid #e2e8f0",
  },
});

const KIND_LABEL: Record<EvaluationKind, string> = {
  DAFO: "DAFO",
  DIAGNOSTIC: "Diagnóstico",
  GUIDELINES: "Directrices",
  STAKEHOLDERS: "Partes interesadas",
  ROLES: "Cargos y roles",
};

const FACTOR_LABEL = {
  STRENGTH: "Fortaleza",
  WEAKNESS: "Debilidad",
  OPPORTUNITY: "Oportunidad",
  THREAT: "Amenaza",
} as const;

const FACTOR_COLORS = {
  STRENGTH: { bg: "#d1fae5", fg: "#065f46" },
  WEAKNESS: { bg: "#fee2e2", fg: "#991b1b" },
  OPPORTUNITY: { bg: "#dbeafe", fg: "#1e40af" },
  THREAT: { bg: "#fef3c7", fg: "#92400e" },
} as const;

const POSITIVE_LABEL = {
  INTERNAL: "Fortalezas",
  EXTERNAL: "Oportunidades",
} as const;
const NEGATIVE_LABEL = {
  INTERNAL: "Debilidades",
  EXTERNAL: "Amenazas",
} as const;

function verdictStyle(
  v: Verdict,
  sectionType: "INTERNAL" | "EXTERNAL",
  kind: EvaluationKind,
) {
  if (v === "POSITIVE") {
    const label =
      kind === "DIAGNOSTIC"
        ? "Sí"
        : sectionType === "INTERNAL"
          ? "Fortaleza"
          : "Oportunidad";
    return { label, bg: "#d1fae5", fg: "#065f46" };
  }
  if (v === "PARTIAL") {
    return { label: "Parcial", bg: "#fef3c7", fg: "#92400e" };
  }
  if (v === "NEGATIVE") {
    const label =
      kind === "DIAGNOSTIC"
        ? "No"
        : sectionType === "INTERNAL"
          ? "Debilidad"
          : "Amenaza";
    return { label, bg: "#fee2e2", fg: "#991b1b" };
  }
  if (v === "NOT_APPLICABLE") {
    return { label: "No aplica", bg: "#e2e8f0", fg: "#475569" };
  }
  return { label: "Sin respuesta", bg: "#e2e8f0", fg: "#94a3b8" };
}

/**
 * Cumplimiento ponderado de una pregunta: Sí = 1, Parcial = 0.5, No = 0.
 * N/A y sin respuesta se excluyen. Espejo exacto de `diagnostic-results-view`.
 */
function complianceOf(counts: Counts): number | null {
  const denom = counts.POSITIVE + counts.PARTIAL + counts.NEGATIVE;
  if (denom === 0) return null;
  return ((counts.POSITIVE * 1 + counts.PARTIAL * 0.5) / denom) * 100;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// ─── Primitivas gráficas ─────────────────────────────────────────────────────

/** Semáforo: círculo de color con el glifo dibujado en SVG (las fuentes PDF
 *  estándar no traen ✓/✕, por eso se dibujan como paths). */
function VerdictIcon({
  verdict,
  size = 11,
}: {
  verdict: Verdict;
  size?: number;
}) {
  const cfg =
    verdict === "POSITIVE"
      ? { bg: "#d1fae5", fg: "#047857" }
      : verdict === "PARTIAL"
        ? { bg: "#fef3c7", fg: "#b45309" }
        : verdict === "NEGATIVE"
          ? { bg: "#fee2e2", fg: "#b91c1c" }
          : { bg: "#e2e8f0", fg: "#94a3b8" };
  const inner = size * 0.62;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: cfg.bg,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1.5,
      }}
    >
      <Svg width={inner} height={inner} viewBox="0 0 12 12">
        {verdict === "POSITIVE" && (
          <Path
            d="M2.2 6.4 L4.9 9.1 L9.8 3.2"
            stroke={cfg.fg}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
        {verdict === "PARTIAL" && (
          <>
            <Circle
              cx={6}
              cy={6}
              r={4.2}
              stroke={cfg.fg}
              strokeWidth={1.4}
              fill="none"
            />
            <Circle cx={6} cy={6} r={1.7} fill={cfg.fg} />
          </>
        )}
        {verdict === "NEGATIVE" && (
          <Path
            d="M3.1 3.1 L8.9 8.9 M8.9 3.1 L3.1 8.9"
            stroke={cfg.fg}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {(verdict === "NOT_APPLICABLE" || verdict === "NO_RESPONSE") && (
          <Path
            d="M2.8 6 L9.2 6"
            stroke={cfg.fg}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
}

/** Icono de pregunta abierta (globo de texto). */
function TextIcon({ size = 11 }: { size?: number }) {
  const inner = size * 0.62;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#fef3c7",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1.5,
      }}
    >
      <Svg width={inner} height={inner} viewBox="0 0 12 12">
        <Path
          d="M1.6 2.6 L10.4 2.6 L10.4 8.2 L5.4 8.2 L3.1 10.2 L3.1 8.2 L1.6 8.2 Z"
          stroke="#b45309"
          strokeWidth={1.3}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

/** Barra apilada Sí / Parcial / No — equivalente al <StackedBar> de la web. */
function StackedBar({
  positive,
  partial,
  negative,
  height = 5,
}: {
  positive: number;
  partial: number;
  negative: number;
  height?: number;
}) {
  const total = positive + partial + negative;
  const track = {
    flexDirection: "row" as const,
    height,
    borderRadius: height / 2,
    backgroundColor: COLOR.track,
    overflow: "hidden" as const,
  };
  if (total === 0) return <View style={track} />;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <View style={track}>
      {positive > 0 && (
        <View
          style={{ width: seg(positive), height, backgroundColor: COLOR.positive }}
        />
      )}
      {partial > 0 && (
        <View
          style={{ width: seg(partial), height, backgroundColor: COLOR.partial }}
        />
      )}
      {negative > 0 && (
        <View
          style={{ width: seg(negative), height, backgroundColor: COLOR.negative }}
        />
      )}
    </View>
  );
}

function LegendItem({
  color,
  label,
  count,
  total,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? round1((count / total) * 100) : 0;
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>
        {label}: {count} ({pct}%)
      </Text>
    </View>
  );
}

/** Gráfica de pastel en SVG — mismo cálculo de arcos que la vista web. */
function PieChart({
  slices,
  size = 130,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const cx = 100;
  const cy = 100;
  const r = 90;
  if (total <= 0) {
    return (
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Circle cx={cx} cy={cy} r={r} fill={COLOR.track} />
      </Svg>
    );
  }
  const nodes: React.ReactElement[] = [];
  let acc = 0;
  for (const s of slices) {
    if (s.value <= 0) continue;
    // Un arco SVG no puede cubrir 360°: si una sola categoría concentra todo,
    // se dibuja como disco.
    if (s.value === total) {
      nodes.push(<Circle key={s.label} cx={cx} cy={cy} r={r} fill={s.color} />);
      break;
    }
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.value;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    nodes.push(
      <Path
        key={s.label}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={s.color}
      />,
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {nodes}
    </Svg>
  );
}

// ─── Agregados (espejo de las vistas web) ────────────────────────────────────

/** Totales del diagnóstico: espejo de `DiagnosticResultsView`. */
function diagnosticTotals(sections: SectionData[]) {
  let totalCompliance = 0;
  let answeredQuestions = 0;
  let pos = 0;
  let partial = 0;
  let neg = 0;
  for (const s of sections) {
    for (const q of s.questions) {
      if (q.type !== "MULTIPLE_CHOICE") continue;
      const c = complianceOf(q.counts);
      if (c === null) continue;
      totalCompliance += c;
      answeredQuestions += 1;
      pos += q.counts.POSITIVE;
      partial += q.counts.PARTIAL;
      neg += q.counts.NEGATIVE;
    }
  }
  const compliance =
    answeredQuestions > 0 ? round1(totalCompliance / answeredQuestions) : 0;
  return {
    compliance,
    gap: round1(100 - compliance),
    answeredQuestions,
    pos,
    partial,
    neg,
    totalResponses: pos + partial + neg,
  };
}

/** Cumplimiento de una sección: promedio del cumplimiento por pregunta. */
function sectionCompliance(s: SectionData): number | null {
  const values = s.questions
    .filter((q) => q.type === "MULTIPLE_CHOICE")
    .map((q) => complianceOf(q.counts))
    .filter((c): c is number => c !== null);
  if (values.length === 0) return null;
  return round1(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Agregado por bloque DAFO: espejo exacto de `aggregate()` en `results-view`. */
function dafoAggregate(sections: SectionData[]) {
  let totalQ = 0;
  let pos = 0;
  let neg = 0;
  for (const s of sections) {
    totalQ += s.questions.filter((q) => q.verdict !== "NOT_APPLICABLE").length;
    pos += s.positives;
    neg += s.negatives;
  }
  return {
    pos,
    neg,
    posPct: totalQ > 0 ? round1((pos / totalQ) * 100) : 0,
    negPct: totalQ > 0 ? round1((neg / totalQ) * 100) : 0,
  };
}

interface ReportProps {
  tenant: {
    name: string;
    logoDataUrl: string | null;
    primaryColor: string;
  };
  evaluation: {
    title: string;
    description: string | null;
    kind: EvaluationKind;
  };
  company: { name: string };
  respondents: number;
  totalParticipants: number;
  generatedAt: string;
  sections: SectionData[];
}

// ─── Bloques de resumen ──────────────────────────────────────────────────────

/** Diagnóstico: cumplimiento global + distribución de respuestas. */
function DiagnosticSummary({ sections }: { sections: SectionData[] }) {
  const t = diagnosticTotals(sections);
  return (
    <View style={styles.panel} wrap={false}>
      <View style={styles.panelRow}>
        <View style={{ width: 170 }}>
          <Text style={styles.eyebrow}>Cumplimiento global</Text>
          <Text style={styles.bigValue}>{t.compliance}%</Text>
          <Text style={styles.hintText}>
            GAP de {t.gap}% sobre {t.answeredQuestions} pregunta
            {t.answeredQuestions !== 1 ? "s" : ""} con respuestas
          </Text>
          <Text style={styles.hintText}>
            Cumplimiento = (Sí × 1 + Parcial × 0.5) / total · GAP = 100 -
            cumplimiento
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { marginBottom: 6 }]}>
            Distribución de respuestas
          </Text>
          <StackedBar
            positive={t.pos}
            partial={t.partial}
            negative={t.neg}
            height={8}
          />
          <View style={styles.legendGrid}>
            <LegendItem
              color={COLOR.positive}
              label="Sí"
              count={t.pos}
              total={t.totalResponses}
            />
            <LegendItem
              color={COLOR.partial}
              label="Parcial"
              count={t.partial}
              total={t.totalResponses}
            />
            <LegendItem
              color={COLOR.negative}
              label="No"
              count={t.neg}
              total={t.totalResponses}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** DAFO: pastel + tabla + cuadrantes internos/externos. */
function DafoSummary({ sections }: { sections: SectionData[] }) {
  const internal = dafoAggregate(sections.filter((s) => s.type === "INTERNAL"));
  const external = dafoAggregate(sections.filter((s) => s.type === "EXTERNAL"));
  const rows = [
    {
      label: "Fortalezas",
      color: COLOR.positive,
      n: internal.pos,
      pct: internal.posPct,
    },
    {
      label: "Debilidades",
      color: COLOR.negative,
      n: internal.neg,
      pct: internal.negPct,
    },
    {
      label: "Oportunidades",
      color: COLOR.opportunity,
      n: external.pos,
      pct: external.posPct,
    },
    {
      label: "Amenazas",
      color: COLOR.partial,
      n: external.neg,
      pct: external.negPct,
    },
  ];

  return (
    <>
      <View style={styles.panel} wrap={false}>
        <Text style={styles.panelTitle}>Resumen DAFO</Text>
        <View style={styles.panelRow}>
          <View style={{ width: 140, alignItems: "center" }}>
            <PieChart
              slices={rows.map((r) => ({
                label: r.label,
                value: r.n,
                color: r.color,
              }))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.tableHeadRow}>
              <Text style={[styles.tableHeadCell, { flex: 1 }]}>Categoría</Text>
              <Text
                style={[styles.tableHeadCell, { width: 42, textAlign: "right" }]}
              >
                Items
              </Text>
              <Text
                style={[styles.tableHeadCell, { width: 46, textAlign: "right" }]}
              >
                %
              </Text>
            </View>
            {rows.map((r) => (
              <View key={r.label} style={styles.tableRow}>
                <View style={styles.tableCellLabel}>
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 1.5,
                      backgroundColor: r.color,
                    }}
                  />
                  <Text style={{ fontSize: 9 }}>{r.label}</Text>
                </View>
                <Text style={styles.tableCellNum}>{r.n}</Text>
                <Text style={styles.tableCellPct}>{r.pct}%</Text>
              </View>
            ))}
            <Text style={styles.hintText}>
              % calculado sobre el total de preguntas aplicables de cada bloque
              (Internas para Fortalezas/Debilidades; Externas para
              Oportunidades/Amenazas).
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quadrantGrid} wrap={false}>
        <Quadrant
          title="Cuestiones internas"
          positiveLabel="Fortalezas"
          negativeLabel="Debilidades"
          agg={internal}
        />
        <Quadrant
          title="Cuestiones externas"
          positiveLabel="Oportunidades"
          negativeLabel="Amenazas"
          agg={external}
        />
      </View>
    </>
  );
}

function Quadrant({
  title,
  positiveLabel,
  negativeLabel,
  agg,
}: {
  title: string;
  positiveLabel: string;
  negativeLabel: string;
  agg: { pos: number; neg: number; posPct: number; negPct: number };
}) {
  return (
    <View style={styles.quadrant}>
      <Text style={styles.eyebrow}>{title}</Text>
      <View style={styles.quadrantCells}>
        <View style={[styles.quadrantCell, { backgroundColor: "#ecfdf5" }]}>
          <Text style={[styles.quadrantCellLabel, { color: "#065f46" }]}>
            {positiveLabel}
          </Text>
          <Text style={[styles.quadrantCellValue, { color: "#065f46" }]}>
            {agg.posPct}%
          </Text>
          <Text style={[styles.quadrantCellFoot, { color: "#047857" }]}>
            {agg.pos} ítem{agg.pos !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={[styles.quadrantCell, { backgroundColor: "#fef2f2" }]}>
          <Text style={[styles.quadrantCellLabel, { color: "#991b1b" }]}>
            {negativeLabel}
          </Text>
          <Text style={[styles.quadrantCellValue, { color: "#991b1b" }]}>
            {agg.negPct}%
          </Text>
          <Text style={[styles.quadrantCellFoot, { color: "#b91c1c" }]}>
            {agg.neg} ítem{agg.neg !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Tarjetas de resumen para tipos sin agregados de verdicto. */
function genericSummaryCards(p: ReportProps) {
  const completionPct =
    p.totalParticipants > 0
      ? Math.round((p.respondents / p.totalParticipants) * 100)
      : 0;
  const totalQuestions = p.sections.reduce((n, s) => n + s.questions.length, 0);
  const totalAnswers = p.sections.reduce(
    (n, s) =>
      n +
      s.questions.reduce(
        (m, q) => m + q.textAnswers.length + (q.factorAnswers?.length ?? 0),
        0,
      ),
    0,
  );
  return [
    {
      label: "Participantes",
      value: `${p.respondents}/${p.totalParticipants}`,
      foot: `${completionPct}% respondieron`,
      bg: "#eef2ff",
      fg: "#3730a3",
    },
    {
      label: "Preguntas",
      value: `${totalQuestions}`,
      foot: `${p.sections.length} secciones`,
      bg: "#f1f5f9",
      fg: "#1e293b",
    },
    {
      label: "Respuestas",
      value: `${totalAnswers}`,
      foot: "recolectadas",
      bg: "#ecfdf5",
      fg: "#065f46",
    },
    {
      label: "Tipo",
      value: KIND_LABEL[p.evaluation.kind],
      foot: "evaluación",
      bg: "#fffbeb",
      fg: "#92400e",
    },
  ];
}

// ─── Documento ───────────────────────────────────────────────────────────────

const Report = (p: ReportProps) => {
  const isDiagnostic = p.evaluation.kind === "DIAGNOSTIC";
  const isDafo = p.evaluation.kind === "DAFO";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header con branding del tenant */}
        <View style={styles.header}>
          <View style={styles.brandBox}>
            {p.tenant.logoDataUrl ? (
              <Image src={p.tenant.logoDataUrl} style={styles.logo} />
            ) : (
              <Text style={styles.logoPlaceholder}>
                {p.tenant.name.slice(0, 1).toUpperCase()}
              </Text>
            )}
            <View>
              <Text style={[styles.tenantName, { color: p.tenant.primaryColor }]}>
                {p.tenant.name}
              </Text>
              <Text style={styles.tenantMeta}>Reporte de evaluación</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTag}>{KIND_LABEL[p.evaluation.kind]}</Text>
            <Text style={styles.reportDate}>Generado: {p.generatedAt}</Text>
          </View>
        </View>

        <Text style={styles.title}>{p.evaluation.title}</Text>
        {p.evaluation.description && (
          <Text style={styles.subtitle}>{p.evaluation.description}</Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Empresa</Text>
            <Text style={styles.metaValue}>{p.company.name}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Participantes</Text>
            <Text style={styles.metaValue}>
              {p.respondents} de {p.totalParticipants} respondieron
            </Text>
          </View>
        </View>

        {/* Resumen: gráfico según el tipo de evaluación */}
        {isDiagnostic ? (
          <DiagnosticSummary sections={p.sections} />
        ) : isDafo ? (
          <DafoSummary sections={p.sections} />
        ) : (
          <View style={styles.summaryGrid}>
            {genericSummaryCards(p).map((c, i) => (
              <View
                key={i}
                style={[styles.summaryCard, { backgroundColor: c.bg }]}
              >
                <Text style={[styles.summaryLabel, { color: c.fg }]}>
                  {c.label}
                </Text>
                <Text style={[styles.summaryValue, { color: c.fg }]}>
                  {c.value}
                </Text>
                <Text style={[styles.summaryFoot, { color: c.fg }]}>
                  {c.foot}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Secciones */}
        {p.sections.map((s) => {
          const compliance = isDiagnostic ? sectionCompliance(s) : null;
          return (
            <View key={s.id} wrap>
              <View style={styles.sectionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{s.title}</Text>
                  <Text style={styles.sectionKind}>
                    {isDafo
                      ? `${POSITIVE_LABEL[s.type]}: ${s.positives} (${s.positivePct}%) · ${NEGATIVE_LABEL[s.type]}: ${s.negatives} (${s.negativePct}%)`
                      : s.type === "INTERNAL"
                        ? "Cuestiones internas (Fortalezas/Debilidades)"
                        : "Cuestiones externas (Oportunidades/Amenazas)"}
                  </Text>
                </View>
                {compliance !== null && (
                  <Text style={styles.sectionScore}>
                    Cumplimiento{" "}
                    <Text style={styles.sectionScoreStrong}>{compliance}%</Text>{" "}
                    · GAP{" "}
                    <Text style={styles.sectionScoreStrong}>
                      {round1(100 - compliance)}%
                    </Text>
                  </Text>
                )}
              </View>

              {s.questions.map((q) => {
                const isOpenText = q.type === "OPEN_TEXT";
                const isMultiFactor = q.type === "MULTI_FACTOR";
                const verdict = verdictStyle(q.verdict, s.type, p.evaluation.kind);
                const questionCompliance =
                  isDiagnostic && !isOpenText && !isMultiFactor
                    ? complianceOf(q.counts)
                    : null;
                const totalAnswers =
                  q.counts.POSITIVE +
                  q.counts.PARTIAL +
                  q.counts.NEGATIVE +
                  q.counts.NOT_APPLICABLE;

                return (
                  <View key={q.id} style={styles.question} wrap={false}>
                    {/* Semáforo */}
                    {isOpenText ? (
                      <TextIcon />
                    ) : isMultiFactor ? (
                      <TextIcon />
                    ) : (
                      <VerdictIcon verdict={q.verdict} />
                    )}

                    <View style={styles.questionBody}>
                      <View style={styles.questionTopRow}>
                        <Text style={styles.questionLabel}>
                          {q.code && (
                            <Text style={styles.questionCode}>{q.code}. </Text>
                          )}
                          {q.label}
                        </Text>
                        {questionCompliance !== null && (
                          <Text style={styles.questionPct}>
                            {round1(questionCompliance)}%
                          </Text>
                        )}
                      </View>

                      {/* Diagnóstico: barra apilada + conteos */}
                      {isDiagnostic && !isOpenText && !isMultiFactor && (
                        <>
                          {questionCompliance !== null ? (
                            <>
                              <View style={{ marginTop: 4 }}>
                                <StackedBar
                                  positive={q.counts.POSITIVE}
                                  partial={q.counts.PARTIAL}
                                  negative={q.counts.NEGATIVE}
                                />
                              </View>
                              <Text
                                style={[styles.countsText, { marginTop: 3 }]}
                              >
                                {q.counts.POSITIVE} Sí · {q.counts.PARTIAL}{" "}
                                Parcial · {q.counts.NEGATIVE} No
                                {q.counts.NOT_APPLICABLE > 0
                                  ? ` · ${q.counts.NOT_APPLICABLE} N/A`
                                  : ""}
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.emptyRow}>
                              Sin respuestas todavía
                            </Text>
                          )}
                        </>
                      )}

                      {/* Resto de tipos: pastilla de verdicto + conteos */}
                      {!isDiagnostic && !isOpenText && !isMultiFactor && (
                        <View style={styles.verdictRow}>
                          <Text
                            style={[
                              styles.verdictPill,
                              { backgroundColor: verdict.bg, color: verdict.fg },
                            ]}
                          >
                            {verdict.label}
                          </Text>
                          {totalAnswers > 0 && (
                            <Text style={styles.countsText}>
                              {`${q.counts.POSITIVE} pos · ${q.counts.NEGATIVE} neg · ${q.counts.NOT_APPLICABLE} N/A`}
                            </Text>
                          )}
                        </View>
                      )}

                      {isMultiFactor && (
                        <View style={styles.factorRow}>
                          {(
                            [
                              "STRENGTH",
                              "WEAKNESS",
                              "OPPORTUNITY",
                              "THREAT",
                            ] as const
                          ).map((f) => {
                            const n = q.factorCounts?.[f] ?? 0;
                            if (n === 0) return null;
                            const c = FACTOR_COLORS[f];
                            return (
                              <Text
                                key={f}
                                style={[
                                  styles.factorPill,
                                  { backgroundColor: c.bg, color: c.fg },
                                ]}
                              >
                                {FACTOR_LABEL[f]}: {n}
                              </Text>
                            );
                          })}
                        </View>
                      )}

                      {q.textAnswers.length > 0 &&
                        q.textAnswers.map((t, i) => (
                          <View key={i} style={styles.textAnswerBox}>
                            <Text style={styles.textAuthor}>{t.author}</Text>
                            <Text style={styles.textBody}>{t.text}</Text>
                          </View>
                        ))}

                      {isOpenText && q.textAnswers.length === 0 && (
                        <Text style={styles.emptyRow}>
                          Sin respuestas todavía
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text>
            {p.tenant.name} · {p.evaluation.title}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const { assignmentId } = await params;

    // `getEvaluationResults` already enforces tenant/role authorization.
    const data = await getEvaluationResults(assignmentId);

    // Find the tenant for branding. Same tenant as the evaluation.
    const assignment = await db.evaluationAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        evaluation: {
          select: {
            tenant: {
              select: { name: true, logo: true, primaryColor: true },
            },
          },
        },
      },
    });
    if (!assignment) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 },
      );
    }

    const tenant = assignment.evaluation.tenant;
    const logoDataUrl = await loadUploadAsDataUrl(tenant.logo);
    const generatedAt = new Date().toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const stream = await renderToStream(
      <Report
        tenant={{
          name: tenant.name,
          logoDataUrl,
          primaryColor: tenant.primaryColor || "#6366f1",
        }}
        evaluation={data.evaluation}
        company={data.company}
        respondents={data.respondents}
        totalParticipants={data.totalParticipants}
        generatedAt={generatedAt}
        sections={data.sections}
      />,
    );

    const safeName = `${data.evaluation.title}-${data.company.name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="evaluacion-${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generating evaluation PDF:", err);
    const message =
      err instanceof Error ? err.message : "Error al generar el PDF";
    const status = message === "No autorizado" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
