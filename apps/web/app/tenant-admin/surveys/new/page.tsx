import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireSurveyAdmin } from "@/lib/survey-access";
import { NewSurveyForm } from "./new-survey-form";

export default async function NewSurveyPage() {
  const user = await requireSurveyAdmin();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { surveysEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.surveysEnabled) redirect("/tenant-admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tenant-admin/surveys"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Encuestas
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Nueva encuesta
        </h1>
        <p className="mt-1 text-text-secondary">
          Define el cuestionario. Los destinatarios, las fechas y el contexto se
          eligen después, al lanzarlo.
        </p>
      </div>

      <NewSurveyForm />
    </div>
  );
}
