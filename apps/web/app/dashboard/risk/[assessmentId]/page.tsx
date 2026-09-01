import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getRiskAssessment } from "@/lib/queries/evidence";
import { parseRiskConfig } from "@/lib/compliance";
import { RiskMatrixEditor, type RiskRow } from "./risk-matrix-editor";
import { DuplicateMatrix } from "./duplicate-matrix";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

/**
 * Herramienta de análisis de riesgos y oportunidades.
 *
 * Vive fuera del manual a propósito: la misma matriz sirve a distintas normas
 * y puede usarse suelta. Cuando llega desde una sección, la actividad asociada
 * es a la que se entregará al enviarla.
 */
export default async function RiskMatrixPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const data = await getRiskAssessment(assessmentId).catch(() => null);
  if (!data) notFound();

  const { assessment, canEdit, activity } = data;
  const config = parseRiskConfig(assessment.config);

  const initialRows: RiskRow[] = assessment.items.map((i) => ({
    key: i.id,
    type: i.type,
    description: i.description,
    probability: i.probability,
    impact: i.impact,
    actions: i.actions ?? "",
    responsible: i.responsible ?? "",
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        {assessment.assignmentId ? (
          <Link
            href={`/dashboard/manuals/${assessment.assignmentId}`}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al manual
          </Link>
        ) : null}
        <h1 className="mt-3 font-heading text-2xl font-bold text-text-primary">
          {assessment.title}
        </h1>
        <p className="mt-1 text-text-secondary">
          Identifiquen los riesgos y oportunidades, evalúen su probabilidad y
          consecuencia, y definan las acciones. Al enviarla, la matriz queda
          guardada como evidencia con su fecha.
        </p>
        {assessment.periodLabel ? (
          <p className="mt-1 text-sm text-text-tertiary">
            Periodo {assessment.periodLabel}
          </p>
        ) : null}
      </div>

      {assessment.status === "SUBMITTED" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Enviada
            {assessment.submittedBy?.name
              ? ` por ${assessment.submittedBy.name}`
              : ""}
            {assessment.submittedAt
              ? ` el ${DATE.format(new Date(assessment.submittedAt))}`
              : ""}
            . Ya no se puede editar.
          </p>
          <DuplicateMatrix assessmentId={assessment.id} />
        </div>
      ) : null}

      {activity?.dueAt ? (
        <p className="text-sm text-text-secondary">
          Fecha comprometida de esta actualización:{" "}
          <strong>{DATE.format(new Date(activity.dueAt))}</strong>
        </p>
      ) : null}

      <RiskMatrixEditor
        assessmentId={assessment.id}
        activityId={activity?.id ?? null}
        config={config}
        initialRows={initialRows}
        readOnly={!canEdit}
      />
    </div>
  );
}
