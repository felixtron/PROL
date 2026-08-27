"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSurvey } from "@/lib/actions/survey";
import { DEFAULT_DURATION_DAYS } from "@/lib/surveys";

export function NewSurveyForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(DEFAULT_DURATION_DAYS);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const res = await createSurvey({
          title,
          description: description || null,
          defaultDurationDays: duration,
        });
        router.push(`/tenant-admin/surveys/${res.surveyId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Título
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={120}
          placeholder='Ej: "Satisfacción — cierre de curso"'
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Descripción (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Una línea breve que verá quien abra la encuesta."
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Duración sugerida (días)
        </label>
        <input
          type="number"
          min={1}
          max={365}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-32 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        />
        <p className="mt-1.5 text-xs text-text-tertiary">
          Se precarga al lanzar y puedes cambiarla en cada envío.
        </p>
      </div>
      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Creando..." : "Crear encuesta"}
        </button>
      </div>
    </form>
  );
}
