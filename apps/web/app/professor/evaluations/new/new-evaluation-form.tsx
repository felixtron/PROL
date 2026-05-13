"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createEvaluation } from "@/lib/actions/evaluation";
import type { EvaluationKind } from "@prol/db";

const KIND_OPTIONS: {
  value: EvaluationKind;
  label: string;
  hint: string;
}[] = [
  {
    value: "DAFO",
    label: "DAFO",
    hint: "Opción única F/D/O/A según sección interna o externa. Reporte DAFO consolidado.",
  },
  {
    value: "DIAGNOSTIC",
    label: "Diagnóstico",
    hint: "Opción única Sí / Parcialmente / No. Reporte de barras GAP por pregunta.",
  },
  {
    value: "GUIDELINES",
    label: "Directrices",
    hint: "Texto abierto. Sin gráfico — sólo respuestas.",
  },
  {
    value: "STAKEHOLDERS",
    label: "Partes interesadas",
    hint: "Opción múltiple F/D/O/A (próximamente). Sin gráfico.",
  },
  {
    value: "ROLES",
    label: "Cargos y roles",
    hint: "Texto abierto. Sin gráfico — sólo respuestas.",
  },
];

export function NewEvaluationForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [methodology, setMethodology] = useState("");
  const [kind, setKind] = useState<EvaluationKind>("DAFO");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const res = await createEvaluation({
          title,
          description: description || null,
          methodology: methodology || null,
          kind,
        });
        router.push(`/professor/evaluations/${res.evaluationId}`);
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
          Tipo de evaluación
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {KIND_OPTIONS.map((opt) => {
            const checked = kind === opt.value;
            return (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                  checked
                    ? "border-primary-500 bg-primary-50 text-primary-900"
                    : "border-border bg-surface text-text-secondary hover:border-primary-200"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={opt.value}
                  checked={checked}
                  onChange={() => setKind(opt.value)}
                  className="sr-only"
                />
                <p className="font-medium text-text-primary">{opt.label}</p>
                <p className="mt-0.5 text-[11px] text-text-tertiary">
                  {opt.hint}
                </p>
              </label>
            );
          })}
        </div>
      </div>
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
          placeholder='Ej: "Test DAFO para evaluar el Contexto de tu Organización"'
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
          placeholder="Un resumen breve de para qué sirve la evaluación."
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Metodología (opcional)
        </label>
        <textarea
          value={methodology}
          onChange={(e) => setMethodology(e.target.value)}
          rows={4}
          placeholder="Instrucciones detalladas para los participantes (soporta markdown)."
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        />
      </div>
      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Creando..." : "Crear evaluación"}
        </button>
      </div>
    </form>
  );
}
