"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  MessageSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { EvidenceStatus } from "@prol/db";
import {
  approveEvidence,
  commentEvidence,
  requestEvidenceCorrection,
  resolveEvidenceDeletion,
  startEvidenceReview,
} from "@/lib/actions/evidence";

interface EvidenceReviewActionsProps {
  evidenceId: string;
  status: EvidenceStatus;
  deletionRequested: boolean;
  /** Sólo el administrador resuelve una solicitud de eliminación. */
  canResolveDeletion: boolean;
}

type Mode = "none" | "approve" | "correction" | "comment";

/**
 * Acciones del consultor sobre una evidencia.
 *
 * "Requiere corrección" abre siempre el cuadro de comentario y no deja
 * enviarlo vacío: devolver una evidencia sin decir qué falla es la forma más
 * rápida de alargar un ciclo de revisión.
 */
export function EvidenceReviewActions({
  evidenceId,
  status,
  deletionRequested,
  canResolveDeletion,
}: EvidenceReviewActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("none");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setError(result.error ?? "No se pudo completar la acción");
        return;
      }
      setMode("none");
      setComment("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {deletionRequested ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Hay una solicitud de eliminación pendiente
          </p>
          {canResolveDeletion ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    resolveEvidenceDeletion({ evidenceId, approve: true, comment }),
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Aprobar la baja
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    resolveEvidenceDeletion({ evidenceId, approve: false, comment }),
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                Rechazar
              </button>
            </div>
          ) : (
            <p className="mt-1 text-xs text-amber-800">
              La resuelve un administrador del tenant.
            </p>
          )}
        </div>
      ) : null}

      {mode !== "none" ? (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            autoFocus
            placeholder={
              mode === "correction"
                ? "Explica qué debe corregirse (obligatorio)"
                : "Comentario para el cliente (opcional)"
            }
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (mode === "approve") {
                  run(() => approveEvidence({ evidenceId, comment }));
                } else if (mode === "correction") {
                  run(() => requestEvidenceCorrection({ evidenceId, comment }));
                } else {
                  run(() => commentEvidence({ evidenceId, comment }));
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "approve"
                ? "Confirmar aprobación"
                : mode === "correction"
                  ? "Solicitar corrección"
                  : "Enviar comentario"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("none");
                setError(null);
              }}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status === "PENDING" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => startEvidenceReview(evidenceId))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-60"
            >
              <Eye className="h-4 w-4" />
              Tomar para revisión
            </button>
          ) : null}
          {status !== "APPROVED" ? (
            <>
              <button
                type="button"
                onClick={() => setMode("approve")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => setMode("correction")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-surface px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
              >
                <RotateCcw className="h-4 w-4" />
                Requiere corrección
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setMode("comment")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
          >
            <MessageSquare className="h-4 w-4" />
            Comentar
          </button>
        </div>
      )}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
