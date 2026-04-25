import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEvaluationResults } from "@/lib/queries/evaluation";
import { EvaluationResultsView } from "./results-view";

export const dynamic = "force-dynamic";

export default async function EvaluationResultsPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const data = await getEvaluationResults(assignmentId);
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div>
        <Link
          href="/dashboard/company"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Mi Empresa
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          {data.evaluation.title}
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Resultados consolidados — {data.respondents} de{" "}
          {data.totalParticipants} participante
          {data.totalParticipants !== 1 ? "s" : ""} respondieron.
        </p>
      </div>
      <EvaluationResultsView data={data} />
    </div>
  );
}
