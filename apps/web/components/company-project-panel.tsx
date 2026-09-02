import Link from "next/link";
import { ArrowLeft, Download, FileText, FolderOpen } from "lucide-react";
import {
  ACTIVITY_STATE_LABEL,
  EVIDENCE_STATUS_CLASS,
  EVIDENCE_STATUS_LABEL,
  PERIODICITY_LABEL,
} from "@/lib/compliance";
import { CompanyDocumentUpload } from "@/components/company-document-upload";
import { ActivityDueDate } from "@/components/activity-due-date";
import { ProjectDriveLink } from "@/components/project-drive-link";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

const STATE_CLASS: Record<string, string> = {
  OVERDUE: "bg-rose-100 text-rose-700",
  DUE_SOON: "bg-amber-100 text-amber-800",
  OPEN: "bg-slate-100 text-slate-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

// Etiqueta legible del `kind` de CompanyDocument para los arquetipos nativos.
// "FILE" no aparece aquí: para ese kind se sigue mostrando el enlace de
// descarga, no esta etiqueta.
const DOCUMENT_KIND_LABEL: Record<string, string> = {
  PROCEDIMIENTO: "Procedimiento",
  REGISTRO: "Registro",
};

/**
 * Panel del proyecto de una empresa: su avance, sus plantillas personalizadas,
 * y todas sus actividades con la evidencia vigente de cada una.
 *
 * Es la pantalla desde la que el consultor lleva el seguimiento del cliente,
 * y la que abre la agenda al pinchar una actividad.
 */
export function CompanyProjectPanel({
  data,
  backHref,
  evidenceBasePath,
  canEditDueDates,
}: {
  data: NonNullable<Awaited<ReturnType<
    typeof import("@/lib/queries/manual").getAssignmentPanel
  >>>;
  backHref: string;
  evidenceBasePath: string;
  canEditDueDates: boolean;
}) {
  const { assignment, activities, companyDocuments, progress } = data;

  const docsByDocumentId = new Map(
    companyDocuments.map((d) => [d.documentId, d]),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-3 font-heading text-2xl font-bold text-text-primary">
          {assignment.company.name}
        </h1>
        <p className="mt-1 text-text-secondary">
          {assignment.manual.title}
          {assignment.manual.normaLabel ? ` · ${assignment.manual.normaLabel}` : ""}
        </p>
        <p className="mt-1 text-sm text-text-tertiary">
          Activado el {DATE.format(new Date(assignment.activatedAt))}
          {assignment.consultant
            ? ` · Consultor: ${assignment.consultant.name ?? assignment.consultant.email}`
            : " · Sin consultor asignado"}
          {assignment.status !== "ACTIVE" ? ` · ${assignment.status}` : ""}
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-text-primary">Avance de implantación</span>
          <span className="text-text-secondary">{progress.percent}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-primary-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          {progress.checkedItems}/{progress.totalItems} pasos ·{" "}
          {progress.approvedRequirements}/{progress.totalRequirements} evidencias
          aprobadas
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
          <FolderOpen className="h-4 w-4 text-text-tertiary" />
          Carpeta de Drive del proyecto
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          El expediente de archivos de este proyecto vive en Google Drive. PROL
          lleva el control de qué requisito toca, cuándo vence y quién lo aprobó.
        </p>
        <div className="mt-3">
          <ProjectDriveLink
            assignmentId={assignment.id}
            driveUrl={assignment.driveUrl}
            invalid={data.driveUrlIsInvalid}
            canEdit={data.canEditDriveUrl}
          />
        </div>
      </section>

      {/* Plantillas de la empresa */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
          <FileText className="h-4 w-4 text-text-tertiary" />
          Documentos de la empresa
        </h2>
        <p className="text-sm text-text-secondary">
          Sube aquí la versión personalizada de cada documento. Si no hay una, el
          cliente descarga la plantilla base del manual.
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {assignment.manual.documents.length === 0 ? (
            <p className="p-4 text-sm text-text-tertiary">
              Este manual todavía no tiene documentos en su catálogo.
            </p>
          ) : (
            assignment.manual.documents.map((doc) => {
              const own = docsByDocumentId.get(doc.id);
              return (
                <div key={doc.id} className="flex flex-wrap items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary">
                      {own?.nameOverride ?? doc.name}
                    </p>
                    <p className="font-mono text-xs text-text-tertiary">
                      {own?.codeOverride ?? doc.code}
                    </p>
                    {own ? (
                      <p className="mt-1 text-xs text-emerald-700">
                        {[
                          `Versión ${own.version}`,
                          own.kind === "FILE" ? own.fileName : null,
                          own.uploadedBy?.name ?? "—",
                          DATE.format(new Date(own.createdAt)),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-text-tertiary">
                        {doc.baseFileName
                          ? "Sólo plantilla base"
                          : "Sin plantilla base ni versión de empresa"}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {own && own.kind === "FILE" ? (
                      <a
                        href={`/files/company-document/${own.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </a>
                    ) : null}
                    {own && own.kind !== "FILE" ? (
                      // El enlace al visor del cliente lo añade el plan 03-07;
                      // aquí no se inventa una ruta que todavía no existe.
                      <span className="text-xs font-medium text-text-secondary">
                        {DOCUMENT_KIND_LABEL[own.kind] ?? own.kind} · v{own.version}
                      </span>
                    ) : null}
                    {!own || own.kind === "FILE" ? (
                      <CompanyDocumentUpload
                        assignmentId={assignment.id}
                        documentId={doc.id}
                        currentVersion={own?.version ?? null}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Actividades */}
      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Actividades y evidencias
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {activities.length === 0 ? (
            <p className="p-4 text-sm text-text-tertiary">
              Este manual no define requisitos de evidencia todavía.
            </p>
          ) : (
            activities.map((a) => (
              <div key={a.id} className="flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">
                      {a.requirement.name}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATE_CLASS[a.state] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ACTIVITY_STATE_LABEL[a.state]}
                    </span>
                    {a.requirement.periodicity !== "ONCE" ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                        {PERIODICITY_LABEL[a.requirement.periodicity]}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {a.requirement.section.code
                      ? `${a.requirement.section.code} — `
                      : ""}
                    {a.requirement.section.title}
                    {a.periodLabel ? ` · ${a.periodLabel}` : ""}
                    {a.periodNumber > 1 ? ` · ciclo ${a.periodNumber}` : ""}
                  </p>
                  <div className="mt-2">
                    <ActivityDueDate
                      activityId={a.id}
                      dueAt={a.dueAt}
                      disabled={!canEditDueDates}
                    />
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {a.latestEvidence ? (
                    <Link
                      href={`${evidenceBasePath}/${a.latestEvidence.id}`}
                      className="inline-block"
                    >
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          EVIDENCE_STATUS_CLASS[a.latestEvidence.status]
                        }`}
                      >
                        {EVIDENCE_STATUS_LABEL[a.latestEvidence.status]}
                      </span>
                      <p className="mt-1 text-xs text-text-tertiary">
                        v{a.latestEvidence.version} ·{" "}
                        {DATE.format(new Date(a.latestEvidence.submittedAt))}
                      </p>
                    </Link>
                  ) : (
                    <span className="text-xs text-text-tertiary">Sin entregar</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
