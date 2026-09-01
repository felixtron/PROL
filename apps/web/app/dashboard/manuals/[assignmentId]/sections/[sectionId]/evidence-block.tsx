"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Download,
  FileUp,
  Loader2,
  MessageSquare,
  Table2,
} from "lucide-react";
import type {
  EvidenceRequirementKind,
  EvidenceStatus,
  EvidencePeriodicity,
} from "@prol/db";
import { submitEvidence } from "@/lib/actions/evidence";
import { openRiskMatrix } from "@/lib/actions/risk";
import {
  EVIDENCE_ACCEPT,
  MAX_FILE_SIZE,
} from "@/lib/document-files";
import {
  EVIDENCE_STATUS_CLASS,
  EVIDENCE_STATUS_LABEL,
  PERIODICITY_LABEL,
  canSubmitEvidence,
} from "@/lib/compliance";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

export interface EvidenceReviewEntry {
  id: string;
  action: string;
  comment: string | null;
  createdAt: Date;
  reviewer: { name: string | null } | null;
}

export interface EvidenceRow {
  id: string;
  version: number;
  status: EvidenceStatus;
  title: string | null;
  notes: string | null;
  fileName: string | null;
  fileSize: number | null;
  submittedAt: Date;
  riskAssessmentId: string | null;
  uploadedBy: { name: string | null } | null;
  reviews: EvidenceReviewEntry[];
}

export interface EvidenceActivity {
  id: string;
  periodLabel: string | null;
  dueAt: Date | null;
  status: string;
  state: string;
  latestEvidence: EvidenceRow | null;
  history: EvidenceRow[];
}

export interface EvidenceRequirementRow {
  id: string;
  name: string;
  description: string | null;
  kind: EvidenceRequirementKind;
  periodicity: EvidencePeriodicity;
  required: boolean;
  evaluationId: string | null;
  evaluation: { id: string; title: string } | null;
}

interface EvidenceBlockProps {
  requirement: EvidenceRequirementRow;
  activity: EvidenceActivity | null;
  readOnly: boolean;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Último comentario de revisión, que es lo que hay que corregir. */
function lastReviewComment(evidence: EvidenceRow | null): EvidenceReviewEntry | null {
  if (!evidence) return null;
  return (
    evidence.reviews.find(
      (r) => r.action === "REQUEST_CORRECTION" || r.action === "COMMENT",
    ) ?? null
  );
}

export function EvidenceBlock({
  requirement,
  activity,
  readOnly,
}: EvidenceBlockProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const latest = activity?.latestEvidence ?? null;
  const canSubmit =
    !readOnly && activity?.status === "OPEN" && canSubmitEvidence(latest?.status);
  const correction = lastReviewComment(latest);

  async function handleFileSubmit(file: File) {
    setError(null);
    if (file.size > MAX_FILE_SIZE) {
      setError("El archivo supera los 25MB");
      return;
    }
    if (!activity) return;

    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload/evidence", { method: "POST", body });
    const uploaded = await res.json();
    if (!res.ok) {
      setError(uploaded.error ?? "No se pudo subir el archivo");
      return;
    }

    const result = await submitEvidence({
      activityId: activity.id,
      notes,
      file: uploaded,
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    setNotes("");
    setShowForm(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  function handleOpenMatrix() {
    if (!activity) return;
    startTransition(async () => {
      const result = await openRiskMatrix({ activityId: activity.id });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/risk/${result.assessmentId}`);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-text-primary">{requirement.name}</h4>
            {!requirement.required ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                Opcional
              </span>
            ) : null}
            {requirement.periodicity !== "ONCE" ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                {PERIODICITY_LABEL[requirement.periodicity]}
              </span>
            ) : null}
          </div>
          {requirement.description ? (
            <p className="mt-1 text-sm text-text-secondary">
              {requirement.description}
            </p>
          ) : null}
        </div>

        {latest ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              EVIDENCE_STATUS_CLASS[latest.status]
            }`}
          >
            {EVIDENCE_STATUS_LABEL[latest.status]}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            Sin entregar
          </span>
        )}
      </div>

      {activity?.dueAt ? (
        <p className="mt-2 text-xs text-text-tertiary">
          {activity.periodLabel ? `Periodo ${activity.periodLabel} · ` : ""}
          Fecha comprometida: {DATE.format(new Date(activity.dueAt))}
          {activity.state === "OVERDUE" ? (
            <span className="ml-1 font-medium text-rose-600">(vencida)</span>
          ) : null}
        </p>
      ) : null}

      {/* Entrega vigente */}
      {latest ? (
        <div className="mt-3 rounded-lg bg-surface-secondary p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-text-primary">
              {latest.fileName ?? latest.title ?? "Captura en plataforma"}
              {latest.fileSize ? (
                <span className="ml-2 text-xs text-text-tertiary">
                  {formatSize(latest.fileSize)}
                </span>
              ) : null}
            </span>
            {latest.fileName ? (
              <a
                href={`/files/evidence/${latest.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar
              </a>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-text-tertiary">
            Versión {latest.version} · subida por{" "}
            {latest.uploadedBy?.name ?? "un miembro"} el{" "}
            {DATE.format(new Date(latest.submittedAt))}
          </p>
          {latest.notes ? (
            <p className="mt-2 text-sm text-text-secondary">{latest.notes}</p>
          ) : null}
        </div>
      ) : null}

      {/* Comentario del revisor */}
      {correction?.comment ? (
        <div
          className={`mt-3 rounded-lg border-l-4 p-3 ${
            latest?.status === "NEEDS_CORRECTION"
              ? "border-rose-400 bg-rose-50"
              : "border-border bg-surface-secondary"
          }`}
        >
          <p className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <MessageSquare className="h-3.5 w-3.5" />
            {correction.reviewer?.name ?? "El consultor"} ·{" "}
            {DATE.format(new Date(correction.createdAt))}
          </p>
          <p className="mt-1 text-sm text-text-primary">{correction.comment}</p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      ) : null}

      {/* Acciones */}
      {canSubmit ? (
        <div className="mt-4">
          {requirement.kind === "RISK_MATRIX" ? (
            <button
              type="button"
              onClick={handleOpenMatrix}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Table2 className="h-4 w-4" />
              )}
              {latest?.status === "NEEDS_CORRECTION"
                ? "Corregir la matriz"
                : "Abrir la matriz de riesgos"}
            </button>
          ) : requirement.kind === "EVALUATION_LINK" ? (
            <div className="text-sm text-text-secondary">
              Esta evidencia se satisface completando{" "}
              {requirement.evaluation ? (
                <Link
                  href="/dashboard/evaluations"
                  className="font-medium text-primary-600 hover:text-primary-700"
                >
                  {requirement.evaluation.title}
                </Link>
              ) : (
                "la evaluación indicada"
              )}
              .
            </div>
          ) : showForm ? (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Nota para el consultor (opcional)"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  accept={EVIDENCE_ACCEPT}
                  disabled={isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) startTransition(() => handleFileSubmit(file));
                  }}
                  className="text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-700"
                />
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-xs text-text-tertiary">
                Word, Excel, PDF, imágenes, audio o video. Hasta 25 MB.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <FileUp className="h-4 w-4" />
              {latest?.status === "NEEDS_CORRECTION"
                ? "Subir corrección"
                : "Subir evidencia"}
            </button>
          )}
        </div>
      ) : latest?.status === "APPROVED" && requirement.periodicity !== "ONCE" ? (
        <p className="mt-3 text-xs text-text-tertiary">
          Aprobada. La siguiente actualización ya está programada en la agenda.
        </p>
      ) : null}

      {/* Historial de versiones */}
      {activity && activity.history.length > 1 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-text-secondary hover:text-text-primary">
            Ver historial ({activity.history.length} versiones)
          </summary>
          <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
            {activity.history.slice(1).map((v) => (
              <li key={v.id} className="text-xs text-text-tertiary">
                Versión {v.version} · {EVIDENCE_STATUS_LABEL[v.status]} ·{" "}
                {DATE.format(new Date(v.submittedAt))}
                {v.fileName ? (
                  <a
                    href={`/files/evidence/${v.id}`}
                    className="ml-2 text-primary-600 hover:text-primary-700"
                  >
                    Descargar
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
