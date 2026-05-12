import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSurveyByPublicSlug } from "@/lib/queries/survey";
import { RespondentForm } from "./respondent-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}): Promise<Metadata> {
  const { publicSlug } = await params;
  const survey = await getSurveyByPublicSlug(publicSlug);
  if (!survey) return { title: "Encuesta no encontrada — PROL" };
  return {
    title: `${survey.title} — ${survey.tenant.name}`,
    description: survey.description ?? undefined,
    // Public surveys don't need to be indexed: each visitor reaches it via
    // a private link distributed by the leader/professor.
    robots: { index: false, follow: false },
  };
}

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;
  const survey = await getSurveyByPublicSlug(publicSlug);
  if (!survey) notFound();

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {survey.tenant.name}
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-neutral-900 sm:text-3xl">
            {survey.title}
          </h1>
          {survey.description ? (
            <p className="mt-3 text-base leading-relaxed text-neutral-600">
              {survey.description}
            </p>
          ) : null}
        </header>

        <RespondentForm
          publicSlug={publicSlug}
          questions={survey.questions.map((q) => ({
            id: q.id,
            type: q.type,
            label: q.label,
            options: Array.isArray(q.options)
              ? (q.options as unknown[]).filter(
                  (o): o is string => typeof o === "string",
                )
              : [],
          }))}
          companies={survey.tenant.companies}
        />
      </div>
    </main>
  );
}
