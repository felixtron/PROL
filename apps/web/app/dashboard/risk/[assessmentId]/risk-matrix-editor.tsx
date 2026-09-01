"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import type { RiskItemType } from "@prol/db";
import { saveRiskItems, submitRiskMatrix } from "@/lib/actions/risk";
import {
  RISK_ITEM_TYPE_LABEL,
  riskLevel,
  riskScore,
  type RiskMatrixConfig,
} from "@/lib/compliance";

export interface RiskRow {
  key: string;
  type: RiskItemType;
  description: string;
  probability: number;
  impact: number;
  actions: string;
  responsible: string;
}

interface RiskMatrixEditorProps {
  assessmentId: string;
  activityId: string | null;
  config: RiskMatrixConfig;
  initialRows: RiskRow[];
  readOnly: boolean;
}

let rowCounter = 0;
function newRow(type: RiskItemType = "RISK"): RiskRow {
  rowCounter += 1;
  return {
    key: `row-${Date.now()}-${rowCounter}`,
    type,
    description: "",
    probability: 1,
    impact: 1,
    actions: "",
    responsible: "",
  };
}

/**
 * Editor de la matriz de riesgos y oportunidades.
 *
 * La evaluación (probabilidad × consecuencia y su nivel) se calcula en vivo con
 * las mismas funciones que usa el servidor al guardar, así que lo que se ve en
 * pantalla es exactamente lo que queda registrado.
 */
export function RiskMatrixEditor({
  assessmentId,
  activityId,
  config,
  initialRows,
  readOnly,
}: RiskMatrixEditorProps) {
  const router = useRouter();
  const [rows, setRows] = useState<RiskRow[]>(
    initialRows.length ? initialRows : [newRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const scale = useMemo(
    () => Array.from({ length: config.scaleMax }, (_, i) => i + 1),
    [config.scaleMax],
  );

  const filled = rows.filter((r) => r.description.trim().length > 0);

  function update(key: string, patch: Partial<RiskRow>) {
    setSaved(false);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveRiskItems({ assessmentId, rows: filled });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function handleSubmit() {
    setError(null);
    if (!activityId) {
      setError("Esta matriz no está ligada a una actividad abierta");
      return;
    }
    if (filled.length === 0) {
      setError("Agrega al menos un riesgo u oportunidad");
      return;
    }
    startTransition(async () => {
      // Se guarda antes de enviar: enviar lo que hay en pantalla y no lo que
      // hay en la base evita congelar una versión desactualizada.
      const savedResult = await saveRiskItems({ assessmentId, rows: filled });
      if (!savedResult.success) {
        setError(savedResult.error);
        return;
      }
      const result = await submitRiskMatrix({ assessmentId, activityId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-left">
              <Th className="w-32">Tipo</Th>
              <Th>Descripción</Th>
              <Th className="w-28">Probabilidad</Th>
              <Th className="w-28">Consecuencia</Th>
              <Th className="w-28">Evaluación</Th>
              <Th>Acciones</Th>
              <Th className="w-36">Responsable</Th>
              {!readOnly ? <Th className="w-10" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const score = riskScore(row.probability, row.impact);
              const level = riskLevel(score, config);
              return (
                <tr key={row.key} className="align-top">
                  <Td>
                    <select
                      value={row.type}
                      disabled={readOnly}
                      onChange={(e) =>
                        update(row.key, { type: e.target.value as RiskItemType })
                      }
                      className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm disabled:bg-surface-secondary"
                    >
                      <option value="RISK">{RISK_ITEM_TYPE_LABEL.RISK}</option>
                      <option value="OPPORTUNITY">
                        {RISK_ITEM_TYPE_LABEL.OPPORTUNITY}
                      </option>
                    </select>
                  </Td>
                  <Td>
                    <textarea
                      value={row.description}
                      disabled={readOnly}
                      rows={2}
                      placeholder="Describe el riesgo u oportunidad"
                      onChange={(e) =>
                        update(row.key, { description: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-text-tertiary disabled:bg-surface-secondary"
                    />
                  </Td>
                  <Td>
                    <ScaleSelect
                      value={row.probability}
                      scale={scale}
                      labels={config.probabilityLabels}
                      disabled={readOnly}
                      onChange={(v) => update(row.key, { probability: v })}
                    />
                  </Td>
                  <Td>
                    <ScaleSelect
                      value={row.impact}
                      scale={scale}
                      labels={config.impactLabels}
                      disabled={readOnly}
                      onChange={(v) => update(row.key, { impact: v })}
                    />
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-base font-semibold text-text-primary">
                        {score}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${level.className}`}
                      >
                        {level.label}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <textarea
                      value={row.actions}
                      disabled={readOnly}
                      rows={2}
                      placeholder="Acciones a tomar"
                      onChange={(e) => update(row.key, { actions: e.target.value })}
                      className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-text-tertiary disabled:bg-surface-secondary"
                    />
                  </Td>
                  <Td>
                    <input
                      type="text"
                      value={row.responsible}
                      disabled={readOnly}
                      placeholder="Área o persona"
                      onChange={(e) =>
                        update(row.key, { responsible: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-text-tertiary disabled:bg-surface-secondary"
                    />
                  </Td>
                  {!readOnly ? (
                    <Td>
                      <button
                        type="button"
                        aria-label="Eliminar fila"
                        onClick={() =>
                          setRows((prev) =>
                            prev.length > 1
                              ? prev.filter((r) => r.key !== row.key)
                              : [newRow()],
                          )
                        }
                        className="rounded p-1 text-text-tertiary transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {saved && !error ? (
        <p className="text-sm text-emerald-600">Borrador guardado.</p>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, newRow()])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
          >
            <Plus className="h-4 w-4" />
            Agregar fila
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !activityId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Enviar como evidencia
          </button>
          <span className="text-xs text-text-tertiary">
            {filled.length}{" "}
            {filled.length === 1 ? "fila capturada" : "filas capturadas"}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ScaleSelect({
  value,
  scale,
  labels,
  disabled,
  onChange,
}: {
  value: number;
  scale: number[];
  labels: string[];
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm disabled:bg-surface-secondary"
    >
      {scale.map((n) => (
        <option key={n} value={n}>
          {n}
          {labels[n - 1] ? ` · ${labels[n - 1]}` : ""}
        </option>
      ))}
    </select>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2.5">{children}</td>;
}
