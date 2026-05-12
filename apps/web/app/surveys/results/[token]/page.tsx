import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import { getSurveyResultsByToken } from "@/lib/queries/survey";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const results = await getSurveyResultsByToken(token);
  if (!results) return { title: "Resultados no encontrados — PROL" };
  return {
    title: `Resultados — ${results.title}`,
    // Share tokens are private; nothing here should be indexed.
    robots: { index: false, follow: false },
  };
}

export default async function PublicSurveyResultsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const results = await getSurveyResultsByToken(token);
  if (!results) notFound();

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {results.companyName}
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-neutral-900 sm:text-3xl">
            {results.title}
          </h1>
          {results.description ? (
            <p className="mt-3 text-base leading-relaxed text-neutral-600">
              {results.description}
            </p>
          ) : null}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
            {results.totalResponses}{" "}
            {results.totalResponses === 1 ? "respuesta" : "respuestas"}
          </div>
        </header>

        {results.totalResponses === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="text-sm text-neutral-600">
              Aún no hay respuestas para esta encuesta.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.questions.map((q, idx) => (
              <article
                key={q.id}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <header className="mb-4 flex items-start justify-between gap-4">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    {idx + 1}. {q.label}
                  </h2>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {q.answeredCount}{" "}
                    {q.answeredCount === 1 ? "respuesta" : "respuestas"}
                  </span>
                </header>

                {q.type === "RATING_STARS" ? (
                  <RatingResult
                    average={q.average}
                    distribution={q.distribution}
                    total={q.answeredCount}
                  />
                ) : (
                  <ChoiceResult
                    options={q.options}
                    distribution={q.distribution}
                    total={q.answeredCount}
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function RatingResult({
  average,
  distribution,
  total,
}: {
  average: number | null;
  distribution: number[];
  total: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((v) => {
            const filled = average !== null && v <= Math.round(average);
            return (
              <Star
                key={v}
                className={`h-6 w-6 ${
                  filled
                    ? "fill-amber-400 stroke-amber-500"
                    : "fill-transparent stroke-neutral-300"
                }`}
              />
            );
          })}
        </div>
        <span className="text-xl font-semibold text-neutral-900">
          {average !== null ? average.toFixed(2) : "—"}
        </span>
        <span className="text-xs text-neutral-500">promedio</span>
      </div>

      <ul className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star - 1] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={star} className="flex items-center gap-3 text-xs">
              <span className="w-8 shrink-0 text-neutral-600">{star}★</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-neutral-600">
                {count} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChoiceResult({
  options,
  distribution,
  total,
}: {
  options: string[];
  distribution: number[];
  total: number;
}) {
  return (
    <ul className="space-y-2">
      {options.map((opt, idx) => {
        const count = distribution[idx] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <li key={idx} className="text-xs">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-neutral-800">{opt}</span>
              <span className="shrink-0 text-neutral-600">
                {count} · {pct}%
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-neutral-900"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
