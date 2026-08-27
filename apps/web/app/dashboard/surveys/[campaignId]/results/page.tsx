import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedResultsForCurrentUser } from "@/lib/queries/survey";
import { SurveyResultsView } from "@/components/survey-results";

export const dynamic = "force-dynamic";

/**
 * Consolidado publicado, visto por el cliente.
 *
 * La query devuelve null salvo que el administrador haya publicado Y el
 * usuario sea el líder de la empresa del lanzamiento o un participante
 * cuando la publicación llega a participantes. Cualquier otro caso —incluido
 * un id de otra empresa u otro tenant— cae en 404.
 */
export default async function LeaderSurveyResultsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const data = await getPublishedResultsForCurrentUser(campaignId);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/dashboard/surveys"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Encuestas
        </Link>
        {data.context.line && (
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            {data.context.line}
          </p>
        )}
        <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary">
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
      </div>

      <SurveyResultsView results={data.results} />
    </div>
  );
}
