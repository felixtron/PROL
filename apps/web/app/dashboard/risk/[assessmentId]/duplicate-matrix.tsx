"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { duplicateRiskMatrix } from "@/lib/actions/risk";

/**
 * Duplica una matriz enviada para trabajar el siguiente periodo.
 *
 * Es el camino normal en una revisión semestral o anual: se parte de lo que ya
 * había identificado la organización y se actualiza, en vez de empezar de cero.
 */
export function DuplicateMatrix({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateRiskMatrix({ assessmentId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/risk/${result.assessmentId}`);
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        Duplicar para el siguiente periodo
      </button>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
