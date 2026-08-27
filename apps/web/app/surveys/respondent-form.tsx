"use client";

import { useMemo, useState, useTransition } from "react";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import {
  submitSurveyResponseByShareLink,
  submitSurveyResponseByToken,
} from "@/lib/actions/survey";

export type RespondentQuestion = {
  id: string;
  type: "RATING_STARS" | "MULTIPLE_CHOICE";
  label: string;
  section: string | null;
  options: string[];
};

type Answers = Record<string, { rating?: number; option?: number }>;

/**
 * Formulario de respuesta.
 *
 * Dos modos: con `token` personal (el destinatario ya está identificado y no
 * se le pide nada más) o con enlace compartible, donde sí hay que
 * identificarse por correo. El servidor revalida todo — ventana, duplicados
 * y tipo de cada respuesta — así que este formulario sólo ayuda a llenar.
 */
export function RespondentForm({
  mode,
  token,
  questions,
}: {
  mode: "token" | "share";
  token: string;
  questions: RespondentQuestion[];
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const sections = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, RespondentQuestion[]>();
    for (const q of questions) {
      const key = q.section?.trim() || "";
      const bucket = map.get(key);
      if (bucket) bucket.push(q);
      else {
        map.set(key, [q]);
        order.push(key);
      }
    }
    return order.map((key) => ({ name: key, questions: map.get(key) ?? [] }));
  }, [questions]);

  function setRating(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: { rating: value } }));
  }
  function setOption(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: { option: value } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const missing = questions.find((q) => {
      const a = answers[q.id];
      return q.type === "RATING_STARS" ? a?.rating === undefined : a?.option === undefined;
    });
    if (missing) {
      setError("Responde todas las preguntas antes de enviar.");
      return;
    }

    const payload = questions.map((q) => ({
      questionId: q.id,
      ratingValue: answers[q.id]?.rating ?? null,
      selectedOptionIndex: answers[q.id]?.option ?? null,
    }));

    startTransition(async () => {
      try {
        if (mode === "share") {
          await submitSurveyResponseByShareLink({
            shareToken: token,
            email,
            name: name || null,
            answers: payload,
          });
        } else {
          await submitSurveyResponseByToken({ token, answers: payload });
        }
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo enviar la respuesta");
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-3 text-lg font-semibold text-emerald-900">
          ¡Gracias por responder!
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          Tu respuesta quedó registrada. Puedes cerrar esta página.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {mode === "share" && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">
              Tu correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm"
              placeholder="nombre@empresa.com"
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              Sirve para registrar una sola respuesta por persona.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">
              Tu nombre (opcional)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.name} className="space-y-4">
          {section.name && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {section.name}
            </h2>
          )}
          {section.questions.map((q) => (
            <fieldset
              key={q.id}
              className="rounded-2xl border border-neutral-200 bg-white p-6"
            >
              <legend className="mb-4 text-base font-medium text-neutral-900">
                {q.label}
              </legend>

              {q.type === "RATING_STARS" ? (
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((v) => {
                    const active = (answers[q.id]?.rating ?? 0) >= v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRating(q.id, v)}
                        aria-label={`${v} de 5`}
                        aria-pressed={answers[q.id]?.rating === v}
                        className="rounded-lg p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-8 w-8 ${
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
                  {q.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                        answers[q.id]?.option === idx
                          ? "border-neutral-900 bg-neutral-50"
                          : "border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id]?.option === idx}
                        onChange={() => setOption(q.id, idx)}
                        className="h-4 w-4"
                      />
                      <span className="text-neutral-900">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}
        </div>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 sm:w-auto"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Enviando..." : "Enviar respuesta"}
      </button>
    </form>
  );
}
