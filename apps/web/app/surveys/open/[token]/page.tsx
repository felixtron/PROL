import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCampaignByShareToken } from "@/lib/queries/survey";
import { RespondentForm } from "@/app/surveys/respondent-form";
import { SurveyShell, SurveyClosedNotice } from "@/app/surveys/survey-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getCampaignByShareToken(token);
  if (!data) return { title: "Encuesta no encontrada — PROL" };
  return {
    title: `${data.campaign.survey.title} — ${data.tenantName}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Enlace compartible: para asistentes a un evento que no son usuarios de la
 * plataforma. Se identifican por correo y el sistema les crea su propio
 * destinatario, así que sigue habiendo una respuesta por persona y el
 * vencimiento se aplica igual que con el enlace personal.
 */
export default async function OpenSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getCampaignByShareToken(token);
  if (!data) notFound();

  return (
    <SurveyShell
      tenantName={data.tenantName}
      title={data.campaign.survey.title}
      description={data.campaign.survey.description}
      context={data.context}
      closesAt={data.state === "OPEN" ? data.campaign.closesAt : null}
    >
      {data.state === "OPEN" ? (
        <RespondentForm
          mode="share"
          token={token}
          questions={data.campaign.survey.questions.map((q) => ({
            id: q.id,
            type: q.type,
            label: q.label,
            section: q.section,
            options: Array.isArray(q.options)
              ? (q.options as unknown[]).filter(
                  (o): o is string => typeof o === "string",
                )
              : [],
          }))}
        />
      ) : (
        <SurveyClosedNotice state={data.state} />
      )}
    </SurveyShell>
  );
}
