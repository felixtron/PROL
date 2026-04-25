"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { submitEvaluationAnswers } from "@/lib/actions/evaluation";
import type {
  EvaluationSectionType,
  EvaluationAnswerValue,
} from "@prol/db";

type Question = {
  id: string;
  code: string | null;
  label: string;
  description: string | null;
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

const VALUES: EvaluationAnswerValue[] = [
  "POSITIVE",
  "NEGATIVE",
  "NOT_APPLICABLE",
];

export function EvaluationResponseForm({
  participantId,
  sections,
  initialValues,
  hasPrevious,
}: {
  participantId: string;
  sections: Section[];
  initialValues: Record<string, string>;
  hasPrevious: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, EvaluationAnswerValue>>(
    () => {
      const out: Record<string, EvaluationAnswerValue> = {};
      for (const [k, v] of Object.entries(initialValues)) {
        if (v === "POSITIVE" || v === "NEGATIVE" || v === "NOT_APPLICABLE") {
          out[k] = v;
        }
      }
      return out;
    },
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const allQuestions = sections.flatMap((s) => s.questions.map((q) => q.id));
  const answeredCount = allQuestions.filter((id) => answers[id]).length;
  const totalCount = allQuestions.length;
  const allAnswered = answeredCount === totalCount;

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
        const payload = Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value,
        }));
        const res = await submitEvaluationAnswers(participantId, payload);
        setSuccess(`Respuesta enviada (versión v${res.version})`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar");
      }
    });
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
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {VALUES.map((v) => {
                    const label =
                      v === "POSITIVE"
                        ? POSITIVE_LABEL[section.type]
                        : v === "NEGATIVE"
                          ? NEGATIVE_LABEL[section.type]
                          : "No aplica";
                    const checked = answers[q.id] === v;
                    return (
                      <label
                        key={v}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          checked
                            ? v === "POSITIVE"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : v === "NEGATIVE"
                                ? "border-red-500 bg-red-50 text-red-700"
                                : "border-text-tertiary bg-surface-secondary text-text-secondary"
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
                        {label}
                      </label>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </form>
  );
}
