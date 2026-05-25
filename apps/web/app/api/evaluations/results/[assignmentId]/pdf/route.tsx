import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import { db, type EvaluationKind } from "@prol/db";
import { getEvaluationResults } from "@/lib/queries/evaluation";
import { resolveUploadDir } from "@/lib/upload-paths";

/**
 * Load an upload URL ("/uploads/...") from the local volume and return it as
 * a data URL — what @react-pdf/renderer's <Image> accepts reliably. Mirrors
 * the helper used by the certificate PDF endpoint.
 */
async function loadAsDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  if (!url.startsWith("/uploads/")) return null;
  const parts = url.replace(/^\/uploads\//, "").split("/");
  if (parts.length < 2) return null;
  const [subdir, ...rest] = parts;
  const filename = rest.join("/");
  if (!subdir || !filename || filename.includes("..")) return null;
  const dir = resolveUploadDir(subdir);
  const filePath = join(dir, filename);
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  const mime =
    ext === "png" ? "image/png"
    : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "webp" ? "image/webp"
    : ext === "gif" ? "image/gif"
    : null;
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

  sectionHeader: {
    marginTop: 18,
    paddingBottom: 4,
    borderBottom: "0.5pt solid #cbd5e1",
  },
  sectionTitle: { fontSize: 13, fontWeight: "bold" },
  sectionKind: { fontSize: 8, color: "#64748b", marginTop: 1 },

  question: {
    marginTop: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
    backgroundColor: "#f8fafc",
  },
  questionLabel: { fontSize: 10, lineHeight: 1.4 },
  questionCode: { fontWeight: "bold", color: "#475569" },
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

function verdictStyle(
  v:
    | "POSITIVE"
    | "PARTIAL"
    | "NEGATIVE"
    | "NOT_APPLICABLE"
    | "NO_RESPONSE",
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
  sections: Awaited<ReturnType<typeof getEvaluationResults>>["sections"];
}

function summaryCards(props: ReportProps) {
  const completionPct =
    props.totalParticipants > 0
      ? Math.round((props.respondents / props.totalParticipants) * 100)
      : 0;

  if (props.evaluation.kind === "DAFO") {
    const internals = props.sections.filter((s) => s.type === "INTERNAL");
    const externals = props.sections.filter((s) => s.type === "EXTERNAL");
    const sumInternals = internals.reduce(
      (a, s) => ({
        pos: a.pos + s.positives,
        neg: a.neg + s.negatives,
        considered:
          a.considered +
          s.questions.filter(
            (q) =>
              q.type === "MULTIPLE_CHOICE" &&
              q.verdict !== "NOT_APPLICABLE" &&
              q.verdict !== "NO_RESPONSE",
          ).length,
      }),
      { pos: 0, neg: 0, considered: 0 },
    );
    const sumExternals = externals.reduce(
      (a, s) => ({
        pos: a.pos + s.positives,
        neg: a.neg + s.negatives,
        considered:
          a.considered +
          s.questions.filter(
            (q) =>
              q.type === "MULTIPLE_CHOICE" &&
              q.verdict !== "NOT_APPLICABLE" &&
              q.verdict !== "NO_RESPONSE",
          ).length,
      }),
      { pos: 0, neg: 0, considered: 0 },
    );
    const pct = (n: number, d: number) =>
      d > 0 ? Math.round((n / d) * 100) : 0;
    return [
      {
        label: "Fortalezas",
        value: `${pct(sumInternals.pos, sumInternals.considered)}%`,
        foot: `${sumInternals.pos} ítems`,
        bg: "#ecfdf5",
        fg: "#065f46",
      },
      {
        label: "Debilidades",
        value: `${pct(sumInternals.neg, sumInternals.considered)}%`,
        foot: `${sumInternals.neg} ítems`,
        bg: "#fef2f2",
        fg: "#991b1b",
      },
      {
        label: "Oportunidades",
        value: `${pct(sumExternals.pos, sumExternals.considered)}%`,
        foot: `${sumExternals.pos} ítems`,
        bg: "#eff6ff",
        fg: "#1e40af",
      },
      {
        label: "Amenazas",
        value: `${pct(sumExternals.neg, sumExternals.considered)}%`,
        foot: `${sumExternals.neg} ítems`,
        bg: "#fffbeb",
        fg: "#92400e",
      },
    ];
  }

  if (props.evaluation.kind === "DIAGNOSTIC") {
    const totals = props.sections.reduce(
      (a, s) => ({
        pos: a.pos + s.positives,
        partial: a.partial + s.partials,
        neg: a.neg + s.negatives,
        considered:
          a.considered +
          s.questions.filter(
            (q) =>
              q.type === "MULTIPLE_CHOICE" &&
              q.verdict !== "NOT_APPLICABLE" &&
              q.verdict !== "NO_RESPONSE",
          ).length,
      }),
      { pos: 0, partial: 0, neg: 0, considered: 0 },
    );
    const pct = (n: number, d: number) =>
      d > 0 ? Math.round((n / d) * 100) : 0;
    return [
      {
        label: "Sí",
        value: `${pct(totals.pos, totals.considered)}%`,
        foot: `${totals.pos} ítems`,
        bg: "#ecfdf5",
        fg: "#065f46",
      },
      {
        label: "Parcial",
        value: `${pct(totals.partial, totals.considered)}%`,
        foot: `${totals.partial} ítems`,
        bg: "#fffbeb",
        fg: "#92400e",
      },
      {
        label: "No",
        value: `${pct(totals.neg, totals.considered)}%`,
        foot: `${totals.neg} ítems`,
        bg: "#fef2f2",
        fg: "#991b1b",
      },
      {
        label: "Respuesta",
        value: `${completionPct}%`,
        foot: `${props.respondents}/${props.totalParticipants}`,
        bg: "#eef2ff",
        fg: "#3730a3",
      },
    ];
  }

  // STAKEHOLDERS / GUIDELINES / ROLES — no aggregate verdicts; just stats.
  const totalQuestions = props.sections.reduce(
    (n, s) => n + s.questions.length,
    0,
  );
  const totalAnswers = props.sections.reduce(
    (n, s) =>
      n +
      s.questions.reduce(
        (m, q) =>
          m +
          q.textAnswers.length +
          (q.factorAnswers?.length ?? 0),
        0,
      ),
    0,
  );
  return [
    {
      label: "Participantes",
      value: `${props.respondents}/${props.totalParticipants}`,
      foot: `${completionPct}% respondieron`,
      bg: "#eef2ff",
      fg: "#3730a3",
    },
    {
      label: "Preguntas",
      value: `${totalQuestions}`,
      foot: `${props.sections.length} secciones`,
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
      value: KIND_LABEL[props.evaluation.kind],
      foot: "evaluación",
      bg: "#fffbeb",
      fg: "#92400e",
    },
  ];
}

const Report = (p: ReportProps) => {
  const cards = summaryCards(p);
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
              <Text style={styles.tenantMeta}>
                Reporte de evaluación
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTag}>
              {KIND_LABEL[p.evaluation.kind]}
            </Text>
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

        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          {cards.map((c, i) => (
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

        {/* Sections */}
        {p.sections.map((s) => (
          <View key={s.id} wrap>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <Text style={styles.sectionKind}>
                {s.type === "INTERNAL"
                  ? "Cuestiones internas (Fortalezas/Debilidades)"
                  : "Cuestiones externas (Oportunidades/Amenazas)"}
              </Text>
            </View>

            {s.questions.map((q) => {
              const isOpenText = q.type === "OPEN_TEXT";
              const isMultiFactor = q.type === "MULTI_FACTOR";
              const verdict = verdictStyle(q.verdict, s.type, p.evaluation.kind);
              const totalAnswers =
                q.counts.POSITIVE +
                q.counts.PARTIAL +
                q.counts.NEGATIVE +
                q.counts.NOT_APPLICABLE;

              return (
                <View key={q.id} style={styles.question} wrap={false}>
                  <Text style={styles.questionLabel}>
                    {q.code && (
                      <Text style={styles.questionCode}>{q.code}. </Text>
                    )}
                    {q.label}
                  </Text>

                  {!isOpenText && !isMultiFactor && (
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
                          {p.evaluation.kind === "DIAGNOSTIC"
                            ? `Sí: ${q.counts.POSITIVE} · Parcial: ${q.counts.PARTIAL} · No: ${q.counts.NEGATIVE} · N/A: ${q.counts.NOT_APPLICABLE}`
                            : `${q.counts.POSITIVE} pos · ${q.counts.NEGATIVE} neg · ${q.counts.NOT_APPLICABLE} N/A`}
                        </Text>
                      )}
                    </View>
                  )}

                  {isMultiFactor && (
                    <View style={styles.factorRow}>
                      {(["STRENGTH", "WEAKNESS", "OPPORTUNITY", "THREAT"] as const).map(
                        (f) => {
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
                        },
                      )}
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
                    <Text style={styles.emptyRow}>Sin respuestas todavía</Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}

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
    const logoDataUrl = await loadAsDataUrl(tenant.logo);
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
