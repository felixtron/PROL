"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link2, Loader2, X } from "lucide-react";
import {
  linkDocumentToSection,
  unlinkDocumentFromSection,
} from "@/lib/actions/manual";

export interface LinkedDocument {
  documentId: string;
  note: string | null;
  document: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    baseFileName: string | null;
  };
}

/**
 * Documentos que se usan en esta sección.
 *
 * Se eligen del catálogo del manual en vez de crearse aquí: el mismo
 * procedimiento suele citarse desde varias cláusulas, y duplicarlo obligaría a
 * personalizar el mismo archivo dos veces por empresa.
 */
export function SectionDocumentsEditor({
  manualId,
  sectionId,
  linked,
  catalog,
}: {
  manualId: string;
  sectionId: string;
  linked: LinkedDocument[];
  catalog: Array<{ id: string; code: string; name: string }>;
}) {
  const router = useRouter();
  const [documentId, setDocumentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const linkedIds = new Set(linked.map((l) => l.documentId));
  const available = catalog.filter((d) => !linkedIds.has(d.id));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Documentos que utilizamos
        </h2>
        <p className="text-sm text-text-secondary">
          Elige del{" "}
          <Link
            href={`/tenant-admin/manuals/${manualId}`}
            className="text-primary-600 hover:text-primary-700"
          >
            catálogo del manual
          </Link>
          . Si falta uno, créalo ahí primero.
        </p>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {linked.length === 0 ? (
          <p className="p-4 text-sm text-text-tertiary">
            Esta sección no usa ningún documento.
          </p>
        ) : (
          linked.map((l) => (
            <div key={l.documentId} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary">{l.document.name}</p>
                <p className="font-mono text-xs text-text-tertiary">
                  {l.document.code}
                </p>
                {l.document.description ? (
                  <p className="mt-1 text-sm text-text-secondary">
                    {l.document.description}
                  </p>
                ) : null}
                {!l.document.baseFileName ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Sin plantilla base: el cliente no podrá descargar nada hasta
                    que se suba una versión.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Quitar de la sección"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await unlinkDocumentFromSection({
                      sectionId,
                      documentId: l.documentId,
                    });
                    router.refresh();
                  })
                }
                className="rounded p-1 text-text-tertiary transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {available.length > 0 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!documentId) return;
            setError(null);
            startTransition(async () => {
              try {
                await linkDocumentToSection({ sectionId, documentId });
                setDocumentId("");
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "No se pudo enlazar");
              }
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <select
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="min-w-[240px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
          >
            <option value="">Selecciona un documento del catálogo</option>
            {available.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending || !documentId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Enlazar
          </button>
        </form>
      ) : catalog.length > 0 ? (
        <p className="text-xs text-text-tertiary">
          Todos los documentos del catálogo ya están enlazados aquí.
        </p>
      ) : null}
    </section>
  );
}
