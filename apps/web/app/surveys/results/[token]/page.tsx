import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedResultsByShareToken } from "@/lib/queries/survey";
import { SurveyResultsView } from "@/components/survey-results";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublishedResultsByShareToken(token);
  if (!data) return { title: "Resultados no encontrados — PROL" };
  return {
    title: `Resultados — ${data.campaign.title}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Consolidado por enlace de solo lectura.
 *
 * Sólo responde si el administrador aprobó publicar: un token vivo sobre una
 * campaña sin publicar devuelve 404, igual que un token inexistente. Nunca
 * muestra respuestas individuales ni datos de otra empresa.
 */
export default async function PublicSurveyResultsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublishedResultsByShareToken(token);
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-surface-secondary px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          {data.context.line && (
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              {data.context.line}
            </p>
          )}
          <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            {data.campaign.title}
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">
            {data.campaign.name} · Publicado el{" "}
            {new Intl.DateTimeFormat("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "America/Mexico_City",
            }).format(data.campaign.publishedAt!)}
          </p>
          {data.campaign.note && (
            <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
              {data.campaign.note}
            </p>
          )}
        </header>

        <SurveyResultsView results={data.results} />
      </div>
    </main>
  );
}
