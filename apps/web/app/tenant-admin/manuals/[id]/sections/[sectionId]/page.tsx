import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getSectionForEdit,
  listEvaluationsForRequirement,
  listManualDocuments,
} from "@/lib/queries/manual";
import { SectionContentEditor } from "./section-content-editor";
import { SectionItemsEditor } from "./section-items-editor";
import { SectionDocumentsEditor } from "./section-documents-editor";
import { SectionRequirementsEditor } from "./section-requirements-editor";

export const dynamic = "force-dynamic";

export default async function SectionEditorPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id, sectionId } = await params;
  const data = await getSectionForEdit(sectionId).catch(() => null);
  if (!data) notFound();

  const { manual, section } = data;
  const [catalog, evaluations] = await Promise.all([
    listManualDocuments(manual.id),
    listEvaluationsForRequirement(manual.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
      <div>
        <Link
          href={`/tenant-admin/manuals/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {manual.title}
        </Link>
        <p className="mt-3 text-xs uppercase tracking-wide text-text-tertiary">
          {section.chapter.title}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary">
          {section.code ? `${section.code} — ` : ""}
          {section.title}
        </h1>
      </div>

      <SectionContentEditor
        sectionId={section.id}
        initial={{
          title: section.title,
          code: section.code,
          contentHtml: section.contentHtml,
          estimatedMinutes: section.estimatedMinutes,
        }}
      />

      <SectionDocumentsEditor
        manualId={manual.id}
        sectionId={section.id}
        linked={section.documents}
        catalog={catalog}
      />

      <SectionItemsEditor
        sectionId={section.id}
        kind="STEP"
        items={section.items}
        title="Qué tenemos que hacer, paso a paso"
        description="Los pasos que la empresa irá marcando conforme los completa."
        placeholder="La Alta Dirección encabeza el ejercicio…"
      />

      <SectionRequirementsEditor
        sectionId={section.id}
        requirements={section.requirements}
        evaluations={evaluations}
      />

      <SectionItemsEditor
        sectionId={section.id}
        kind="SELF_CHECK"
        items={section.items}
        title="Qué debemos obtener — autoevaluación"
        description="La comprobación que hace la empresa antes de dar la sección por cerrada."
        placeholder="Identificamos al menos 3 fortalezas y 3 debilidades reales…"
      />
    </div>
  );
}
