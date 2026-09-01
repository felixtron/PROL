import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, FileCheck2 } from "lucide-react";
import { listCompanyEvidence } from "@/lib/queries/evidence";
import { EVIDENCE_STATUS_CLASS, EVIDENCE_STATUS_LABEL } from "@/lib/compliance";
import { DeletionRequest } from "./deletion-request";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

/**
 * Panel del líder de proyecto: todas las evidencias de su empresa en un solo
 * sitio, con su estado y la posibilidad de solicitar una baja.
 *
 * Sólo el líder entra aquí — la autorización la resuelve la query, que redirige
 * a quien no lo sea en vez de mostrar una página vacía.
 */
export default async function CompanyEvidencePage() {
  const data = await listCompanyEvidence().catch(() => null);
  if (!data) redirect("/dashboard");

  const { company, evidences } = data;
  const byStatus = {
    pending: evidences.filter((e) => e.status === "PENDING").length,
    inReview: evidences.filter((e) => e.status === "IN_REVIEW").length,
    correction: evidences.filter((e) => e.status === "NEEDS_CORRECTION").length,
    approved: evidences.filter((e) => e.status === "APPROVED").length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <Link
          href="/dashboard/company"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Mi empresa
        </Link>
        <h1 className="mt-3 font-heading text-2xl font-bold text-text-primary">
          Evidencias de {company.name}
        </h1>
        <p className="mt-1 text-text-secondary">
          Todo lo que tu equipo ha entregado, con su estado de revisión. Puedes
          solicitar la baja de una evidencia; la resuelve el administrador.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pendientes" value={byStatus.pending} />
        <StatCard label="En revisión" value={byStatus.inReview} />
        <StatCard label="Requieren corrección" value={byStatus.correction} />
        <StatCard label="Aprobadas" value={byStatus.approved} />
      </div>

      {evidences.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <FileCheck2 className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            Todavía no hay evidencias entregadas.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {evidences.map((e) => (
            <div key={e.id} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-text-primary">
                    {e.activity.requirement.name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      EVIDENCE_STATUS_CLASS[e.status]
                    }`}
                  >
                    {EVIDENCE_STATUS_LABEL[e.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {e.assignment.manual.title} ·{" "}
                  {e.activity.requirement.section.code
                    ? `${e.activity.requirement.section.code} — `
                    : ""}
                  {e.activity.requirement.section.title}
                  {e.activity.periodLabel ? ` · ${e.activity.periodLabel}` : ""}
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  Versión {e.version} · {e.uploadedBy?.name ?? "un miembro"} ·{" "}
                  {DATE.format(new Date(e.submittedAt))}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3">
                {e.fileName ? (
                  <a
                    href={`/files/evidence/${e.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar
                  </a>
                ) : null}
                <Link
                  href={`/dashboard/manuals/${e.assignment.id}/sections/${e.activity.requirement.section.id}`}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Ver sección
                </Link>
                <DeletionRequest
                  evidenceId={e.id}
                  requested={Boolean(e.deletionRequestedAt)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{label}</p>
    </div>
  );
}
