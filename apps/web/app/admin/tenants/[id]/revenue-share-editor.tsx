"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { updateTenantRevenueShare } from "@/lib/actions/admin";

export function RevenueShareEditor({
  tenantId,
  current,
}: {
  tenantId: string;
  current: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(Math.round(current * 100));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSave() {
    setError("");
    if (!Number.isFinite(value) || value < 5 || value > 95) {
      setError("Debe ser entre 5 y 95");
      return;
    }
    startTransition(async () => {
      try {
        await updateTenantRevenueShare(tenantId, value / 100);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-text-primary hover:text-primary-700"
        title="Editar revenue share"
      >
        {Math.round(current * 100)}%
        <Pencil className="h-3 w-3 text-text-tertiary" />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={5}
          max={95}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          autoFocus
          className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-right text-sm font-bold text-text-primary"
        />
        <span className="text-sm font-bold text-text-primary">%</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-md bg-primary-600 p-1 text-white hover:bg-primary-700 disabled:opacity-50"
          title="Guardar"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(Math.round(current * 100));
            setError("");
          }}
          disabled={pending}
          className="rounded-md p-1 text-text-secondary hover:bg-surface-tertiary disabled:opacity-50"
          title="Cancelar"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-700">{error}</p>}
    </div>
  );
}
