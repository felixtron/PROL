"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Loader2,
  BookOpen,
  Users,
  Layers,
  GraduationCap,
} from "lucide-react";
import { startCourseOutlineGeneration } from "@/lib/actions/ai";

const LEVELS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

interface AICourseFormProps {
  onClose: () => void;
}

export function AICourseForm({ onClose }: AICourseFormProps) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [moduleCount, setModuleCount] = useState(3);
  const [lessonsPerModule, setLessonsPerModule] = useState(5);
  const [level, setLevel] = useState("intermediate");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    "idle" | "generating" | "completed" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !audience.trim()) return;

    setError("");
    setStatus("generating");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("topic", topic.trim());
        formData.set("audience", audience.trim());
        formData.set("moduleCount", String(moduleCount));
        formData.set("lessonsPerModule", String(lessonsPerModule));
        formData.set("level", level);

        const result = await startCourseOutlineGeneration(formData);
        setJobId(result.jobId);
        setStatus("completed");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al generar outline"
        );
        setStatus("error");
      }
    });
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
          <Sparkles className="h-4 w-4 text-violet-600" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-text-primary">
          Crear Curso con IA
        </h3>
      </div>

      {status === "completed" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <GraduationCap className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800">
                Outline generado exitosamente
              </p>
              <p className="text-xs text-emerald-600">
                El curso fue creado como borrador. Puedes editarlo en la lista
                de cursos.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Ver mis cursos
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              <BookOpen className="mr-1 inline h-4 w-4" />
              Tema del Curso <span className="text-red-500">*</span>
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              placeholder="Ej: Marketing Digital para Emprendedores"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              <Users className="mr-1 inline h-4 w-4" />
              Audiencia Objetivo <span className="text-red-500">*</span>
            </label>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              required
              placeholder="Ej: Emprendedores y duenos de pequenos negocios en Mexico"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Nivel
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                <Layers className="mr-1 inline h-3.5 w-3.5" />
                Modulos
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={moduleCount}
                onChange={(e) => setModuleCount(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Lecciones/Modulo
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={lessonsPerModule}
                onChange={(e) => setLessonsPerModule(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || status === "generating"}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
            >
              {status === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar Outline
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
