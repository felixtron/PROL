import { Star } from "lucide-react";
import { scaleOptionScore } from "@/lib/surveys";
import type { AggregatedResults, QuestionStats } from "@/lib/surveys";

/**
 * Render del consolidado de una encuesta. Lo comparten el panel del
 * administrador, la vista del líder y el enlace público de resultados, para
 * que las tres cuenten exactamente lo mismo.
 *
 * Sólo pinta agregados: promedios, distribuciones e índices. Nunca recibe ni
 * muestra respuestas individuales.
 */

function scoreTone(score: number | null): string {
  if (score === null) return "text-text-tertiary";
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-red-700";
}

function scoreBar(score: number | null): string {
  if (score === null) return "bg-surface-tertiary";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function SatisfactionIndex({
  score,
  totalResponses,
  responseRate,
  recipientCount,
}: {
  score: number | null;
  totalResponses: number;
  responseRate?: number;
  recipientCount?: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
          Índice de satisfacción
        </p>
        <p className={`mt-1 font-heading text-3xl font-bold ${scoreTone(score)}`}>
          {score !== null ? `${score.toFixed(1)}` : "—"}
          {score !== null && (
            <span className="ml-1 text-base font-medium text-text-tertiary">/100</span>
          )}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-tertiary">
          <div
            className={`h-full rounded-full ${scoreBar(score)}`}
            style={{ width: `${score ?? 0}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
          Respuestas
        </p>
        <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
          {totalResponses}
        </p>
        {recipientCount !== undefined && (
          <p className="mt-3 text-sm text-text-tertiary">
            de {recipientCount} destinatario{recipientCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
          Tasa de respuesta
        </p>
        <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
          {responseRate !== undefined ? `${Math.round(responseRate * 100)}%` : "—"}
        </p>
        {responseRate !== undefined && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className="h-full rounded-full bg-primary-600"
              style={{ width: `${Math.min(100, Math.round(responseRate * 100))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionBreakdown({
  sections,
}: {
  sections: AggregatedResults["sections"];
}) {
  // Con una sola sección el desglose no aporta nada sobre el índice general.
  if (sections.length <= 1) return null;
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="font-heading text-base font-semibold text-text-primary">
        Por sección
      </h2>
      <ul className="mt-4 space-y-3">
        {sections.map((s) => (
          <li key={s.name} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-sm text-text-secondary">
              {s.name}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-tertiary">
              <div
                className={`h-full rounded-full ${scoreBar(s.score)}`}
                style={{ width: `${s.score ?? 0}%` }}
              />
            </div>
            <span
              className={`w-16 shrink-0 text-right text-sm font-semibold ${scoreTone(s.score)}`}
            >
              {s.score !== null ? s.score.toFixed(1) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RatingResult({ q }: { q: QuestionStats }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((v) => {
            const filled = q.average !== null && v <= Math.round(q.average);
            return (
              <Star
                key={v}
                className={`h-5 w-5 ${
                  filled
                    ? "fill-amber-400 stroke-amber-500"
                    : "fill-transparent stroke-text-tertiary"
                }`}
              />
            );
          })}
        </div>
        <span className="text-lg font-semibold text-text-primary">
          {q.average !== null ? q.average.toFixed(2) : "—"}
        </span>
        <span className="text-xs text-text-tertiary">promedio</span>
        {q.score !== null && (
          <span className={`ml-auto text-sm font-semibold ${scoreTone(q.score)}`}>
            {q.score.toFixed(1)}/100
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = q.distribution[star - 1] ?? 0;
          const pct = q.answeredCount > 0 ? Math.round((count / q.answeredCount) * 100) : 0;
          return (
            <li key={star} className="flex items-center gap-3 text-xs">
              <span className="w-8 shrink-0 text-text-secondary">{star}★</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-text-tertiary">
                {count} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChoiceResult({ q }: { q: QuestionStats }) {
  // La escala etiquetada va de mejor a peor, así que se pinta con el mismo
  // semáforo que el índice; la opción múltiple no tiene orden y va neutra.
  const scaled = q.type === "SCALE_LABELED";
  return (
    <div className="space-y-3">
      {scaled && q.score !== null && (
        <div className="flex items-center justify-end">
          <span className={`text-sm font-semibold ${scoreTone(q.score)}`}>
            {q.score.toFixed(1)}/100
          </span>
        </div>
      )}
      <ul className="space-y-2">
        {q.options.map((opt, idx) => {
          const count = q.distribution[idx] ?? 0;
          const pct = q.answeredCount > 0 ? Math.round((count / q.answeredCount) * 100) : 0;
          const tone = scaled
            ? scoreBar(scaleOptionScore(idx, q.options.length))
            : "bg-primary-600";
          return (
            <li key={idx} className="text-xs">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-text-primary">{opt}</span>
                <span className="shrink-0 text-text-tertiary">
                  {count} · {pct}%
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${tone}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {q.notApplicableCount > 0 && (
        <p className="text-xs text-text-tertiary">
          {q.notApplicableCount} respondió «No aplica» — queda fuera del promedio.
        </p>
      )}
    </div>
  );
}

/**
 * Comentarios abiertos. Son respuestas individuales, así que solo llegan
 * llenos cuando la consulta los pidió explícitamente (panel del
 * administrador). En el consolidado publicado la lista viene vacía y este
 * bloque se limita a decir cuántos comentarios hubo.
 */
function TextResult({ q }: { q: QuestionStats }) {
  if (q.textAnswers.length === 0) {
    return (
      <p className="text-sm text-text-tertiary">
        {q.answeredCount === 0
          ? "Sin comentarios."
          : `${q.answeredCount} comentario${q.answeredCount === 1 ? "" : "s"}. No se publican al cliente.`}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {q.textAnswers.map((t, i) => (
        <li
          key={i}
          className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-sm text-text-secondary"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

export function QuestionBreakdown({
  questions,
}: {
  questions: AggregatedResults["questions"];
}) {
  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <article key={q.id} className="rounded-xl border border-border bg-surface p-6">
          <header className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                {q.section}
              </p>
              <h3 className="mt-0.5 font-heading text-sm font-semibold text-text-primary">
                {idx + 1}. {q.label}
              </h3>
            </div>
            <span className="shrink-0 text-xs text-text-tertiary">
              {q.answeredCount} {q.answeredCount === 1 ? "respuesta" : "respuestas"}
            </span>
          </header>
          {q.type === "RATING_STARS" ? (
            <RatingResult q={q} />
          ) : q.type === "OPEN_TEXT" ? (
            <TextResult q={q} />
          ) : (
            <ChoiceResult q={q} />
          )}
        </article>
      ))}
    </div>
  );
}

export function SurveyResultsView({
  results,
  responseRate,
  recipientCount,
}: {
  results: AggregatedResults;
  responseRate?: number;
  recipientCount?: number;
}) {
  if (results.totalResponses === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-sm text-text-secondary">
          Todavía no hay respuestas para este lanzamiento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SatisfactionIndex
        score={results.satisfactionIndex}
        totalResponses={results.totalResponses}
        responseRate={responseRate}
        recipientCount={recipientCount}
      />
      <SectionBreakdown sections={results.sections} />
      <QuestionBreakdown questions={results.questions} />
    </div>
  );
}
