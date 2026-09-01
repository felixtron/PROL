"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { requestEvidenceDeletion } from "@/lib/actions/evidence";

/**
 * Solicitud de baja de una evidencia.
 *
 * El líder solicita; nunca borra. El texto del botón lo dice explícitamente
 * para que nadie espere que la evidencia desaparezca al pulsarlo: quien
 * resuelve es el administrador, y aun aprobada la baja es lógica.
 */
export function DeletionRequest({
  evidenceId,
  requested,
}: {
  evidenceId: string;
  requested: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (requested) {
    return (
      <span className="text-xs text-amber-700">Baja solicitada</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-rose-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Solicitar eliminación
      </button>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await requestEvidenceDeletion({ evidenceId, reason });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="w-full space-y-2 rounded-lg border border-border bg-surface-secondary p-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Motivo de la baja (lo verá el administrador)"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Enviar solicitud
        </button>
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
