import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getManualDocumentForEdit } from "@/lib/queries/manual-document";
import { DOCUMENT_KIND_LABEL } from "@/lib/documents/document-identity";
import { DocumentBodyEditor, DOCUMENT_BODY_HELP_TEXT } from "./document-body-editor";
import { DocumentCompaniesPanel } from "./document-companies-panel";

export const dynamic = "force-dynamic";

export default async function ManualDocumentPage({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>;
}) {
  const { id, documentId } = await params;
  const data = await getManualDocumentForEdit(documentId).catch(() => null);
  // El documento existe pero es de otro manual: sin esta comprobación la ruta
  // aceptaría cualquier combinación [id]/[documentId] y enseñaría un
  // documento bajo unas migas que mienten.
  if (!data || data.manual.id !== id) notFound();

  const { document, manual, sections, companies } = data;
  const hasBody = Boolean(document.contentHtml?.trim());

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
        <p className="mt-3 font-mono text-xs text-text-tertiary">{document.code}</p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary">
          {document.name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {DOCUMENT_KIND_LABEL[document.kind]} · Plantilla v{document.templateVersion}
          {sections.length > 0 ? (
            <>
              {" "}
              · Enlazado en{" "}
              {sections
                .map((s) => (s.code ? `${s.code} — ${s.title}` : s.title))
                .join(", ")}
            </>
          ) : (
            " · Sin enlazar a ninguna sección"
          )}
        </p>
      </div>

      {document.kind === "FILE" && !hasBody ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Este documento hoy es un archivo. Si escribes un cuerpo abajo y lo
          guardas, se convierte en un procedimiento redactado en la
          plataforma: deja de mostrarse como archivo y pasa a tener plantilla
          propia, con versión e importación de <span className="font-mono">.docx</span>.
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Cuerpo del procedimiento
        </h2>
        <DocumentBodyEditor
          target={{ kind: "template", documentId: document.id }}
          initialHtml={document.contentHtml ?? ""}
          canImport
          helpText={
            <>
              <p>{DOCUMENT_BODY_HELP_TEXT}</p>
              <p className="mt-1">
                Al importar un <span className="font-mono">.docx</span>: las
                tablas sobreviven, con filas, columnas, encabezados y celdas
                combinadas. Los bordes, colores y fuentes de Word no se
                conservan, las imágenes incrustadas se descartan (se avisa
                cuántas), y los encabezados se remapean a los niveles que
                admite la plataforma.
              </p>
            </>
          }
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Empresas
          </h2>
          <p className="text-sm text-text-secondary">
            Emite, edita y publica la versión de cada empresa a partir de esta
            plantilla.
          </p>
        </div>
        <DocumentCompaniesPanel
          manualId={id}
          documentId={document.id}
          templateVersion={document.templateVersion}
          hasBody={hasBody}
          companies={companies}
        />
      </section>
    </div>
  );
}
