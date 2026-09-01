"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, Loader2, Save } from "lucide-react";
import { updateSection } from "@/lib/actions/manual";
import { ManualContent } from "@/components/manual-content";

/**
 * Editor del cuerpo narrativo de la sección.
 *
 * Se pega el HTML del documento maquetado y se guarda; el servidor lo sanea al
 * escribir, así que la vista previa de aquí es aproximada y la definitiva es la
 * que aparece tras guardar. El aviso lo dice para que nadie se sorprenda al ver
 * que sus estilos incrustados desaparecen.
 */
export function SectionContentEditor({
  sectionId,
  initial,
}: {
  sectionId: string;
  initial: {
    title: string;
    code: string | null;
    contentHtml: string;
    estimatedMinutes: number | null;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [code, setCode] = useState(initial.code ?? "");
  const [contentHtml, setContentHtml] = useState(initial.contentHtml);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateSection({
          sectionId,
          title,
          code,
          contentHtml,
          estimatedMinutes: initial.estimatedMinutes,
        });
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Código
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setSaved(false);
            }}
            placeholder="4.1"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
        </div>
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary">
            Contenido (HTML)
          </label>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            <Eye className="h-3.5 w-3.5" />
            {preview ? "Editar" : "Vista previa"}
          </button>
        </div>

        {preview ? (
          <div className="min-h-[320px] rounded-lg border border-border bg-surface p-5">
            <ManualContent html={contentHtml} />
          </div>
        ) : (
          <textarea
            value={contentHtml}
            onChange={(e) => {
              setContentHtml(e.target.value);
              setSaved(false);
            }}
            rows={22}
            spellCheck={false}
            placeholder="<h2>Qué pide la norma</h2><p>…</p>"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
        )}
        <p className="mt-1.5 text-xs text-text-tertiary">
          Se admiten títulos, párrafos, listas, tablas, imágenes y enlaces. Los
          estilos incrustados y los scripts se descartan al guardar: el diseño lo
          pone la plataforma.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {saved && !error ? (
        <p className="text-sm text-emerald-600">Sección guardada.</p>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || !title.trim()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Guardar sección
      </button>
    </div>
  );
}
