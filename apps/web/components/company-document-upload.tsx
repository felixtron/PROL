"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { uploadCompanyDocument } from "@/lib/actions/manual";
import { MAX_FILE_SIZE, TEMPLATE_ACCEPT } from "@/lib/document-files";

/**
 * Sube la versión personalizada de un documento para una empresa (con su logo,
 * su razón social y su código documental).
 *
 * Cada subida crea una versión nueva; la anterior no se pisa. Por eso el botón
 * dice "Subir versión" y no "Reemplazar".
 */
export function CompanyDocumentUpload({
  assignmentId,
  documentId,
  currentVersion,
}: {
  assignmentId: string;
  documentId: string;
  currentVersion: number | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_FILE_SIZE) {
      setError("El archivo supera los 25MB");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload/document-template", {
      method: "POST",
      body,
    });
    const uploaded = await res.json();
    if (!res.ok) {
      setError(uploaded.error ?? "No se pudo subir el archivo");
      return;
    }

    const result = await uploadCompanyDocument({
      assignmentId,
      documentId,
      file: uploaded,
      codeOverride: code,
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setCode("");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
      >
        <Upload className="h-3.5 w-3.5" />
        {currentVersion ? `Subir versión ${currentVersion + 1}` : "Subir versión de la empresa"}
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-lg border border-border bg-surface-secondary p-3">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Código documental de la empresa (opcional)"
        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
      />
      <input
        ref={inputRef}
        type="file"
        accept={TEMPLATE_ACCEPT}
        disabled={isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) startTransition(() => handleFile(file));
        }}
        className="w-full text-xs text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-primary-700"
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <div className="flex items-center gap-2">
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-text-tertiary" />
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-text-secondary hover:text-text-primary"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
