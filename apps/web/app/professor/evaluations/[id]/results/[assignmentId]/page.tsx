import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { getEvaluationResults } from "@/lib/queries/evaluation";
import { EvaluationResultsView } from "@/app/dashboard/company/evaluations/[assignmentId]/results-view";

export const dynamic = "force-dynamic";

export default async function ProfessorEvaluationResultsPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id, assignmentId } = await params;
  const data = await getEvaluationResults(assignmentId);
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
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Resultados consolidados
        </h1>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-text-tertiary">
          <Building2 className="h-3.5 w-3.5" />
          {data.company.name} · {data.respondents} de {data.totalParticipants}{" "}
          participante{data.totalParticipants !== 1 ? "s" : ""} respondieron.
        </p>
      </div>
      <EvaluationResultsView data={data} />
    </div>
  );
}
