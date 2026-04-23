"use client";

import { useState, useEffect, useTransition } from "react";
import {
  ClipboardList,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
  X,
} from "lucide-react";
import { submitAssignment } from "@/lib/actions/assignment";

interface AssignmentContent {
  instructions?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  dueAt?: string | null;
}

interface Submission {
  id: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  notes: string | null;
  status: "SUBMITTED" | "REVIEWED" | "RETURNED";
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

interface AssignmentPlayerProps {
  enrollmentId: string;
  lessonId: string;
  content: unknown;
}

function readContent(content: unknown): AssignmentContent {
  if (content && typeof content === "object") {
    return content as AssignmentContent;
  }
  return {};
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssignmentPlayer({
  enrollmentId,
  lessonId,
  content,
}: AssignmentPlayerProps) {
  const data = readContent(content);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assignments/${lessonId}?enrollmentId=${enrollmentId}`)
      .then((r) => r.json())
      .then((d: { submission: Submission | null }) => {
        if (cancelled) return;
        setSubmission(d.submission);
        if (d.submission) setNotes(d.submission.notes ?? "");
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [enrollmentId, lessonId]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/assignment", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Error al subir");
      }
      const d = (await res.json()) as {
        url: string;
        filename: string;
        sizeBytes: number;
      };
      setFileUrl(d.url);
      setFileName(d.filename);
      setFileSize(d.sizeBytes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fileUrl && !notes.trim()) {
      setError("Sube un archivo o escribe una respuesta");
      return;
    }
    startTransition(async () => {
      try {
        await submitAssignment(enrollmentId, lessonId, {
          fileUrl: fileUrl ?? undefined,
          fileName: fileName ?? undefined,
          fileSize: fileSize ?? undefined,
          notes: notes ?? undefined,
        });
        // Reload submission
        const res = await fetch(
          `/api/assignments/${lessonId}?enrollmentId=${enrollmentId}`
        );
        const d = (await res.json()) as { submission: Submission | null };
        setSubmission(d.submission);
        setFileUrl(null);
        setFileName(null);
        setFileSize(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar");
      }
    });
  }

  const dueAtDate = data.dueAt ? new Date(data.dueAt) : null;
  const isOverdue = dueAtDate ? dueAtDate < new Date() : false;
  const isSubmitted = !!submission;
  const isReviewed = submission?.status === "REVIEWED";

  return (
    <div className="space-y-4">
      {/* Instructions card */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-600" />
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Instrucciones de la tarea
          </h3>
        </div>
        {data.instructions ? (
          <p className="whitespace-pre-wrap text-sm text-text-primary">
            {data.instructions}
          </p>
        ) : (
          <p className="text-sm text-text-tertiary">
            El profesor aún no ha configurado las instrucciones.
          </p>
        )}

        {data.fileUrl && (
          <a
            href={data.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm font-medium text-text-primary hover:bg-primary-50 hover:text-primary-700"
          >
            <Download className="h-4 w-4" />
            Descargar instrucciones ({data.fileName ?? "PDF"})
          </a>
        )}

        {dueAtDate && (
          <div
            className={`mt-3 inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-medium ${
              isOverdue
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <Clock className="h-3 w-3" />
            {isOverdue ? "Vencida el " : "Fecha límite: "}
            {formatDate(dueAtDate)}
          </div>
        )}
      </div>

      {/* Submission status */}
      {!loading && submission && (
        <div
          className={`rounded-xl border p-5 ${
            isReviewed
              ? "border-emerald-200 bg-emerald-50"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2
              className={`h-5 w-5 ${isReviewed ? "text-emerald-700" : "text-blue-700"}`}
            />
            <h3 className="font-heading text-base font-semibold text-text-primary">
              {isReviewed ? "Tarea revisada" : "Tarea enviada"}
            </h3>
          </div>
          <p className="text-xs text-text-secondary">
            Enviado el {formatDate(submission.submittedAt)}
          </p>
          {submission.fileUrl && (
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              {submission.fileName ?? "Ver entrega"}
              {submission.fileSize ? ` · ${formatBytes(submission.fileSize)}` : ""}
            </a>
          )}
          {submission.notes && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-primary">
              <span className="text-xs font-medium text-text-tertiary">
                Notas:
              </span>{" "}
              {submission.notes}
            </p>
          )}
          {isReviewed && (
            <div className="mt-4 border-t border-emerald-200 pt-3">
              {submission.grade !== null && (
                <p className="text-sm font-semibold text-emerald-800">
                  Calificación: {submission.grade}/100
                </p>
              )}
              {submission.feedback && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
                  <span className="text-xs font-medium text-text-tertiary">
                    Comentarios:
                  </span>{" "}
                  {submission.feedback}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submission form (allow re-submission) */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border bg-surface p-5"
      >
        <h3 className="font-heading text-base font-semibold text-text-primary">
          {isSubmitted ? "Volver a enviar" : "Enviar tu respuesta"}
        </h3>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Archivo (opcional)
          </label>
          <p className="mb-2 text-xs text-text-tertiary">
            PDF, imagen, Word, Excel, PowerPoint, ZIP o TXT. Máximo 25MB.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-secondary">
              <input
                type="file"
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
                  {fileUrl ? "Cambiar archivo" : "Seleccionar archivo"}
                </>
              )}
            </label>
            {fileUrl && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <FileText className="h-3.5 w-3.5" />
                  {fileName} · {formatBytes(fileSize)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFileUrl(null);
                    setFileName(null);
                    setFileSize(null);
                  }}
                  className="inline-flex items-center text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Comentarios para el profesor, contexto, links, etc."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || uploading || (!fileUrl && !notes.trim())}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending
              ? "Enviando..."
              : isSubmitted
                ? "Reemplazar entrega"
                : "Enviar entrega"}
          </button>
        </div>
      </form>
    </div>
  );
}
