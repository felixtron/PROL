"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { submitEvaluationAnswers } from "@/lib/actions/evaluation";
import type {
  EvaluationSectionType,
  EvaluationAnswerValue,
  EvaluationQuestionType,
  EvaluationKind,
  EvaluationFactor,
} from "@prol/db";

type Question = {
  id: string;
  code: string | null;
  label: string;
  description: string | null;
  type: EvaluationQuestionType;
  /** MULTI_SELECT only: the option strings the respondent picks from. */
  options: string[];
  minSelections: number | null;
  maxSelections: number | null;
};

type Section = {
  id: string;
  title: string;
  type: EvaluationSectionType;
  questions: Question[];
};

const POSITIVE_LABEL: Record<EvaluationSectionType, string> = {
  INTERNAL: "Fortaleza",
  EXTERNAL: "Oportunidad",
};
const NEGATIVE_LABEL: Record<EvaluationSectionType, string> = {
  INTERNAL: "Debilidad",
  EXTERNAL: "Amenaza",
};

const DAFO_VALUES: EvaluationAnswerValue[] = [
  "POSITIVE",
  "NEGATIVE",
  "NOT_APPLICABLE",
];
const DIAGNOSTIC_VALUES: EvaluationAnswerValue[] = [
  "POSITIVE",
  "PARTIAL",
  "NEGATIVE",
];

const DIAGNOSTIC_LABEL: Record<EvaluationAnswerValue, string> = {
  POSITIVE: "Sí",
  PARTIAL: "Parcialmente",
  NEGATIVE: "No",
  NOT_APPLICABLE: "No aplica",
};

const FACTOR_OPTIONS: {
  value: EvaluationFactor;
  label: string;
  palette: string;
}[] = [
  {
    value: "STRENGTH",
    label: "Fortaleza",
    palette: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    value: "WEAKNESS",
    label: "Debilidad",
    palette: "border-red-500 bg-red-50 text-red-700",
  },
  {
    value: "OPPORTUNITY",
    label: "Oportunidad",
    palette: "border-blue-500 bg-blue-50 text-blue-700",
  },
  {
    value: "THREAT",
    label: "Amenaza",
    palette: "border-amber-500 bg-amber-50 text-amber-700",
  },
];

export function EvaluationResponseForm({
  participantId,
  kind,
  sections,
  initialValues,
  initialTexts,
  initialFactors,
  initialSelectedIndexes,
  hasPrevious,
}: {
  participantId: string;
  kind: EvaluationKind;
  sections: Section[];
  initialValues: Record<string, string>;
  initialTexts: Record<string, string>;
  initialFactors: Record<string, EvaluationFactor[]>;
  initialSelectedIndexes: Record<string, number[]>;
  hasPrevious: boolean;
}) {
  const router = useRouter();
  const validValues = kind === "DIAGNOSTIC" ? DIAGNOSTIC_VALUES : DAFO_VALUES;
  const [answers, setAnswers] = useState<Record<string, EvaluationAnswerValue>>(
    () => {
      const out: Record<string, EvaluationAnswerValue> = {};
      for (const [k, v] of Object.entries(initialValues)) {
        if (validValues.includes(v as EvaluationAnswerValue)) {
          out[k] = v as EvaluationAnswerValue;
        }
      }
      return out;
    },
  );
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>(
    () => ({ ...initialTexts }),
  );
  const [factorAnswers, setFactorAnswers] = useState<
    Record<string, EvaluationFactor[]>
  >(() => ({ ...initialFactors }));
  const [selectedIndexes, setSelectedIndexes] = useState<
    Record<string, number[]>
  >(() => ({ ...initialSelectedIndexes }));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const allQuestions = sections.flatMap((s) => s.questions);
  const totalCount = allQuestions.length;
  const answeredCount = allQuestions.filter((q) => {
    if (q.type === "OPEN_TEXT") {
      return (textAnswers[q.id]?.trim().length ?? 0) > 0;
    }
    if (q.type === "MULTI_FACTOR") {
      return (factorAnswers[q.id]?.length ?? 0) > 0;
    }
    if (q.type === "MULTI_SELECT") {
      const picked = selectedIndexes[q.id] ?? [];
      const min = q.minSelections ?? 1;
      const max = q.maxSelections ?? q.options.length;
      return picked.length >= min && picked.length <= max;
    }
    return !!answers[q.id];
  }).length;
  const allAnswered = answeredCount === totalCount;

  function toggleFactor(qId: string, f: EvaluationFactor) {
    setFactorAnswers((prev) => {
      const curr = prev[qId] ?? [];
      const next = curr.includes(f)
        ? curr.filter((x) => x !== f)
        : [...curr, f];
      return { ...prev, [qId]: next };
    });
  }

  function toggleSelection(qId: string, idx: number, max: number | null) {
    setSelectedIndexes((prev) => {
      const curr = prev[qId] ?? [];
      if (curr.includes(idx)) {
        return { ...prev, [qId]: curr.filter((x) => x !== idx) };
      }
      // Respect max: if already at the cap, don't add more.
      if (max != null && curr.length >= max) return prev;
      return { ...prev, [qId]: [...curr, idx] };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(null);
    if (!allAnswered) {
      setError(
        `Faltan ${totalCount - answeredCount} pregunta(s) por contestar`,
      );
      return;
    }
    startTransition(async () => {
      try {
        const payload = allQuestions.map((q) => {
          if (q.type === "OPEN_TEXT")
            return { questionId: q.id, text: textAnswers[q.id] ?? "" };
          if (q.type === "MULTI_FACTOR")
            return { questionId: q.id, factors: factorAnswers[q.id] ?? [] };
          if (q.type === "MULTI_SELECT")
            return {
              questionId: q.id,
              selectedOptionIndexes: selectedIndexes[q.id] ?? [],
            };
          return { questionId: q.id, value: answers[q.id] };
        });
        const res = await submitEvaluationAnswers(participantId, payload);
        setSuccess(`Respuesta enviada (versión v${res.version})`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar");
      }
    });
  }

  function labelFor(v: EvaluationAnswerValue, sectionType: EvaluationSectionType): string {
    if (kind === "DIAGNOSTIC") return DIAGNOSTIC_LABEL[v];
    if (v === "POSITIVE") return POSITIVE_LABEL[sectionType];
    if (v === "NEGATIVE") return NEGATIVE_LABEL[sectionType];
    return "No aplica";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status header */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-surface/95 px-4 py-2 backdrop-blur md:mx-0 md:rounded-lg md:border md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs">
            <p className="font-medium text-text-primary">
              {answeredCount}/{totalCount} respondidas
            </p>
            <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-surface-tertiary">
              <div
                className={`h-full rounded-full transition-all ${
                  allAnswered ? "bg-emerald-500" : "bg-primary-500"
                }`}
                style={{
                  width: `${totalCount === 0 ? 0 : (answeredCount / totalCount) * 100}%`,
                }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pending || !allAnswered}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {hasPrevious ? "Guardar nueva versión" : "Enviar respuestas"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-700">{error}</p>
        )}
        {success && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            {success}
          </p>
        )}
      </div>

      {sections.map((section) => (
        <section
          key={section.id}
          className="rounded-xl border border-border bg-surface"
        >
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-heading text-base font-semibold text-text-primary">
              {section.title}
            </h2>
            {kind === "DAFO" && (
              <p className="mt-0.5 text-xs text-text-tertiary">
                Cada respuesta positiva cuenta como{" "}
                <span className="font-medium text-emerald-700">
                  {POSITIVE_LABEL[section.type]}
                </span>
                ; negativa como{" "}
                <span className="font-medium text-red-700">
                  {NEGATIVE_LABEL[section.type]}
                </span>
                .
              </p>
            )}
            {kind === "DIAGNOSTIC" && (
              <p className="mt-0.5 text-xs text-text-tertiary">
                Responde <span className="font-medium text-emerald-700">Sí</span>,{" "}
                <span className="font-medium text-amber-700">Parcialmente</span> o{" "}
                <span className="font-medium text-red-700">No</span> a cada pregunta.
              </p>
            )}
            {kind === "STAKEHOLDERS" && (
              <p className="mt-0.5 text-xs text-text-tertiary">
                Marca todos los factores DAFO que apliquen a cada parte interesada.
              </p>
            )}
          </div>
          <ul className="divide-y divide-border">
            {section.questions.map((q) => (
              <li key={q.id} className="px-5 py-4">
                <p className="text-sm text-text-primary">
                  {q.code && (
                    <span className="mr-1 font-semibold text-text-secondary">
                      {q.code}.
                    </span>
                  )}
                  {q.label}
                </p>
                {q.description && (
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {q.description}
                  </p>
                )}
                {q.type === "OPEN_TEXT" ? (
                  <textarea
                    value={textAnswers[q.id] ?? ""}
                    onChange={(e) =>
                      setTextAnswers((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Tu respuesta..."
                    className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                ) : q.type === "MULTI_SELECT" ? (
                  (() => {
                    const picked = selectedIndexes[q.id] ?? [];
                    const min = q.minSelections;
                    const max = q.maxSelections;
                    const helper =
                      min != null && max != null && min === max
                        ? `Selecciona exactamente ${min} opción${min === 1 ? "" : "es"} · ${picked.length}/${min}`
                        : min != null && max != null
                          ? `Selecciona entre ${min} y ${max} opciones · ${picked.length}/${max}`
                          : min != null
                            ? `Mínimo ${min} opción${min === 1 ? "" : "es"} · ${picked.length}`
                            : max != null
                              ? `Máximo ${max} opciones · ${picked.length}/${max}`
                              : `Selecciona al menos una · ${picked.length}`;
                    return (
                      <div className="mt-2 space-y-2">
                        <p className="text-[11px] font-medium text-text-tertiary">
                          {helper}
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {q.options.map((opt, idx) => {
                            const checked = picked.includes(idx);
                            const atCap =
                              !checked &&
                              max != null &&
                              picked.length >= max;
                            return (
                              <label
                                key={idx}
                                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                  checked
                                    ? "border-primary-500 bg-primary-50 text-primary-900"
                                    : atCap
                                      ? "cursor-not-allowed border-border bg-surface text-text-tertiary opacity-60"
                                      : "border-border bg-surface text-text-secondary hover:border-primary-200"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={atCap}
                                  onChange={() =>
                                    toggleSelection(q.id, idx, max)
                                  }
                                  className="sr-only"
                                />
                                <span
                                  className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                    checked
                                      ? "border-primary-600 bg-primary-600 text-white"
                                      : "border-border"
                                  }`}
                                >
                                  {checked && (
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                  )}
                                </span>
                                <span className="flex-1">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                ) : q.type === "MULTI_FACTOR" ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {FACTOR_OPTIONS.map((opt) => {
                      const checked = (factorAnswers[q.id] ?? []).includes(
                        opt.value,
                      );
                      return (
                        <label
                          key={opt.value}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            checked
                              ? opt.palette
                              : "border-border bg-surface text-text-secondary hover:border-primary-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFactor(q.id, opt.value)}
                            className="sr-only"
                          />
                          <span
                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px] ${
                              checked
                                ? "border-current bg-current text-white"
                                : "border-border"
                            }`}
                          >
                            {checked && (
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            )}
                          </span>
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`mt-2 grid grid-cols-1 gap-2 ${
                      validValues.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"
                    }`}
                  >
                    {validValues.map((v) => {
                      const checked = answers[q.id] === v;
                      const palette =
                        v === "POSITIVE"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : v === "PARTIAL"
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : v === "NEGATIVE"
                              ? "border-red-500 bg-red-50 text-red-700"
                              : "border-text-tertiary bg-surface-secondary text-text-secondary";
                      return (
                        <label
                          key={v}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            checked
                              ? palette
                              : "border-border bg-surface text-text-secondary hover:border-primary-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={v}
                            checked={checked}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [q.id]: v }))
                            }
                            className="sr-only"
                          />
                          {labelFor(v, section.type)}
                        </label>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </form>
  );
}
