import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireEvaluationAuthor } from "@/lib/auth";
import { NewEvaluationForm } from "./new-evaluation-form";

export default async function NewEvaluationPage() {
  const user = await requireEvaluationAuthor();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { evaluationsEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.evaluationsEnabled) redirect("/professor");
  }
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
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Nueva Evaluación
        </h1>
        <p className="mt-1 text-text-secondary">
          Define el título y la metodología. En el siguiente paso agregas
          secciones y preguntas.
        </p>
      </div>

      <NewEvaluationForm />
    </div>
  );
}
