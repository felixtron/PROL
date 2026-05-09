import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireSurveyAuthor } from "@/lib/auth";
import { listCompaniesForSurveyAssignment } from "@/lib/queries/survey";
import { NewSurveyForm } from "./new-survey-form";

export default async function NewSurveyPage() {
  const user = await requireSurveyAuthor();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { surveysEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.surveysEnabled) redirect("/professor");
  }

  const companies = await listCompaniesForSurveyAssignment();

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
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Nueva Encuesta
        </h1>
        <p className="mt-1 text-text-secondary">
          Define el título, la empresa que recibirá los resultados y agrega
          las preguntas en el siguiente paso.
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="max-w-xl rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-text-secondary">
            Necesitas al menos una empresa para crear una encuesta.
          </p>
          <Link
            href="/professor/students"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Crear empresa
          </Link>
        </div>
      ) : (
        <NewSurveyForm companies={companies} />
      )}
    </div>
  );
}
