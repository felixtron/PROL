import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRespondentByToken } from "@/lib/queries/survey";
import { RespondentForm } from "@/app/surveys/respondent-form";
import { SurveyShell, SurveyClosedNotice } from "@/app/surveys/survey-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getRespondentByToken(token);
  if (!data) return { title: "Encuesta no encontrada — PROL" };
  return {
    title: `${data.campaign.survey.title} — ${data.tenantName}`,
    // El enlace es personal: nada de esto debe indexarse.
    robots: { index: false, follow: false },
  };
}

/**
 * Página de respuesta con el enlace personal. El token identifica al
 * destinatario y sólo sirve para esto: no expone resultados, ni otras
 * encuestas, ni ninguna función administrativa.
 */
export default async function AnswerSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getRespondentByToken(token);
  if (!data) notFound();

  const canAnswer = data.state === "OPEN" && !data.recipient.answered;

  return (
    <SurveyShell
      tenantName={data.tenantName}
      title={data.campaign.survey.title}
      description={data.campaign.survey.description}
      context={data.context}
      closesAt={canAnswer ? data.campaign.closesAt : null}
    >
      {canAnswer ? (
        <RespondentForm
          mode="token"
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
        <SurveyClosedNotice
          state={data.state}
          alreadyAnswered={data.recipient.answered}
        />
      )}
    </SurveyShell>
  );
}
