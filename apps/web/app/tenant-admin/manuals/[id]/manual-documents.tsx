"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import {
  createManualDocument,
  deleteManualDocument,
  updateManualDocument,
} from "@/lib/actions/manual";
import { MAX_FILE_SIZE, TEMPLATE_ACCEPT } from "@/lib/document-files";

export interface ManualDocumentRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  baseFileName: string | null;
  baseFileSize: number | null;
  _count: { sections: number; companyDocuments: number };
}

async function uploadTemplate(file: File): Promise<
  | { ok: true; file: { fileKey: string; fileName: string; fileSize: number; mimeType: string } }
  | { ok: false; error: string }
> {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "El archivo supera los 25MB" };
  }
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/upload/document-template", { method: "POST", body });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error ?? "No se pudo subir" };
  return { ok: true, file: data };
}

/**
 * Catálogo de documentos del manual, con su código y su plantilla base.
 *
 * El catálogo es del manual y no de cada sección porque el mismo procedimiento
 * se referencia desde varias cláusulas: así la versión que se personaliza para
 * una empresa es una sola, y no varias copias que acaban divergiendo.
 */
export function ManualDocuments({
  manualId,
  documents,
}: {
  manualId: string;
  documents: ManualDocumentRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createManualDocument({
        manualId,
        code,
        name,
        description,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCode("");
      setName("");
      setDescription("");
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {documents.length === 0 ? (
          <p className="p-4 text-sm text-text-tertiary">
            Todavía no hay documentos en el catálogo.
          </p>
        ) : (
          documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} onError={setError} />
          ))
        )}
      </div>

      {adding ? (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-border bg-surface p-4"
        >
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="P-RFC-4.1-01"
              className="w-44 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Nombre del documento"
              className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Para qué sirve (opcional)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending || !code.trim() || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear documento
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
        >
          <Plus className="h-4 w-4" />
          Agregar documento
        </button>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  onError,
}: {
  doc: ManualDocumentRow;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(file: File) {
    onError(null);
    startTransition(async () => {
      const uploaded = await uploadTemplate(file);
      if (!uploaded.ok) {
        onError(uploaded.error);
        return;
      }
      const result = await updateManualDocument({
        documentId: doc.id,
        code: doc.code,
        name: doc.name,
        description: doc.description ?? undefined,
        file: uploaded.file,
      });
      if (!result.success) {
        onError(result.error);
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary">{doc.name}</p>
        <p className="font-mono text-xs text-text-tertiary">{doc.code}</p>
        {doc.description ? (
          <p className="mt-1 text-sm text-text-secondary">{doc.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-text-tertiary">
          Enlazado en {doc._count.sections}{" "}
          {doc._count.sections === 1 ? "sección" : "secciones"} ·{" "}
          {doc._count.companyDocuments}{" "}
          {doc._count.companyDocuments === 1
            ? "versión de empresa"
            : "versiones de empresa"}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {doc.baseFileName ? (
          <a
            href={`/files/manual-document/${doc.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            <Download className="h-3.5 w-3.5" />
            {doc.baseFileName}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
            <FileText className="h-3.5 w-3.5" />
            Sin plantilla base
          </span>
        )}
        <label className="cursor-pointer text-xs font-medium text-text-secondary hover:text-text-primary">
          {doc.baseFileName ? "Reemplazar plantilla" : "Subir plantilla"}
          <input
            ref={inputRef}
            type="file"
            accept={TEMPLATE_ACCEPT}
            className="hidden"
            disabled={isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </label>
        <button
          type="button"
          aria-label="Eliminar documento"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteManualDocument(doc.id);
              if (!result.success) {
                onError(result.error);
                return;
              }
              router.refresh();
            })
          }
          className="rounded p-1 text-text-tertiary transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
