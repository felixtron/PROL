import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCompanyDocumentForClient } from "@/lib/queries/manual-document";
import { DocumentIdentityHeader } from "@/components/document-identity-header";
import { DocumentChangeLog } from "@/components/document-change-log";
import { ManualContent } from "@/components/manual-content";

export const dynamic = "force-dynamic";

/**
 * Visor del documento nativo de la empresa: identidad resuelta, el cuerpo
 * CONGELADO al emitir, y la tabla de control de cambios.
 * `getCompanyDocumentForClient` ya excluye borradores del historial y
 * autoriza con `requireAssignmentMemberAccess`; esta vista no reintroduce
 * ninguno de los dos.
 */
export default async function CompanyDocumentPage({
  params,
}: {
  params: Promise<{ companyDocumentId: string }>;
}) {
  const { companyDocumentId } = await params;
  // El `catch` cubre tanto "no existe" como "es de otra empresa"
  // (`requireAssignmentMemberAccess` lanza en ese caso): un 404 dice menos
  // que un 403 sobre qué documentos existen.
  const data = await getCompanyDocumentForClient(companyDocumentId).catch(
    () => null,
  );
  if (!data) notFound();

  const { identity, contentHtml, assignmentId, history } = data;

  // Una fila kind === "FILE" no tiene visor propio: sólo se descarga. Evita
  // una página vacía para una fila que sólo tiene archivo.
  if (identity.kind === "FILE") {
    redirect(`/files/company-document/${companyDocumentId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="space-y-1 text-sm">
        <Link
          href="/dashboard/documents"
          className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Documentos
        </Link>
        <div>
          <Link
            href={`/dashboard/manuals/${assignmentId}`}
            className="text-xs text-text-tertiary hover:text-text-primary"
          >
            Ver en el manual
          </Link>
        </div>
      </div>

      <DocumentIdentityHeader identity={identity} />

      {/* Este cuerpo es el CONGELADO al emitir (CompanyDocument.contentHtml),
          nunca el de la plantilla actual: es la línea que hace cierto DOC-03
          y no se ve en el código si no se dice. */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <ManualContent html={contentHtml} />
      </div>

      <DocumentChangeLog history={history} />
    </div>
  );
}
