"use client";

import { useState, useTransition } from "react";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { submitSurveyResponse } from "@/lib/actions/survey";

type QuestionType = "RATING_STARS" | "MULTIPLE_CHOICE";

interface PublicQuestion {
  id: string;
  type: QuestionType;
  label: string;
  options: string[];
}

interface PublicCompany {
  id: string;
  name: string;
}

const OTHER_COMPANY = "__other__";

export function RespondentForm({
  publicSlug,
  questions,
  companies,
}: {
  publicSlug: string;
  questions: PublicQuestion[];
  companies: PublicCompany[];
}) {
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState<string>(
    companies[0]?.id ?? OTHER_COMPANY,
  );
  const [otherCompanyName, setOtherCompanyName] = useState("");
  const [answers, setAnswers] = useState<
    Record<string, { rating?: number; option?: number }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    for (const q of questions) {
      const a = answers[q.id];
      if (!a) {
        setError("Responde todas las preguntas para continuar");
        return;
      }
      if (q.type === "RATING_STARS" && !a.rating) {
        setError("Responde todas las preguntas para continuar");
        return;
      }
      if (q.type === "MULTIPLE_CHOICE" && a.option === undefined) {
        setError("Responde todas las preguntas para continuar");
        return;
      }
    }

    const payload = {
      publicSlug,
      email,
      respondentCompanyId: companyId !== OTHER_COMPANY ? companyId : null,
      respondentCompanyName:
        companyId === OTHER_COMPANY ? otherCompanyName : null,
      answers: questions.map((q) => {
        const a = answers[q.id]!;
        return {
          questionId: q.id,
          ratingValue: q.type === "RATING_STARS" ? a.rating ?? null : null,
          selectedOptionIndex:
            q.type === "MULTIPLE_CHOICE" ? a.option ?? null : null,
        };
      }),
    };

    startTransition(async () => {
      try {
        await submitSurveyResponse(payload);
        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar");
      }
    });
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-emerald-900">
          ¡Gracias por responder!
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          Tu respuesta fue registrada. Ya puedes cerrar esta ventana.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-neutral-900">
          Tus datos
        </legend>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">
            Correo electrónico
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">
            Empresa
          </span>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={OTHER_COMPANY}>Otra…</option>
          </select>
        </label>

        {companyId === OTHER_COMPANY ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              Nombre de tu empresa
            </span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={otherCompanyName}
              onChange={(e) => setOtherCompanyName(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            />
          </label>
        ) : null}
      </fieldset>

      <div className="border-t border-neutral-200" />

      <fieldset className="space-y-6">
        <legend className="text-sm font-semibold text-neutral-900">
          Preguntas
        </legend>

        {questions.map((q, idx) => (
          <div key={q.id}>
            <p className="mb-3 text-sm font-medium text-neutral-900">
              {idx + 1}. {q.label}
            </p>

            {q.type === "RATING_STARS" ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = (answers[q.id]?.rating ?? 0) >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: { rating: value },
                        }))
                      }
                      aria-label={`${value} estrellas`}
                      className="rounded-md p-1 transition hover:scale-110"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          active
                            ? "fill-amber-400 stroke-amber-500"
                            : "fill-transparent stroke-neutral-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const checked = answers[q.id]?.option === optIdx;
                  return (
                    <label
                      key={optIdx}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                        checked
                          ? "border-neutral-900 bg-neutral-900/5"
                          : "border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={optIdx}
                        checked={checked}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: { option: optIdx },
                          }))
                        }
                        className="h-4 w-4 accent-neutral-900"
                      />
                      <span className="text-neutral-800">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </fieldset>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando…
          </>
        ) : (
          "Enviar respuestas"
        )}
      </button>
    </form>
  );
}
