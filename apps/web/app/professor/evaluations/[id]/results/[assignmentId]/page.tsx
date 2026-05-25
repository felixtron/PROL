import Link from "next/link";
import { ArrowLeft, Building2, FileText } from "lucide-react";
import {
  getEvaluationResults,
  getEvaluationResultsSummary,
} from "@/lib/queries/evaluation";
import { EvaluationResultsView } from "@/app/dashboard/company/evaluations/[assignmentId]/results-view";
import { DiagnosticResultsView } from "@/app/dashboard/company/evaluations/[assignmentId]/diagnostic-results-view";
import { StakeholdersResultsView } from "@/app/dashboard/company/evaluations/[assignmentId]/stakeholders-results-view";
import { TextResultsView } from "@/app/dashboard/company/evaluations/[assignmentId]/text-results-view";
import { AssignmentSwitcher } from "./assignment-switcher";

export const dynamic = "force-dynamic";

export default async function ProfessorEvaluationResultsPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id, assignmentId } = await params;
  const [data, summary] = await Promise.all([
    getEvaluationResults(assignmentId),
    getEvaluationResultsSummary(id),
  ]);
  const siblings = summary.filter((a) => a.id !== assignmentId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/professor/evaluations/${id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {data.evaluation.title}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              Resultados consolidados
            </h1>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-text-tertiary">
              <Building2 className="h-3.5 w-3.5" />
              {data.company.name} · {data.respondents} de{" "}
              {data.totalParticipants} participante
              {data.totalParticipants !== 1 ? "s" : ""} respondieron.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {siblings.length > 0 && (
              <AssignmentSwitcher
                evaluationId={id}
                currentCompany={data.company.name}
                siblings={siblings.map((s) => ({
                  id: s.id,
                  companyName: s.company.name,
                  respondents: s.respondents,
                  totalParticipants: s.totalParticipants,
                }))}
              />
            )}
            <a
              href={`/api/evaluations/results/${assignmentId}/pdf`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              <FileText className="h-4 w-4" />
              Descargar PDF
            </a>
          </div>
        </div>
      </div>
      {data.evaluation.kind === "DIAGNOSTIC" ? (
        <DiagnosticResultsView data={data} />
      ) : data.evaluation.kind === "STAKEHOLDERS" ? (
        <StakeholdersResultsView data={data} />
      ) : data.evaluation.kind === "GUIDELINES" ||
        data.evaluation.kind === "ROLES" ? (
        <TextResultsView data={data} />
      ) : (
        <EvaluationResultsView data={data} />
      )}
    </div>
  );
}
