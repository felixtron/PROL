import { CheckCircle2, Clock, MessageSquare, ListChecks } from "lucide-react";
import type { EvaluationQuestionType } from "@prol/db";

interface SectionData {
  id: string;
  title: string;
  questions: {
    id: string;
    code: string | null;
    label: string;
    type: EvaluationQuestionType;
    factorAnswers: { author: string; factors: string[] }[];
    factorCounts: {
      STRENGTH: number;
      WEAKNESS: number;
      OPPORTUNITY: number;
      THREAT: number;
    };
    textAnswers: { author: string; text: string }[];
    options: string[];
    selectedOptionAnswers: { author: string; indexes: number[] }[];
    selectedOptionCounts: number[];
    minSelections: number | null;
    maxSelections: number | null;
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

const FACTOR_META: Record<
  "STRENGTH" | "WEAKNESS" | "OPPORTUNITY" | "THREAT",
  { label: string; color: string; cls: string }
> = {
  STRENGTH: {
    label: "Fortaleza",
    color: "#10b981",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  WEAKNESS: {
    label: "Debilidad",
    color: "#ef4444",
    cls: "bg-red-50 text-red-700 border-red-200",
  },
  OPPORTUNITY: {
    label: "Oportunidad",
    color: "#3b82f6",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  THREAT: {
    label: "Amenaza",
    color: "#f59e0b",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

const FACTOR_ORDER: (keyof typeof FACTOR_META)[] = [
  "STRENGTH",
  "WEAKNESS",
  "OPPORTUNITY",
  "THREAT",
];

export function StakeholdersResultsView({ data }: { data: Data }) {
  return (
    <div className="space-y-6">
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
              Marcas por factor DAFO acumuladas por todas las respuestas.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {s.questions.map((q) => {
              const isOpenText = q.type === "OPEN_TEXT";
              const isMultiSelect = q.type === "MULTI_SELECT";
              const totalMarks = FACTOR_ORDER.reduce(
                (acc, f) => acc + q.factorCounts[f],
                0,
              );
              return (
                <li key={q.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        isOpenText
                          ? "bg-amber-100 text-amber-700"
                          : isMultiSelect
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-indigo-100 text-indigo-700"
                      }`}
                      aria-label={
                        isOpenText
                          ? "Texto abierto"
                          : isMultiSelect
                            ? "Selección múltiple"
                            : "Multi-factor"
                      }
                    >
                      {isMultiSelect ? (
                        <ListChecks className="h-3 w-3" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">
                        {q.code && (
                          <span className="mr-1 font-semibold text-text-secondary">
                            {q.code}.
                          </span>
                        )}
                        {q.label}
                      </p>
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
                      ) : isMultiSelect ? (
                        <MultiSelectResults q={q} />
                      ) : q.factorAnswers.length === 0 ? (
                        <p className="mt-0.5 text-[11px] text-text-tertiary">
                          Sin respuestas todavía
                        </p>
                      ) : (
                        <>
                          {/* Resumen acumulado por factor */}
                          {totalMarks > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {FACTOR_ORDER.map((f) => {
                                const n = q.factorCounts[f];
                                if (n === 0) return null;
                                const meta = FACTOR_META[f];
                                return (
                                  <span
                                    key={f}
                                    className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
                                  >
                                    <span
                                      className="inline-block h-2 w-2 rounded-sm"
                                      style={{ backgroundColor: meta.color }}
                                    />
                                    {meta.label}: {n}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {/* Respuesta de cada participante */}
                          <ul className="mt-2 space-y-1.5">
                            {q.factorAnswers.map((fa, i) => (
                              <li
                                key={i}
                                className="rounded-lg border border-border bg-surface-secondary px-3 py-2"
                              >
                                <p className="text-[11px] font-medium text-text-tertiary">
                                  {fa.author}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {fa.factors.map((f) => {
                                    const meta =
                                      FACTOR_META[
                                        f as keyof typeof FACTOR_META
                                      ];
                                    if (!meta) return null;
                                    return (
                                      <span
                                        key={f}
                                        className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
                                      >
                                        {meta.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <ParticipantsList data={data} />
    </div>
  );
}

function MultiSelectResults({
  q,
}: {
  q: SectionData["questions"][number];
}) {
  if (q.options.length === 0) {
    return (
      <p className="mt-0.5 text-[11px] text-text-tertiary">
        Esta pregunta no tiene opciones configuradas.
      </p>
    );
  }
  if (q.selectedOptionAnswers.length === 0) {
    return (
      <p className="mt-0.5 text-[11px] text-text-tertiary">
        Sin respuestas todavía
      </p>
    );
  }

  const totalRespondents = q.selectedOptionAnswers.length;
  const maxCount = Math.max(...q.selectedOptionCounts, 0);

  // Para mostrar quién marcó cada opción debajo de la barra.
  const authorsByOption: string[][] = q.options.map(() => []);
  for (const ans of q.selectedOptionAnswers) {
    for (const idx of ans.indexes) {
      if (idx >= 0 && idx < authorsByOption.length) {
        authorsByOption[idx]!.push(ans.author);
      }
    }
  }

  // Orden: opciones más votadas primero. Empate → orden original.
  const order = q.options
    .map((_, idx) => idx)
    .sort(
      (a, b) =>
        (q.selectedOptionCounts[b] ?? 0) - (q.selectedOptionCounts[a] ?? 0),
    );

  const limits =
    q.minSelections !== null && q.maxSelections !== null
      ? q.minSelections === q.maxSelections
        ? `Cada participante eligió exactamente ${q.minSelections}.`
        : `Cada participante eligió entre ${q.minSelections} y ${q.maxSelections} opciones.`
      : null;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[11px] text-text-tertiary">
        {totalRespondents}{" "}
        {totalRespondents === 1
          ? "respuesta registrada"
          : "respuestas registradas"}
        {limits ? ` · ${limits}` : ""}
      </p>
      <ul className="space-y-1.5">
        {order.map((idx) => {
          const label = q.options[idx]!;
          const count = q.selectedOptionCounts[idx] ?? 0;
          const pct =
            totalRespondents > 0
              ? Math.round((count / totalRespondents) * 100)
              : 0;
          const barPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const authors = authorsByOption[idx] ?? [];
          return (
            <li key={idx} className="rounded-lg border border-border bg-surface-secondary px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-primary">{label}</span>
                <span className="shrink-0 text-[11px] font-medium text-text-tertiary">
                  {count} / {totalRespondents} · {pct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${barPct}%` }}
                />
              </div>
              {authors.length > 0 && (
                <p className="mt-1 truncate text-[10px] text-text-tertiary">
                  {authors.join(" · ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ParticipantsList({ data }: { data: Data }) {
  return (
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
  );
}
