import { Check, X, Minus, CheckCircle2, Clock } from "lucide-react";
import type { EvaluationSectionType } from "@prol/db";

interface SectionData {
  id: string;
  title: string;
  type: EvaluationSectionType;
  positives: number;
  negatives: number;
  positivePct: number;
  negativePct: number;
  questions: {
    id: string;
    code: string | null;
    label: string;
    counts: { POSITIVE: number; NEGATIVE: number; NOT_APPLICABLE: number };
    verdict: "POSITIVE" | "NEGATIVE" | "NOT_APPLICABLE" | "NO_RESPONSE";
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

const POSITIVE_LABEL: Record<EvaluationSectionType, string> = {
  INTERNAL: "Fortalezas",
  EXTERNAL: "Oportunidades",
};
const NEGATIVE_LABEL: Record<EvaluationSectionType, string> = {
  INTERNAL: "Debilidades",
  EXTERNAL: "Amenazas",
};

export function EvaluationResultsView({ data }: { data: Data }) {
  const internalSections = data.sections.filter((s) => s.type === "INTERNAL");
  const externalSections = data.sections.filter((s) => s.type === "EXTERNAL");

  // Per-side aggregate (for the big % header per quadrant).
  function aggregate(sections: SectionData[]) {
    let totalQ = 0;
    let pos = 0;
    let neg = 0;
    for (const s of sections) {
      const considered = s.questions.filter(
        (q) => q.verdict !== "NOT_APPLICABLE",
      );
      totalQ += considered.length;
      pos += s.positives;
      neg += s.negatives;
    }
    return {
      pos,
      neg,
      posPct: totalQ > 0 ? Math.round((pos / totalQ) * 1000) / 10 : 0,
      negPct: totalQ > 0 ? Math.round((neg / totalQ) * 1000) / 10 : 0,
    };
  }

  const internalAgg = aggregate(internalSections);
  const externalAgg = aggregate(externalSections);

  return (
    <div className="space-y-6">
      {/* Quadrants header */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Quadrant
          title="Cuestiones Internas"
          positiveLabel="Fortalezas"
          negativeLabel="Debilidades"
          posPct={internalAgg.posPct}
          negPct={internalAgg.negPct}
          posCount={internalAgg.pos}
          negCount={internalAgg.neg}
          empty={internalSections.length === 0}
        />
        <Quadrant
          title="Cuestiones Externas"
          positiveLabel="Oportunidades"
          negativeLabel="Amenazas"
          posPct={externalAgg.posPct}
          negPct={externalAgg.negPct}
          posCount={externalAgg.pos}
          negCount={externalAgg.neg}
          empty={externalSections.length === 0}
        />
      </div>

      {/* Per-section detail */}
      {data.sections.map((s) => (
        <section
          key={s.id}
          className="rounded-xl border border-border bg-surface"
        >
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-heading text-base font-semibold text-text-primary">
              {s.title}
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {POSITIVE_LABEL[s.type]}: {s.positives} ({s.positivePct}%) ·{" "}
              {NEGATIVE_LABEL[s.type]}: {s.negatives} ({s.negativePct}%)
            </p>
          </div>
          <ul className="divide-y divide-border">
            {s.questions.map((q) => {
              const total =
                q.counts.POSITIVE + q.counts.NEGATIVE + q.counts.NOT_APPLICABLE;
              return (
                <li
                  key={q.id}
                  className="flex items-start gap-3 px-5 py-3"
                >
                  <VerdictIcon verdict={q.verdict} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary">
                      {q.code && (
                        <span className="mr-1 font-semibold text-text-secondary">
                          {q.code}.
                        </span>
                      )}
                      {q.label}
                    </p>
                    {total > 0 ? (
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        {q.counts.POSITIVE} {POSITIVE_LABEL[s.type].slice(0, -1)} ·{" "}
                        {q.counts.NEGATIVE} {NEGATIVE_LABEL[s.type].slice(0, -1)} ·{" "}
                        {q.counts.NOT_APPLICABLE} N/A
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        Sin respuestas todavía
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* Participants */}
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Participantes ({data.respondents}/{data.totalParticipants})
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {data.participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-5 py-3"
            >
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

function Quadrant({
  title,
  positiveLabel,
  negativeLabel,
  posPct,
  negPct,
  posCount,
  negCount,
  empty,
}: {
  title: string;
  positiveLabel: string;
  negativeLabel: string;
  posPct: number;
  negPct: number;
  posCount: number;
  negCount: number;
  empty: boolean;
}) {
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-text-tertiary">
        Sin secciones de tipo {title.toLowerCase()}.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        {title}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">
          <p className="text-xs font-medium">{positiveLabel}</p>
          <p className="mt-0.5 font-heading text-3xl font-bold">{posPct}%</p>
          <p className="mt-0.5 text-[11px] text-emerald-700">
            {posCount} ítem{posCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-3 text-red-800">
          <p className="text-xs font-medium">{negativeLabel}</p>
          <p className="mt-0.5 font-heading text-3xl font-bold">{negPct}%</p>
          <p className="mt-0.5 text-[11px] text-red-700">
            {negCount} ítem{negCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function VerdictIcon({
  verdict,
}: {
  verdict: "POSITIVE" | "NEGATIVE" | "NOT_APPLICABLE" | "NO_RESPONSE";
}) {
  if (verdict === "POSITIVE") {
    return (
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
        aria-label="Positivo"
      >
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (verdict === "NEGATIVE") {
    return (
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"
        aria-label="Negativo"
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
