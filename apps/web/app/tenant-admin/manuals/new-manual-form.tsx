"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { createManual } from "@/lib/actions/manual";

/** Alta de un manual. Sólo pide lo mínimo; el resto se llena en el editor. */
export function NewManualForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [normaLabel, setNormaLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        <Plus className="h-4 w-4" />
        Nuevo manual
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createManual({ title, normaLabel });
        router.push(`/tenant-admin/manuals/${result.manualId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border bg-surface p-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Título del manual
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          placeholder="Manual de implementación del SGC"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Norma
        </label>
        <input
          type="text"
          value={normaLabel}
          onChange={(e) => setNormaLabel(e.target.value)}
          placeholder="ISO 9001:2015"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
        />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Crear
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
