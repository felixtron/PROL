import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireEvaluationAuthor } from "@/lib/auth";
import {
  getEvaluationDetail,
  listAssignableCompaniesForEvaluation,
} from "@/lib/queries/evaluation";
import { EvaluationEditor } from "./evaluation-editor";

export const dynamic = "force-dynamic";

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireEvaluationAuthor();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { evaluationsEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.evaluationsEnabled) redirect("/professor");
  }

  const [evaluation, companies] = await Promise.all([
    getEvaluationDetail(id),
    listAssignableCompaniesForEvaluation(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/professor/evaluations"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Evaluaciones
        </Link>
      </div>

      <EvaluationEditor evaluation={evaluation} companies={companies} />
    </div>
  );
}
