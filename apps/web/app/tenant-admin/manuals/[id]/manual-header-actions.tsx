"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, Loader2, Send, Undo2 } from "lucide-react";
import { publishManual, setManualStatus } from "@/lib/actions/manual";

/** Publicar / despublicar / archivar un manual. */
export function ManualHeaderActions({
  manualId,
  status,
}: {
  manualId: string;
  status: string;
}) {
  const router = useRouter();
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
      router.refresh();
    });
  }

  return (
    <div className="text-right">
      <div className="flex flex-wrap items-center gap-2">
        {status !== "PUBLISHED" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => publishManual(manualId))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publicar
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => setManualStatus(manualId, "DRAFT"))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-60"
          >
            <Undo2 className="h-4 w-4" />
            Volver a borrador
          </button>
        )}
        {status !== "ARCHIVED" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => setManualStatus(manualId, "ARCHIVED"))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-60"
          >
            <Archive className="h-4 w-4" />
            Archivar
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
