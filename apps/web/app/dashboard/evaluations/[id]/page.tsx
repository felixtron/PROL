import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { getMyParticipantDetail } from "@/lib/queries/evaluation";
import { EvaluationResponseForm } from "./response-form";

export const dynamic = "force-dynamic";

export default async function AnswerEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const participant = await getMyParticipantDetail(id);
  const ev = participant.assignment.evaluation;
  const latest = participant.submissions[0];
  const initialValues: Record<string, string> = {};
  const initialTexts: Record<string, string> = {};
  if (latest) {
    for (const a of latest.answers) {
      if (a.value) initialValues[a.questionId] = a.value;
      if (a.text) initialTexts[a.questionId] = a.text;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div>
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          {ev.title}
        </h1>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-text-tertiary">
          <Building2 className="h-3.5 w-3.5" />
          {participant.assignment.company.name}
          {latest && (
            <span className="ml-2 rounded-pill bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Última versión: v{latest.version}
            </span>
          )}
        </p>
        {ev.description && (
          <p className="mt-3 text-sm text-text-secondary">{ev.description}</p>
        )}
      </div>

      {ev.methodology && (
        <details className="rounded-lg border border-border bg-surface p-4 text-sm">
          <summary className="cursor-pointer font-medium text-text-primary">
            Metodología e instrucciones
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-text-secondary">
            {ev.methodology}
          </p>
        </details>
      )}

      <EvaluationResponseForm
        participantId={participant.id}
        sections={ev.sections.map((s) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          questions: s.questions.map((q) => ({
            id: q.id,
            code: q.code,
            label: q.label,
            description: q.description,
            type: q.type,
          })),
        }))}
        initialValues={initialValues}
        initialTexts={initialTexts}
        hasPrevious={!!latest}
      />
    </div>
  );
}
