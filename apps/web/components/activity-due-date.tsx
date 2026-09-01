"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { setActivityDueDate } from "@/lib/actions/manual";

/**
 * Fija la fecha comprometida de una actividad.
 *
 * Cambiarla reinicia los recordatorios de ese tramo: si se aplaza un mes, los
 * avisos vuelven a salir cuando toque, en vez de darse por consumidos.
 */
export function ActivityDueDate({
  activityId,
  dueAt,
  disabled,
}: {
  activityId: string;
  dueAt: Date | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(
    dueAt ? new Date(dueAt).toISOString().slice(0, 10) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    setValue(next);
    setError(null);
    startTransition(async () => {
      try {
        await setActivityDueDate({ activityId, dueAt: next || null });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
      <input
        type="date"
        value={value}
        disabled={disabled || isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary focus:border-primary-400 focus:outline-none disabled:opacity-60"
      />
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-text-tertiary" />
      ) : null}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
