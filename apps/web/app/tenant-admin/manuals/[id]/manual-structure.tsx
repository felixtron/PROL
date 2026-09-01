"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import {
  createChapter,
  createSection,
  deleteChapter,
  deleteSection,
} from "@/lib/actions/manual";

export interface StructureSection {
  id: string;
  code: string | null;
  title: string;
  position: number;
  _count: { items: number; requirements: number; documents: number };
}

export interface StructureChapter {
  id: string;
  title: string;
  position: number;
  parentChapterId: string | null;
  sections: StructureSection[];
}

/**
 * Árbol de capítulos y secciones del manual.
 *
 * Las altas son inline (un input que aparece donde toca) en vez de diálogos:
 * cargar sesenta secciones es trabajo repetitivo y cada modal de por medio lo
 * hace más lento.
 */
export function ManualStructure({
  manualId,
  chapters,
}: {
  manualId: string;
  chapters: StructureChapter[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newChapter, setNewChapter] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const roots = chapters.filter((c) => !c.parentChapterId);
  const childrenOf = (id: string) =>
    chapters.filter((c) => c.parentChapterId === id);

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
    <div className="space-y-4">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {roots.map((chapter) => (
        <div
          key={chapter.id}
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-secondary px-4 py-2.5">
            <h3 className="text-sm font-semibold text-text-primary">
              {chapter.title}
            </h3>
            <button
              type="button"
              aria-label="Eliminar capítulo"
              onClick={() => run(() => deleteChapter(chapter.id))}
              className="rounded p-1 text-text-tertiary transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <SectionRows
            manualId={manualId}
            sections={chapter.sections}
            onDelete={(id) => run(() => deleteSection(id))}
          />

          {childrenOf(chapter.id).map((sub) => (
            <div key={sub.id}>
              <div className="flex items-center justify-between gap-3 border-y border-border bg-surface-secondary/60 px-4 py-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {sub.title}
                </h4>
                <div className="flex items-center gap-1">
                  <AddSection
                    chapterId={sub.id}
                    manualId={manualId}
                    open={addingTo === sub.id}
                    onOpen={() => setAddingTo(sub.id)}
                    onClose={() => setAddingTo(null)}
                  />
                  <button
                    type="button"
                    aria-label="Eliminar subcapítulo"
                    onClick={() => run(() => deleteChapter(sub.id))}
                    className="rounded p-1 text-text-tertiary transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <SectionRows
                manualId={manualId}
                sections={sub.sections}
                onDelete={(id) => run(() => deleteSection(id))}
              />
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5">
            <AddSection
              chapterId={chapter.id}
              manualId={manualId}
              open={addingTo === chapter.id}
              onOpen={() => setAddingTo(chapter.id)}
              onClose={() => setAddingTo(null)}
            />
            <AddSubChapter manualId={manualId} parentChapterId={chapter.id} />
          </div>
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newChapter.trim()) return;
          run(async () => {
            const result = await createChapter({ manualId, title: newChapter });
            setNewChapter("");
            return result;
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
          placeholder="Nuevo capítulo (p. ej. I. Planificación)"
          className="min-w-[240px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending || !newChapter.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Agregar capítulo
        </button>
      </form>
    </div>
  );
}

function SectionRows({
  manualId,
  sections,
  onDelete,
}: {
  manualId: string;
  sections: StructureSection[];
  onDelete: (id: string) => void;
}) {
  if (sections.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-text-tertiary">
        Sin secciones todavía.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {sections.map((s) => (
        <li key={s.id} className="flex items-center gap-2 px-4 py-2.5">
          <Link
            href={`/tenant-admin/manuals/${manualId}/sections/${s.id}`}
            className="group flex min-w-0 flex-1 items-center justify-between gap-3"
          >
            <span className="truncate text-sm text-text-primary group-hover:text-primary-600">
              {s.code ? (
                <span className="font-medium text-text-secondary">{s.code} </span>
              ) : null}
              {s.title}
            </span>
            <span className="flex shrink-0 items-center gap-3 text-xs text-text-tertiary">
              <span>{s._count.items} ítems</span>
              <span>{s._count.documents} docs</span>
              <span>{s._count.requirements} evidencias</span>
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
          <button
            type="button"
            aria-label="Eliminar sección"
            onClick={() => onDelete(s.id)}
            className="rounded p-1 text-text-tertiary transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function AddSection({
  chapterId,
  manualId,
  open,
  onOpen,
  onClose,
}: {
  chapterId: string;
  manualId: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Sección
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const result = await createSection({ chapterId, title, code });
          setCode("");
          setTitle("");
          onClose();
          if (result.success) {
            router.push(`/tenant-admin/manuals/${manualId}/sections/${result.sectionId}`);
          }
        });
      }}
      className="flex w-full flex-wrap items-center gap-2"
    >
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="4.1"
        className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        placeholder="Título de la sección"
        className="min-w-[200px] flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending || !title.trim()}
        className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {isPending ? "Creando…" : "Crear y editar"}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="text-xs text-text-secondary hover:text-text-primary"
      >
        Cancelar
      </button>
    </form>
  );
}

function AddSubChapter({
  manualId,
  parentChapterId,
}: {
  manualId: string;
  parentChapterId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Subcapítulo
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          await createChapter({ manualId, title, parentChapterId });
          setTitle("");
          setOpen(false);
          router.refresh();
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        placeholder="Título del subcapítulo"
        className="min-w-[200px] rounded-lg border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending || !title.trim()}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-secondary disabled:opacity-60"
      >
        {isPending ? "Creando…" : "Crear"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-text-secondary hover:text-text-primary"
      >
        Cancelar
      </button>
    </form>
  );
}
