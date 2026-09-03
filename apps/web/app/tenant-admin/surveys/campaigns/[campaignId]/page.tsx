import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import {
  getCampaignForAdmin,
  getCampaignResultsForAdmin,
} from "@/lib/queries/survey";
import { SurveyResultsView } from "@/components/survey-results";
import { CAMPAIGN_STATE_LABEL, campaignState, type CampaignState } from "@/lib/surveys";
import {
  CampaignActions,
  PublishPanel,
  RecipientsTable,
} from "./campaign-panel";
import { APP_URL } from "@/lib/brand";

export const dynamic = "force-dynamic";

const STATE_COLORS: Record<CampaignState, string> = {
  DRAFT: "bg-surface-tertiary text-text-tertiary",
  SCHEDULED: "bg-sky-50 text-sky-700",
  OPEN: "bg-emerald-50 text-emerald-700",
  EXPIRED: "bg-amber-50 text-amber-700",
  CLOSED: "bg-surface-tertiary text-text-secondary",
  CANCELLED: "bg-red-50 text-red-700",
};

/** "2026-09-30" en la zona de la plataforma, para prellenar el input date. */
function toDateInput(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(date);
}

export default async function AdminCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  // Ambas queries exigen rol de administrador y comprueban el tenant del
  // lanzamiento antes de devolver nada.
  const [campaign, report] = await Promise.all([
    getCampaignForAdmin(campaignId),
    getCampaignResultsForAdmin(campaignId),
  ]);

  const h = await headers();
  // El host de la petición es lo correcto (el enlace tiene que funcionar en el
  // dominio por el que entró quien lo lee); `APP_URL` sólo cubre el caso de que
  // no venga cabecera, y apunta a esta instancia, no a otra.
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${proto}://${host}` : APP_URL;

  const state = campaignState(campaign);

  return (
    <div className="space-y-6">
      <Link
        href={`/tenant-admin/surveys/${campaign.surveyId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {campaign.survey.title}
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            {campaign.name}
          </h1>
          <span
            className={`rounded-pill px-2.5 py-1 text-xs font-medium ${STATE_COLORS[state]}`}
          >
            {CAMPAIGN_STATE_LABEL[state]}
          </span>
        </div>
        <p className="mt-1 text-text-secondary">{report.context.line || "Sin contexto"}</p>
        <p className="mt-1 text-sm text-text-tertiary">
          Abre el{" "}
          {campaign.opensAt.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · Cierra el{" "}
          {campaign.closesAt.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {campaign.reminderDaysBefore.length > 0 &&
            ` · Recordatorios: ${campaign.reminderDaysBefore.join(", ")} días antes`}
        </p>
      </header>

      <CampaignActions
        campaignId={campaign.id}
        state={state}
        shareUrl={
          campaign.shareToken ? `${baseUrl}/surveys/open/${campaign.shareToken}` : null
        }
        hasShareLink={Boolean(campaign.shareToken)}
        closesOn={toDateInput(campaign.closesAt)}
        responses={report.results.totalResponses}
      />

      <RecipientsTable
        recipients={campaign.recipients}
        answerBase={`${baseUrl}/surveys/answer`}
        campaignId={campaign.id}
        canResend={state === "OPEN"}
      />

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Resultados
        </h2>
        <SurveyResultsView
          results={report.results}
          responseRate={report.responseRate}
          recipientCount={report.recipientCount}
        />
      </section>

      <PublishPanel
        campaignId={campaign.id}
        publishedAt={campaign.resultsPublishedAt}
        audience={campaign.resultsAudience}
        note={campaign.resultsNote}
        resultsShareUrl={
          campaign.resultsShareToken
            ? `${baseUrl}/surveys/results/${campaign.resultsShareToken}`
            : null
        }
        responses={report.results.totalResponses}
      />
    </div>
  );
}
