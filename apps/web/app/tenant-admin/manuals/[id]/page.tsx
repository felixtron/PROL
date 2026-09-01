import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getManualForEdit,
  listCompaniesForActivation,
  listConsultants,
} from "@/lib/queries/manual";
import { ManualStructure } from "./manual-structure";
import { ManualDocuments } from "./manual-documents";
import { ManualCompanies } from "./manual-companies";
import { ManualHeaderActions } from "./manual-header-actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-amber-100 text-amber-800",
};

export default async function ManualEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const manual = await getManualForEdit(id).catch(() => null);
  if (!manual) notFound();

  const [companies, consultants] = await Promise.all([
    listCompaniesForActivation(id),
    listConsultants(manual.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/tenant-admin/manuals"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Manuales
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              {manual.title}
            </h1>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                STATUS_CLASS[manual.status]
              }`}
            >
              {STATUS_LABEL[manual.status]}
            </span>
          </div>
          {manual.normaLabel ? (
            <p className="text-sm text-text-tertiary">{manual.normaLabel}</p>
          ) : null}
          {manual.description ? (
            <p className="mt-2 max-w-2xl text-text-secondary">{manual.description}</p>
          ) : null}
        </div>
        <ManualHeaderActions manualId={manual.id} status={manual.status} />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Estructura
          </h2>
          <p className="text-sm text-text-secondary">
            Capítulos y secciones. Entra en una sección para escribir su
            contenido, sus pasos y sus evidencias.
          </p>
        </div>
        <ManualStructure manualId={manual.id} chapters={manual.chapters} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Catálogo de documentos
          </h2>
          <p className="text-sm text-text-secondary">
            Los procedimientos y registros del sistema, con su código y su
            plantilla base. Desde cada sección se enlazan los que apliquen.
          </p>
        </div>
        <ManualDocuments manualId={manual.id} documents={manual.documents} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Empresas
          </h2>
          <p className="text-sm text-text-secondary">
            Al activar el manual se crea la agenda de la empresa y se avisa a su
            líder de proyecto.
          </p>
        </div>
        <ManualCompanies
          manualId={manual.id}
          published={manual.status === "PUBLISHED"}
          assignments={manual.assignments}
          companies={companies}
          consultants={consultants}
        />
      </section>
    </div>
  );
}
