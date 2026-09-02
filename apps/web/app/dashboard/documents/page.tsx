import Link from "next/link";
import { Download, FileCheck2 } from "lucide-react";
import {
  DOCUMENT_STATUS_CLASS,
  DOCUMENT_STATUS_LABEL,
  ISSUED_AT_FORMAT,
} from "@/lib/documents/document-identity";
import { listCompanyDocumentsForClient } from "@/lib/queries/manual-document";

export const dynamic = "force-dynamic";

/**
 * Lista maestra del expediente vigente de la empresa del usuario:
 * procedimientos, registros y archivos que su consultor ha emitido.
 * `listCompanyDocumentsForClient` ya filtra por `status: "VIGENTE"` — cada
 * fila que llega aquí es, por definición, la vigente, así que la insignia de
 * estatus es siempre la misma y no depende de un campo por fila.
 */
export default async function CompanyDocumentsPage() {
  const documents = await listCompanyDocumentsForClient();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Documentos
        </h1>
        <p className="mt-1 text-text-secondary">
          El expediente vigente de tu empresa: procedimientos y archivos que
          tu consultor ha emitido.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <FileCheck2 className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            Todavía no hay documentos emitidos para tu empresa.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {documents.map((doc) => {
            const isFile = doc.kind === "FILE";
            const className =
              "flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary";
            const inner = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-text-tertiary">
                    {doc.code}
                  </p>
                  <p className="truncate text-sm font-medium text-text-primary">
                    {doc.name}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    {doc.manualTitle}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      Versión {doc.version}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_STATUS_CLASS.VIGENTE}`}
                    >
                      {DOCUMENT_STATUS_LABEL.VIGENTE}
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary">
                    {ISSUED_AT_FORMAT.format(doc.updatedAt)}
                  </p>
                  {doc.isOutdated ? (
                    <p className="text-xs font-medium text-amber-700">
                      Hay una versión más reciente
                    </p>
                  ) : null}
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700">
                    {isFile ? (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        {doc.fileName ?? "Descargar"}
                      </>
                    ) : (
                      "Ver documento"
                    )}
                  </span>
                </div>
              </>
            );

            return isFile ? (
              <a
                key={doc.id}
                href={`/files/company-document/${doc.id}`}
                className={className}
              >
                {inner}
              </a>
            ) : (
              <Link
                key={doc.id}
                href={`/dashboard/documents/${doc.id}`}
                className={className}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
