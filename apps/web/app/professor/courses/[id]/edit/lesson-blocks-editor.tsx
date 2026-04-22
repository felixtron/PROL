"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  FileText,
  BookOpen,
  HelpCircle,
  Plus,
  X,
  Loader2,
  Link as LinkIcon,
  Upload,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { LessonBlock } from "@prol/shared";
import { parseVimeoUrl } from "@prol/shared";
import {
  addBlockToLesson,
  removeBlock,
  reorderBlocks,
  type NewBlockInput,
} from "@/lib/actions/lesson-blocks";

const blockIcons = {
  video: Video,
  pdf: FileText,
  text: BookOpen,
  quiz: HelpCircle,
} as const;

const blockLabels = {
  video: "Video",
  pdf: "PDF",
  text: "Texto",
  quiz: "Quiz",
} as const;

interface Props {
  lessonId: string;
  initialBlocks: LessonBlock[];
  availableQuizzes: { id: string; title: string }[];
}

export function LessonBlocksEditor({
  lessonId,
  initialBlocks,
  availableQuizzes,
}: Props) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<LessonBlock[]>(initialBlocks);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<"video" | "pdf" | "text" | "quiz" | null>(
    null
  );

  function handleAdd(block: NewBlockInput) {
    setError("");
    startTransition(async () => {
      try {
        const res = await addBlockToLesson(lessonId, block);
        const withId = { ...block, id: res.blockId } as LessonBlock;
        setBlocks((b) => [...b, withId]);
        setAdding(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function handleRemove(blockId: string) {
    if (!confirm("Eliminar este bloque?")) return;
    setError("");
    startTransition(async () => {
      try {
        await removeBlock(lessonId, blockId);
        setBlocks((b) => b.filter((x) => x.id !== blockId));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function handleMove(blockId: string, dir: -1 | 1) {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[newIdx]] = [next[newIdx]!, next[idx]!];
    setBlocks(next);
    startTransition(async () => {
      try {
        await reorderBlocks(lessonId, next.map((b) => b.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
        setBlocks(blocks); // revert
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Existing blocks */}
      {blocks.length > 0 && (
        <ol className="space-y-2">
          {blocks.map((block, i) => {
            const Icon = blockIcons[block.type];
            return (
              <li
                key={block.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMove(block.id, -1)}
                    disabled={i === 0 || pending}
                    className="rounded p-0.5 text-text-tertiary hover:bg-surface-secondary disabled:opacity-30"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(block.id, 1)}
                    disabled={i === blocks.length - 1 || pending}
                    className="rounded p-0.5 text-text-tertiary hover:bg-surface-secondary disabled:opacity-30"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                  <Icon className="h-4 w-4 text-primary-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {blockLabels[block.type]}:{" "}
                    {"title" in block && block.title
                      ? block.title
                      : block.type === "quiz"
                        ? availableQuizzes.find((q) => q.id === block.quizId)?.title ?? "—"
                        : block.type === "pdf"
                          ? block.filename ?? "Archivo PDF"
                          : "(sin titulo)"}
                  </p>
                  {block.type === "text" && (
                    <p className="truncate text-xs text-text-tertiary">
                      {block.content.slice(0, 80)}
                    </p>
                  )}
                  {block.type === "video" && (
                    <p className="truncate text-xs text-text-tertiary">
                      {block.provider} · {block.videoUrl}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(block.id)}
                  disabled={pending}
                  className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {/* Add block */}
      {adding === null ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border p-3">
          <span className="text-xs font-medium text-text-tertiary">Agregar bloque:</span>
          {(["video", "pdf", "text", "quiz"] as const).map((t) => {
            const Icon = blockIcons[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setAdding(t)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-primary-50 hover:text-primary-700"
              >
                <Icon className="h-3.5 w-3.5" />
                <Plus className="h-3 w-3" />
                {blockLabels[t]}
              </button>
            );
          })}
        </div>
      ) : adding === "video" ? (
        <AddVideoBlock onAdd={handleAdd} onCancel={() => setAdding(null)} pending={pending} />
      ) : adding === "pdf" ? (
        <AddPdfBlock onAdd={handleAdd} onCancel={() => setAdding(null)} pending={pending} />
      ) : adding === "text" ? (
        <AddTextBlock onAdd={handleAdd} onCancel={() => setAdding(null)} pending={pending} />
      ) : (
        <AddQuizBlock
          quizzes={availableQuizzes}
          onAdd={handleAdd}
          onCancel={() => setAdding(null)}
          pending={pending}
        />
      )}
    </div>
  );
}

// ─── Add forms ────────────────────────────────────────────────────────────────

function FormShell({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-primary-200 bg-primary-50/50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-1 text-text-tertiary hover:bg-surface"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function AddVideoBlock({
  onAdd,
  onCancel,
  pending,
}: {
  onAdd: (block: NewBlockInput) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseVimeoUrl(url);
    if (!parsed) {
      setError("Pega una URL valida de Vimeo");
      return;
    }
    setError("");
    onAdd({
      type: "video",
      title: title || undefined,
      provider: "VIMEO_URL",
      videoUrl: parsed.videoId,
      videoHash: parsed.hash,
    });
  }

  return (
    <FormShell title="Agregar video (Vimeo URL)" onCancel={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titulo (opcional)"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <div className="relative">
          <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://vimeo.com/..."
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending ? "Agregando..." : "Agregar bloque"}
        </button>
      </form>
    </FormShell>
  );
}

function AddPdfBlock({
  onAdd,
  onCancel,
  pending,
}: {
  onAdd: (block: NewBlockInput) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("El PDF debe pesar menos de 10MB");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/pdf", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { url: string };
      setUrl(data.url);
      if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) {
      setError("Sube un PDF o pega una URL");
      return;
    }
    setError("");
    onAdd({ type: "pdf", title: title || "Documento PDF", url });
  }

  return (
    <FormShell title="Agregar PDF" onCancel={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titulo del documento"
          required
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface py-2 text-sm hover:bg-primary-50">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFile}
              className="hidden"
            />
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Subir PDF
              </>
            )}
          </label>
          <span className="self-center text-xs text-text-tertiary">o</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega URL del PDF"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {url && !uploading && (
          <p className="truncate text-xs text-emerald-700">✓ Listo: {url}</p>
        )}
        <button
          type="submit"
          disabled={pending || uploading || !url}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending ? "Agregando..." : "Agregar bloque"}
        </button>
      </form>
    </FormShell>
  );
}

function AddTextBlock({
  onAdd,
  onCancel,
  pending,
}: {
  onAdd: (block: NewBlockInput) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd({
      type: "text",
      title: title || undefined,
      content: content.trim(),
    });
  }

  return (
    <FormShell title="Agregar texto / lectura" onCancel={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titulo (opcional)"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={6}
          placeholder="Contenido (soporta markdown)"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending ? "Agregando..." : "Agregar bloque"}
        </button>
      </form>
    </FormShell>
  );
}

function AddQuizBlock({
  quizzes,
  onAdd,
  onCancel,
  pending,
}: {
  quizzes: { id: string; title: string }[];
  onAdd: (block: NewBlockInput) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [quizId, setQuizId] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quizId) return;
    const q = quizzes.find((x) => x.id === quizId);
    onAdd({ type: "quiz", quizId, title: q?.title });
  }

  return (
    <FormShell title="Agregar quiz existente" onCancel={onCancel}>
      {quizzes.length === 0 ? (
        <p className="text-xs text-text-tertiary">
          Primero crea un quiz en otra leccion tipo QUIZ del mismo curso, y
          luego podras referenciarlo aqui.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <select
            value={quizId}
            onChange={(e) => setQuizId(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Selecciona un quiz...</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || !quizId}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {pending ? "Agregando..." : "Agregar bloque"}
          </button>
        </form>
      )}
    </FormShell>
  );
}
