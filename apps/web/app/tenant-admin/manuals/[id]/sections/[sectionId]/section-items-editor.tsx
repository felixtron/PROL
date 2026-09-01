"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { ManualItemKind } from "@prol/db";
import { createSectionItem, deleteSectionItem } from "@/lib/actions/manual";

export interface SectionItemRow {
  id: string;
  kind: ManualItemKind;
  text: string;
  helpText: string | null;
  position: number;
}

/**
 * Editor de uno de los dos checklists de la sección.
 *
 * Borrar un ítem se lleva por cascada lo que las empresas hubieran marcado en
 * él; editar el texto no, porque el estado apunta al id. Por eso conviene
 * corregir la redacción en vez de borrar y recrear.
 */
export function SectionItemsEditor({
  sectionId,
  kind,
  items,
  title,
  description,
  placeholder,
}: {
  sectionId: string;
  kind: ManualItemKind;
  items: SectionItemRow[];
  title: string;
  description: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const own = items.filter((i) => i.kind === kind);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createSectionItem({ sectionId, kind, text });
        setText("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo agregar");
      }
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-base font-semibold text-text-primary">
          {title}
        </h2>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {own.length === 0 ? (
          <p className="p-4 text-sm text-text-tertiary">Sin ítems todavía.</p>
        ) : (
          own.map((item, index) => (
            <div key={item.id} className="flex items-start gap-3 p-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-medium text-text-secondary">
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 text-sm text-text-primary">{item.text}</p>
              <button
                type="button"
                aria-label="Eliminar ítem"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteSectionItem(item.id);
                    router.refresh();
                  })
                }
                className="rounded p-1 text-text-tertiary transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <form onSubmit={handleAdd} className="flex flex-wrap items-start gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="min-w-[260px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Agregar
        </button>
      </form>
    </section>
  );
}
