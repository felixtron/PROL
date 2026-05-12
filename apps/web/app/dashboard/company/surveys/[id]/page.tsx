import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireCompanyLeader } from "@/lib/auth";
import { getSurveyDetail } from "@/lib/queries/survey";
import { SurveyEditor } from "@/app/professor/surveys/[id]/survey-editor";

export const dynamic = "force-dynamic";

export default async function LeaderSurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await requireCompanyLeader();

  const tenant = await db.tenant.findUnique({
    where: { id: company.tenantId },
    select: { surveysEnabled: true },
  });
  if (!tenant) notFound();
  if (!tenant.surveysEnabled) redirect("/dashboard/company");

  // `getSurveyDetail` enforces that the caller is either an author of the
  // survey's tenant or the leader of the survey's company. If the survey
  // is scoped to a different company, this throws.
  const survey = await getSurveyDetail(id);

  // Defensive: even though the query allows author access, this page is
  // mounted under /dashboard/company/, so we hard-block any survey that
  // isn't scoped to the leader's company.
  if (survey.companyId !== company.id) {
    redirect("/dashboard/company/surveys");
  }

  const companyOption = {
    id: company.id,
    name: company.name,
    slug: company.slug,
  };

  const h = await headers();
  const host = h.get("host") ?? "prol.prosuite.pro";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

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
      </div>

      <SurveyEditor
        survey={survey}
        companies={[companyOption]}
        baseUrl={baseUrl}
        listHref="/dashboard/company/surveys"
      />
    </div>
  );
}
