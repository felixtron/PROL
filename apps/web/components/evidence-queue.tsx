"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileCheck2, Search } from "lucide-react";
import type { EvidenceStatus } from "@prol/db";
import {
  ACTIVITY_STATE_LABEL,
  EVIDENCE_STATUS_CLASS,
  EVIDENCE_STATUS_LABEL,
  activityState,
} from "@/lib/compliance";
import { normalize } from "@/lib/normalize";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

export interface EvidenceQueueRow {
  id: string;
  version: number;
  status: EvidenceStatus;
  title: string | null;
  fileName: string | null;
  submittedAt: Date;
  deletionRequestedAt: Date | null;
  uploadedBy: { name: string | null; email: string } | null;
  activity: {
    dueAt: Date | null;
    periodLabel: string | null;
    requirement: {
      name: string;
      section: { id: string; code: string | null; title: string };
    };
  };
  assignment: {
    id: string;
    company: { id: string; name: string };
    manual: { id: string; title: string };
  };
}

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "IN_REVIEW", label: "En revisión" },
  { value: "NEEDS_CORRECTION", label: "Requieren corrección" },
  { value: "APPROVED", label: "Aprobadas" },
  { value: "DELETION_REQUESTED", label: "Baja solicitada" },
];

/**
 * Cola de revisión de evidencias.
 *
 * Filtra en el cliente sobre el conjunto que ya trajo el servidor (acotado por
 * tenant): son cientos de filas como mucho, y así los filtros responden sin
 * ida y vuelta, igual que la tabla de resultados de quizzes.
 */
export function EvidenceQueue({
  rows,
  basePath,
}: {
  rows: EvidenceQueueRow[];
  basePath: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [company, setCompany] = useState("ALL");

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.assignment.company.id, r.assignment.company.name);
    return [...map]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return rows.filter((r) => {
      if (company !== "ALL" && r.assignment.company.id !== company) return false;
      if (status === "DELETION_REQUESTED" && !r.deletionRequestedAt) return false;
      if (status !== "ALL" && status !== "DELETION_REQUESTED" && r.status !== status)
        return false;
      if (!q) return true;
      const haystack = normalize(
        [
          r.activity.requirement.name,
          r.activity.requirement.section.title,
          r.activity.requirement.section.code ?? "",
          r.assignment.company.name,
          r.assignment.manual.title,
          r.uploadedBy?.name ?? "",
          r.fileName ?? "",
        ].join(" "),
      );
      return haystack.includes(q);
    });
  }, [rows, query, status, company]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por requisito, empresa o sección"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary-400 focus:outline-none"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {companies.length > 1 ? (
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary-400 focus:outline-none"
          >
            <option value="ALL">Todas las empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <p className="text-xs text-text-tertiary">
        {filtered.length} de {rows.length}{" "}
        {rows.length === 1 ? "evidencia" : "evidencias"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <FileCheck2 className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No hay evidencias que coincidan con estos filtros.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {filtered.map((r) => {
            // Una evidencia aprobada cierra su actividad, así que ya no puede
            // estar vencida por mucho que la fecha haya pasado.
            const state = activityState({
              status: r.status === "APPROVED" ? "COMPLETED" : "OPEN",
              dueAt: r.activity.dueAt,
            });
            return (
              <Link
                key={r.id}
                href={`${basePath}/${r.id}`}
                className="flex flex-wrap items-start justify-between gap-3 p-4 transition-colors hover:bg-surface-secondary"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">
                      {r.activity.requirement.name}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        EVIDENCE_STATUS_CLASS[r.status]
                      }`}
                    >
                      {EVIDENCE_STATUS_LABEL[r.status]}
                    </span>
                    {r.deletionRequestedAt ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Baja solicitada
                      </span>
                    ) : null}
                    {r.activity.dueAt && state === "OVERDUE" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                        {ACTIVITY_STATE_LABEL.OVERDUE}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {r.assignment.company.name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {r.assignment.manual.title} ·{" "}
                    {r.activity.requirement.section.code
                      ? `${r.activity.requirement.section.code} — `
                      : ""}
                    {r.activity.requirement.section.title}
                    {r.activity.periodLabel ? ` · ${r.activity.periodLabel}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-text-tertiary">
                  <p>{DATE.format(new Date(r.submittedAt))}</p>
                  <p>v{r.version}</p>
                  <p className="max-w-[160px] truncate">
                    {r.uploadedBy?.name ?? r.uploadedBy?.email ?? ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
