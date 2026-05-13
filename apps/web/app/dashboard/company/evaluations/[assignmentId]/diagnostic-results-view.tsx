import {
  Check,
  X,
  Minus,
  CheckCircle2,
  Clock,
  MessageSquare,
  CircleDot,
} from "lucide-react";
import type { EvaluationSectionType, EvaluationQuestionType } from "@prol/db";

interface SectionData {
  id: string;
  title: string;
  type: EvaluationSectionType;
  positives: number;
  partials: number;
  negatives: number;
  positivePct: number;
  partialPct: number;
  negativePct: number;
  questions: {
    id: string;
    code: string | null;
    label: string;
    type: EvaluationQuestionType;
    counts: {
      POSITIVE: number;
      PARTIAL: number;
      NEGATIVE: number;
      NOT_APPLICABLE: number;
    };
    verdict:
      | "POSITIVE"
      | "PARTIAL"
      | "NEGATIVE"
      | "NOT_APPLICABLE"
      | "NO_RESPONSE";
    textAnswers: { author: string; text: string }[];
  }[];
}

interface Data {
  sections: SectionData[];
  participants: {
    id: string;
    user: { id: string; name: string | null; email: string; avatar: string | null };
    respondedAt: Date | null;
    version: number | null;
  }[];
  totalParticipants: number;
  respondents: number;
}

const COLOR = {
  positive: "#10b981", // emerald-500
  partial: "#f59e0b", // amber-500
  negative: "#ef4444", // red-500
};

/**
 * Cumplimiento ponderado de una pregunta:
 *   Sí = 1, Parcial = 0.5, No = 0. N/A y sin respuesta se excluyen.
 * Devuelve null si no hay respuestas computables.
 */
function complianceOf(counts: SectionData["questions"][number]["counts"]): number | null {
  const denom = counts.POSITIVE + counts.PARTIAL + counts.NEGATIVE;
  if (denom === 0) return null;
  return ((counts.POSITIVE * 1 + counts.PARTIAL * 0.5) / denom) * 100;
}

function gapOf(counts: SectionData["questions"][number]["counts"]): number | null {
  const c = complianceOf(counts);
  return c === null ? null : 100 - c;
}

export function DiagnosticResultsView({ data }: { data: Data }) {
  // Aggregate cumplimiento across all multiple-choice questions.
  let totalCompliance = 0;
  let answeredQuestions = 0;
  let totalPos = 0;
  let totalPartial = 0;
  let totalNeg = 0;
  for (const s of data.sections) {
    for (const q of s.questions) {
      if (q.type !== "MULTIPLE_CHOICE") continue;
      const c = complianceOf(q.counts);
      if (c === null) continue;
      totalCompliance += c;
      answeredQuestions += 1;
      totalPos += q.counts.POSITIVE;
      totalPartial += q.counts.PARTIAL;
      totalNeg += q.counts.NEGATIVE;
    }
  }
  const overallCompliance =
    answeredQuestions > 0
      ? Math.round((totalCompliance / answeredQuestions) * 10) / 10
      : 0;
  const overallGap = Math.round((100 - overallCompliance) * 10) / 10;
  const totalResponses = totalPos + totalPartial + totalNeg;

  return (
    <div className="space-y-6">
      {/* GAP summary card */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Cumplimiento global
            </p>
            <p className="mt-2 font-heading text-5xl font-bold text-emerald-700">
              {overallCompliance}%
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              GAP de {overallGap}% sobre {answeredQuestions} pregunta
              {answeredQuestions !== 1 ? "s" : ""} con respuestas
            </p>
            <p className="mt-3 text-[11px] text-text-tertiary">
              Cumplimiento = (Sí × 1 + Parcial × 0.5) / total ·{" "}
              <span className="font-medium">GAP = 100 − cumplimiento</span>
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Distribución de respuestas
            </p>
            <StackedBar
              positive={totalPos}
              partial={totalPartial}
              negative={totalNeg}
            />
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <Legend
                color={COLOR.positive}
                label="Sí"
                count={totalPos}
                total={totalResponses}
              />
              <Legend
                color={COLOR.partial}
                label="Parcial"
                count={totalPartial}
                total={totalResponses}
              />
              <Legend
                color={COLOR.negative}
                label="No"
                count={totalNeg}
                total={totalResponses}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Per-section detail with per-question GAP bars */}
      {data.sections.map((s) => {
        // Section-level compliance: average of question-level compliance.
        const choices = s.questions.filter((q) => q.type === "MULTIPLE_CHOICE");
        const compliances = choices
          .map((q) => complianceOf(q.counts))
          .filter((c): c is number => c !== null);
        const sectionCompliance =
          compliances.length > 0
            ? Math.round(
                (compliances.reduce((a, b) => a + b, 0) / compliances.length) *
                  10,
              ) / 10
            : null;
        return (
          <section
            key={s.id}
            className="rounded-xl border border-border bg-surface"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3">
              <h2 className="font-heading text-base font-semibold text-text-primary">
                {s.title}
              </h2>
              {sectionCompliance !== null && (
                <p className="text-xs text-text-tertiary">
                  Cumplimiento{" "}
                  <span className="font-semibold text-text-primary">
                    {sectionCompliance}%
                  </span>{" "}
                  · GAP{" "}
                  <span className="font-semibold text-text-primary">
                    {Math.round((100 - sectionCompliance) * 10) / 10}%
                  </span>
                </p>
              )}
            </div>
            <ul className="divide-y divide-border">
              {s.questions.map((q) => {
                const isOpenText = q.type === "OPEN_TEXT";
                const compliance = isOpenText ? null : complianceOf(q.counts);
                return (
                  <li key={q.id} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      {isOpenText ? (
                        <span
                          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                          aria-label="Texto abierto"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </span>
                      ) : (
                        <VerdictIcon verdict={q.verdict} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm text-text-primary">
                            {q.code && (
                              <span className="mr-1 font-semibold text-text-secondary">
                                {q.code}.
                              </span>
                            )}
                            {q.label}
                          </p>
                          {compliance !== null && (
                            <p className="shrink-0 text-[11px] font-semibold text-text-secondary">
                              {Math.round(compliance * 10) / 10}%
                            </p>
                          )}
                        </div>
                        {isOpenText ? (
                          q.textAnswers.length === 0 ? (
                            <p className="mt-0.5 text-[11px] text-text-tertiary">
                              Sin respuestas todavía
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-2">
                              {q.textAnswers.map((t, i) => (
                                <li
                                  key={i}
                                  className="rounded-lg border border-border bg-surface-secondary px-3 py-2"
                                >
                                  <p className="text-[11px] font-medium text-text-tertiary">
                                    {t.author}
                                  </p>
                                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-text-secondary">
                                    {t.text}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )
                        ) : compliance !== null ? (
                          <>
                            <div className="mt-2">
                              <StackedBar
                                positive={q.counts.POSITIVE}
                                partial={q.counts.PARTIAL}
                                negative={q.counts.NEGATIVE}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-text-tertiary">
                              {q.counts.POSITIVE} Sí · {q.counts.PARTIAL} Parcial
                              · {q.counts.NEGATIVE} No
                              {q.counts.NOT_APPLICABLE > 0
                                ? ` · ${q.counts.NOT_APPLICABLE} N/A`
                                : ""}
                            </p>
                          </>
                        ) : (
                          <p className="mt-0.5 text-[11px] text-text-tertiary">
                            Sin respuestas todavía
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* Participants */}
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Participantes ({data.respondents}/{data.totalParticipants})
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {data.participants.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3">
              {p.user.avatar ? (
                <img
                  src={p.user.avatar}
                  alt={p.user.name ?? p.user.email}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                  {(p.user.name ?? p.user.email).slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {p.user.name ?? p.user.email}
                </p>
                <p className="truncate text-xs text-text-tertiary">
                  {p.user.email}
                </p>
              </div>
              {p.version ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  v{p.version}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-pill bg-surface-tertiary px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                  <Clock className="h-3 w-3" />
                  Pendiente
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StackedBar({
  positive,
  partial,
  negative,
}: {
  positive: number;
  partial: number;
  negative: number;
}) {
  const total = positive + partial + negative;
  if (total === 0) {
    return (
      <div className="h-3 w-full overflow-hidden rounded-full bg-surface-tertiary" />
    );
  }
  const p = (positive / total) * 100;
  const pa = (partial / total) * 100;
  const n = (negative / total) * 100;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-tertiary">
      {p > 0 && (
        <div
          className="h-full"
          style={{ width: `${p}%`, backgroundColor: COLOR.positive }}
          title={`Sí: ${positive}`}
        />
      )}
      {pa > 0 && (
        <div
          className="h-full"
          style={{ width: `${pa}%`, backgroundColor: COLOR.partial }}
          title={`Parcial: ${partial}`}
        />
      )}
      {n > 0 && (
        <div
          className="h-full"
          style={{ width: `${n}%`, backgroundColor: COLOR.negative }}
          title={`No: ${negative}`}
        />
      )}
    </div>
  );
}

function Legend({
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
  const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-text-secondary">
        {label}:{" "}
        <span className="font-semibold text-text-primary">{count}</span>{" "}
        <span className="text-text-tertiary">({pct}%)</span>
      </span>
    </div>
  );
}

function VerdictIcon({
  verdict,
}: {
  verdict:
    | "POSITIVE"
    | "PARTIAL"
    | "NEGATIVE"
    | "NOT_APPLICABLE"
    | "NO_RESPONSE";
}) {
  if (verdict === "POSITIVE") {
    return (
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
        aria-label="Sí"
      >
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (verdict === "PARTIAL") {
    return (
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
        aria-label="Parcialmente"
      >
        <CircleDot className="h-3 w-3" />
      </span>
    );
  }
  if (verdict === "NEGATIVE") {
    return (
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"
        aria-label="No"
      >
        <X className="h-3 w-3" />
      </span>
    );
  }
  if (verdict === "NOT_APPLICABLE") {
    return (
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-text-tertiary"
        aria-label="No aplica"
      >
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-text-tertiary"
      aria-label="Sin respuestas"
    >
      <Clock className="h-3 w-3" />
    </span>
  );
}
