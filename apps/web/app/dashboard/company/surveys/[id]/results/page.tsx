import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { db } from "@prol/db";
import { requireCompanyLeader } from "@/lib/auth";
import {
  getSurveyAggregatedResults,
  getSurveyDetail,
} from "@/lib/queries/survey";

export const dynamic = "force-dynamic";

export default async function LeaderSurveyResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await requireCompanyLeader();

  const tenant = await db.tenant.findUnique({
    where: { id: company.tenantId },
    select: { surveysEnabled: true },
  });
  if (!tenant) notFound();
  if (!tenant.surveysEnabled) redirect("/dashboard/company");

  // Re-use the access check from `getSurveyDetail`: throws unless the user
  // is an author of the tenant or the company leader. Cheaper than running
  // the full aggregation when the caller has no access.
  const survey = await getSurveyDetail(id);
  if (survey.companyId !== company.id) {
    redirect("/dashboard/company/surveys");
  }

  const results = await getSurveyAggregatedResults(id);
  if (!results) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/dashboard/company/surveys/${id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Encuesta
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Resultados: {results.title}
        </h1>
        {results.description ? (
          <p className="mt-1 text-text-secondary">{results.description}</p>
        ) : null}
        <div className="mt-3 inline-flex items-center gap-2 rounded-pill bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
          {results.totalResponses}{" "}
          {results.totalResponses === 1 ? "respuesta" : "respuestas"}
        </div>
      </div>

      {results.totalResponses === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-text-secondary">
            Esta encuesta aún no recibe respuestas. Comparte el link público
            desde la página de edición para empezar a recolectar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.questions.map((q, idx) => (
            <article
              key={q.id}
              className="rounded-xl border border-border bg-surface p-6 shadow-sm"
            >
              <header className="mb-4 flex items-start justify-between gap-4">
                <h2 className="font-heading text-sm font-semibold text-text-primary">
                  {idx + 1}. {q.label}
                </h2>
                <span className="shrink-0 text-xs text-text-tertiary">
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
                    : "fill-transparent stroke-text-tertiary"
                }`}
              />
            );
          })}
        </div>
        <span className="text-xl font-semibold text-text-primary">
          {average !== null ? average.toFixed(2) : "—"}
        </span>
        <span className="text-xs text-text-tertiary">promedio</span>
      </div>

      <ul className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star - 1] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={star} className="flex items-center gap-3 text-xs">
              <span className="w-8 shrink-0 text-text-secondary">{star}★</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-text-tertiary">
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
              <span className="text-text-primary">{opt}</span>
              <span className="shrink-0 text-text-tertiary">
                {count} · {pct}%
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-surface-tertiary">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary-600"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
