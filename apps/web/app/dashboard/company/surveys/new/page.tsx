import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireCompanyLeader } from "@/lib/auth";
import { NewSurveyForm } from "@/app/professor/surveys/new/new-survey-form";

export default async function LeaderNewSurveyPage() {
  const { company } = await requireCompanyLeader();

  const tenant = await db.tenant.findUnique({
    where: { id: company.tenantId },
    select: { surveysEnabled: true },
  });
  if (!tenant) notFound();
  if (!tenant.surveysEnabled) redirect("/dashboard/company");

  // Leader only ever creates surveys for their own company — the picker is
  // hidden by passing `lockedCompanyId`. The action also enforces this
  // server-side (`requireSurveyCreateAccess`).
  const companyOption = {
    id: company.id,
    name: company.name,
    slug: company.slug,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/dashboard/company/surveys"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Encuestas
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Nueva encuesta
        </h1>
        <p className="mt-1 text-text-secondary">
          Asignada a <strong>{company.name}</strong>. En el siguiente paso
          agregás las preguntas y publicás el link.
        </p>
      </div>

      <NewSurveyForm
        companies={[companyOption]}
        lockedCompanyId={company.id}
        redirectPathBase="/dashboard/company/surveys"
      />
    </div>
  );
}
