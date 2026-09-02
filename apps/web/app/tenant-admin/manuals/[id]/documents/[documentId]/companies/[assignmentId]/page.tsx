import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@prol/db";
import { requireAssignmentManageAccess } from "@/lib/manual-access";
import { getCompanyDocumentForEdit } from "@/lib/queries/manual-document";
import { DocumentBodyEditor, DOCUMENT_BODY_HELP_TEXT } from "../../document-body-editor";

export const dynamic = "force-dynamic";

export default async function CompanyDocumentDraftPage({
  params,
}: {
  params: Promise<{ id: string; documentId: string; assignmentId: string }>;
}) {
  const { id, documentId, assignmentId } = await params;

  const assignment = await requireAssignmentManageAccess(assignmentId)
    .then((ctx) => ctx.assignment)
    .catch(() => null);
  if (!assignment || assignment.manualId !== id) notFound();

  // El borrador vigente de este (documento, empresa). Si no existe, no se
  // crea uno por sorpresa: abrir un borrador es la acción explícita del
  // botón "Editar" del panel de empresas, no un efecto de navegar aquí.
  const draft = await db.companyDocument.findFirst({
    where: { documentId, companyId: assignment.companyId, status: "BORRADOR" },
    select: { id: true },
  });
  if (!draft) redirect(`/tenant-admin/manuals/${id}/documents/${documentId}`);

  const data = await getCompanyDocumentForEdit(draft.id).catch(() => null);
  if (!data) notFound();

  const { identity, contentHtml, history } = data;
  // Precarga la descripción del cambio de esta misma versión, si ya se
  // guardó una: "—" es el marcador de "sin descripción" de buildHistoryEntry,
  // no un valor real que deba aparecer en el campo de edición.
  const currentNotes = history.find((h) => h.version === identity.version)?.change;
  const initialNotes = currentNotes && currentNotes !== "—" ? currentNotes : "";

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
      <div>
        <Link
          href={`/tenant-admin/manuals/${id}/documents/${documentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {identity.name}
        </Link>
        <p className="mt-3 text-xs uppercase tracking-wide text-text-tertiary">
          {identity.companyName}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary">
          {identity.name}
        </h1>
        <p className="font-mono text-xs text-text-tertiary">{identity.code}</p>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${identity.statusClass}`}
          >
            {identity.statusLabel} v{identity.version}
          </span>
          {identity.outdatedLabel ? (
            <span className="text-xs font-medium text-amber-700">{identity.outdatedLabel}</span>
          ) : null}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Cuerpo del borrador
        </h2>
        <DocumentBodyEditor
          target={{
            kind: "company",
            companyDocumentId: draft.id,
            version: identity.version,
            initialNotes,
          }}
          initialHtml={contentHtml}
          canImport={false}
          helpText={DOCUMENT_BODY_HELP_TEXT}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Historial de control de cambios
        </h2>
        <p className="text-sm text-text-secondary">
          El mismo historial que verá el cliente en su visor — nada distinto
          para el consultor, salvo el borrador en curso.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-text-tertiary">
              <tr>
                <th className="px-3 py-2 text-left">Versión</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Autor</th>
                <th className="px-3 py-2 text-left">Descripción del cambio</th>
                <th className="px-3 py-2 text-left">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2">v{h.version}</td>
                  <td className="px-3 py-2">{h.date}</td>
                  <td className="px-3 py-2">{h.author}</td>
                  <td className="px-3 py-2">{h.change}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${h.statusClass}`}
                    >
                      {h.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
