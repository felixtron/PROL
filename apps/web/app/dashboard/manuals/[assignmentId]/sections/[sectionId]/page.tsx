import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  ListChecks,
} from "lucide-react";
import { getSectionForCompany } from "@/lib/queries/manual";
import { ManualContent } from "@/components/manual-content";
import { SectionChecklist } from "./section-checklist";
import { EvidenceBlock } from "./evidence-block";

export const dynamic = "force-dynamic";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Detalle de una sección del manual: la narrativa, los documentos que se usan,
 * los pasos a seguir, las evidencias que hay que producir y la autoevaluación.
 * Es la pantalla donde el cliente realmente trabaja.
 */
export default async function ManualSectionPage({
  params,
}: {
  params: Promise<{ assignmentId: string; sectionId: string }>;
}) {
  const { assignmentId, sectionId } = await params;
  const data = await getSectionForCompany(assignmentId, sectionId).catch(() => null);
  if (!data) notFound();

  const {
    section,
    checks,
    activities,
    companyDocuments,
    prev,
    next,
    isStaff,
  } = data;

  const steps = section.items.filter((i) => i.kind === "STEP");
  const selfChecks = section.items.filter((i) => i.kind === "SELF_CHECK");

  // La versión personalizada de la empresa manda sobre la plantilla base.
  const companyDocByDocumentId = new Map(
    companyDocuments.map((d) => [d.documentId, d]),
  );

  const activityByRequirement = new Map(
    activities.map((a) => [a.requirementId, a]),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <Link
          href={`/dashboard/manuals/${assignmentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al manual
        </Link>
        <p className="mt-3 text-xs uppercase tracking-wide text-text-tertiary">
          {section.chapter.title}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary">
          {section.code ? `${section.code} — ` : ""}
          {section.title}
        </h1>
        {isStaff ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Estás viendo esta sección como la ve el cliente. Marcar pasos o subir
            evidencias aquí queda registrado a tu nombre.
          </p>
        ) : null}
      </div>

      {/* Narrativa */}
      <section>
        <ManualContent html={section.contentHtml} />
      </section>

      {/* Documentos */}
      {section.documents.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
            <FileText className="h-4 w-4 text-text-tertiary" />
            Documentos que utilizamos
          </h2>
          <div className="space-y-2">
            {section.documents.map(({ document: doc, note }) => {
              const own = companyDocByDocumentId.get(doc.id);
              return (
                <div
                  key={doc.id}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary">{doc.name}</p>
                      <p className="font-mono text-xs text-text-tertiary">
                        {own?.codeOverride ?? doc.code}
                      </p>
                      {doc.description ? (
                        <p className="mt-1.5 text-sm text-text-secondary">
                          {doc.description}
                        </p>
                      ) : null}
                      {note ? (
                        <p className="mt-1 text-xs italic text-text-tertiary">
                          {note}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      {own ? (
                        <>
                          <a
                            href={`/files/company-document/${own.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Descargar
                          </a>
                          <p className="mt-1 text-xs text-text-tertiary">
                            Versión {own.version} de tu empresa
                          </p>
                        </>
                      ) : doc.baseFileName ? (
                        <>
                          <a
                            href={`/files/manual-document/${doc.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Plantilla base
                          </a>
                          <p className="mt-1 text-xs text-text-tertiary">
                            {formatSize(doc.baseFileSize)}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-text-tertiary">
                          Tu consultor lo entregará
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Paso a paso */}
      {steps.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
            <ListChecks className="h-4 w-4 text-text-tertiary" />
            Qué tenemos que hacer, paso a paso
          </h2>
          <div className="rounded-xl border border-border bg-surface px-4">
            <SectionChecklist
              assignmentId={assignmentId}
              items={steps}
              checks={checks}
              variant="steps"
            />
          </div>
        </section>
      ) : null}

      {/* Evidencias */}
      {section.requirements.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Evidencias de esta sección
          </h2>
          <div className="space-y-3">
            {section.requirements.map((req) => (
              <EvidenceBlock
                key={req.id}
                requirement={req}
                activity={activityByRequirement.get(req.id) ?? null}
                readOnly={data.assignment.status !== "ACTIVE"}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Autoevaluación */}
      {selfChecks.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Qué debemos obtener — autoevaluación
          </h2>
          <div className="rounded-xl border border-border bg-surface px-4 py-1">
            <SectionChecklist
              assignmentId={assignmentId}
              items={selfChecks}
              checks={checks}
              variant="self-check"
            />
          </div>
        </section>
      ) : null}

      {/* Navegación */}
      <nav className="flex items-center justify-between gap-4 border-t border-border pt-6">
        {prev ? (
          <Link
            href={`/dashboard/manuals/${assignmentId}/sections/${prev.id}`}
            className="group inline-flex min-w-0 items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {prev.code ? `${prev.code} — ` : ""}
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/dashboard/manuals/${assignmentId}/sections/${next.id}`}
            className="group inline-flex min-w-0 items-center gap-2 text-right text-sm text-text-secondary hover:text-text-primary"
          >
            <span className="truncate">
              {next.code ? `${next.code} — ` : ""}
              {next.title}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
