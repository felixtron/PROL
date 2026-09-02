"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { updateDocumentsMenuLabel } from "@/lib/actions/tenant";
import { DEFAULT_DOCUMENTS_MENU_LABEL } from "@/lib/tenant-labels";

interface DocumentsMenuLabelFormProps {
  initialLabel: string | null;
}

export function DocumentsMenuLabelForm({
  initialLabel,
}: DocumentsMenuLabelFormProps) {
  const router = useRouter();
  const [label, setLabel] = useState(initialLabel ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError("");
    startTransition(async () => {
      try {
        await updateDocumentsMenuLabel(label);
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          Rótulo actualizado
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Nombre del menú
        </label>
        <p className="mb-3 text-xs text-text-tertiary">
          Es el nombre del menú que agrupa Manuales Maestros, Proyectos,
          Evidencias y Agenda. Si lo dejas vacío se usa «
          {DEFAULT_DOCUMENTS_MENU_LABEL}».
        </p>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={DEFAULT_DOCUMENTS_MENU_LABEL}
          maxLength={40}
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
