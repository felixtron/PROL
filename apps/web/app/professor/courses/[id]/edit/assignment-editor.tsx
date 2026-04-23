"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, Check, FileText, ClipboardList } from "lucide-react";
import { updateAssignment } from "@/lib/actions/assignment";

interface AssignmentEditorProps {
  lessonId: string;
  initialContent: {
    instructions: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    dueAt?: string | null;
  } | null;
}

export function AssignmentEditor({
  lessonId,
  initialContent,
}: AssignmentEditorProps) {
  const router = useRouter();
  const [instructions, setInstructions] = useState(
    initialContent?.instructions ?? ""
  );
  const [fileUrl, setFileUrl] = useState<string | null>(
    initialContent?.fileUrl ?? null
  );
  const [fileName, setFileName] = useState<string | null>(
    initialContent?.fileName ?? null
  );
  const [fileSize, setFileSize] = useState<number | null>(
    initialContent?.fileSize ?? null
  );
  const [dueAt, setDueAt] = useState<string>(initialContent?.dueAt ?? "");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("El PDF debe pesar menos de 10MB");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/pdf", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Error al subir");
      }
      const data = (await res.json()) as {
        url: string;
        filename: string;
        sizeBytes: number;
      };
      setFileUrl(data.url);
      setFileName(data.filename);
      setFileSize(data.sizeBytes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateAssignment(lessonId, {
          instructions,
          fileUrl,
          fileName,
          fileSize,
          dueAt: dueAt || null,
        });
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-primary-200 bg-primary-50/30 p-4"
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary-600" />
        <h3 className="font-heading text-base font-semibold text-text-primary">
          Configurar tarea
        </h3>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-700">
          <Check className="h-4 w-4" /> Tarea guardada
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Instrucciones
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          required
          minLength={10}
          rows={6}
          placeholder="Describe lo que el alumno debe hacer y entregar..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Documento de instrucciones (opcional)
        </label>
        <p className="mb-2 text-xs text-text-tertiary">
          PDF con la guía detallada, plantilla a llenar, etc.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-secondary">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFile}
              className="hidden"
            />
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {fileUrl ? "Cambiar PDF" : "Subir PDF"}
              </>
            )}
          </label>
          {fileUrl && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <FileText className="h-3.5 w-3.5" />
                {fileName ?? "Documento"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFileUrl(null);
                  setFileName(null);
                  setFileSize(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3" />
                Quitar
              </button>
            </>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Fecha límite (opcional)
        </label>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Guardando..." : "Guardar tarea"}
        </button>
      </div>
    </form>
  );
}
