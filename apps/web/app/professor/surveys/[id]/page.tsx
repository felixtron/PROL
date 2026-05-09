import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireSurveyAuthor } from "@/lib/auth";
import {
  getSurveyDetail,
  listCompaniesForSurveyAssignment,
} from "@/lib/queries/survey";
import { SurveyEditor } from "./survey-editor";

export const dynamic = "force-dynamic";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSurveyAuthor();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { surveysEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.surveysEnabled) redirect("/professor");
  }

  const [survey, companies] = await Promise.all([
    getSurveyDetail(id),
    listCompaniesForSurveyAssignment(),
  ]);

  // Build the absolute public URL based on the request host so links are
  // copy-pastable across local + production environments.
  const h = await headers();
  const host = h.get("host") ?? "prol.prosuite.pro";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/professor/surveys"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Encuestas
        </Link>
      </div>

      <SurveyEditor
        survey={survey}
        companies={companies}
        baseUrl={baseUrl}
      />
    </div>
  );
}
