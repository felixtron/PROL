"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type {
  EvidencePeriodicity,
  EvidenceRequirementKind,
} from "@prol/db";
import {
  createEvidenceRequirement,
  deleteEvidenceRequirement,
} from "@/lib/actions/manual";
import { PERIODICITY_LABEL } from "@/lib/compliance";

export interface RequirementRow {
  id: string;
  name: string;
  description: string | null;
  kind: EvidenceRequirementKind;
  periodicity: EvidencePeriodicity;
  required: boolean;
  reminderDaysBefore: number[];
  evaluationId: string | null;
  evaluation: { id: string; title: string } | null;
}

const KIND_LABEL: Record<EvidenceRequirementKind, string> = {
  FILE: "Archivo en la carpeta de Drive del proyecto",
  RISK_MATRIX: "Matriz de riesgos y oportunidades",
  EVALUATION_LINK: "Evaluación de la plataforma",
};

/**
 * Requisitos de evidencia de la sección.
 *
 * Crear uno da de alta la actividad correspondiente en todas las empresas que
 * ya tienen el manual activo: si no, el requisito nuevo quedaría invisible para
 * los clientes en marcha hasta una futura reactivación.
 */
export function SectionRequirementsEditor({
  sectionId,
  requirements,
  evaluations,
}: {
  sectionId: string;
  requirements: RequirementRow[];
  evaluations: Array<{ id: string; title: string; kind: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<EvidenceRequirementKind>("FILE");
  const [periodicity, setPeriodicity] = useState<EvidencePeriodicity>("ONCE");
  const [evaluationId, setEvaluationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createEvidenceRequirement({
        sectionId,
        name,
        description,
        kind,
        periodicity,
        evaluationId: kind === "EVALUATION_LINK" ? evaluationId : null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setName("");
      setDescription("");
      setKind("FILE");
      setPeriodicity("ONCE");
      setEvaluationId("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Evidencias requeridas
        </h2>
        <p className="text-sm text-text-secondary">
          Qué tiene que producir la empresa en esta sección, con qué herramienta y
          cada cuánto se repite.
        </p>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {requirements.length === 0 ? (
          <p className="p-4 text-sm text-text-tertiary">
            Esta sección no pide ninguna evidencia.
          </p>
        ) : (
          requirements.map((r) => (
            <div key={r.id} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-text-primary">{r.name}</p>
                  {!r.required ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      Opcional
                    </span>
                  ) : null}
                  {r.periodicity !== "ONCE" ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                      {PERIODICITY_LABEL[r.periodicity]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {KIND_LABEL[r.kind]}
                  {r.evaluation ? ` · ${r.evaluation.title}` : ""}
                  {r.reminderDaysBefore.length
                    ? ` · avisos ${r.reminderDaysBefore.join(", ")} días antes`
                    : ""}
                </p>
                {r.description ? (
                  <p className="mt-1 text-sm text-text-secondary">{r.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Eliminar requisito"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteEvidenceRequirement(r.id);
                    if (!result.success) {
                      setError(result.error);
                      return;
                    }
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

      {open ? (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-border bg-surface p-4"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Nombre de la evidencia (p. ej. Matriz DAFO firmada)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Qué se espera exactamente (opcional)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Cómo se produce
              </label>
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as EvidenceRequirementKind)
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              >
                {(
                  ["FILE", "RISK_MATRIX", "EVALUATION_LINK"] as const
                ).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              {kind === "FILE" ? (
                <p className="mt-1 text-xs text-text-tertiary">
                  El cliente lo guarda en Drive y aquí sólo marca que está hecho.
                </p>
              ) : null}
            </div>
            <div className="w-44">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Periodicidad
              </label>
              <select
                value={periodicity}
                onChange={(e) =>
                  setPeriodicity(e.target.value as EvidencePeriodicity)
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              >
                {(["ONCE", "SEMIANNUAL", "ANNUAL"] as const).map((p) => (
                  <option key={p} value={p}>
                    {PERIODICITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {kind === "EVALUATION_LINK" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Evaluación que la satisface
              </label>
              <select
                value={evaluationId}
                onChange={(e) => setEvaluationId(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              >
                <option value="">Selecciona una evaluación</option>
                {evaluations.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.kind})
                  </option>
                ))}
              </select>
              {evaluations.length === 0 ? (
                <p className="mt-1 text-xs text-text-tertiary">
                  No hay evaluaciones publicadas en este tenant.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Agregar evidencia
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
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
        >
          <Plus className="h-4 w-4" />
          Agregar evidencia requerida
        </button>
      )}
    </section>
  );
}
