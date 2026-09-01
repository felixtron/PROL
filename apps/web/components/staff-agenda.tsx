"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import {
  ACTIVITY_STATE_LABEL,
  PERIODICITY_LABEL,
  daysUntil,
  type ActivityState,
} from "@/lib/compliance";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

const STATE_CLASS: Record<string, string> = {
  OVERDUE: "bg-rose-100 text-rose-700",
  DUE_SOON: "bg-amber-100 text-amber-800",
  OPEN: "bg-slate-100 text-slate-700",
};

export interface StaffAgendaRow {
  id: string;
  dueAt: Date | null;
  state: ActivityState;
  periodLabel: string | null;
  assignmentId: string;
  requirement: {
    name: string;
    periodicity: "ONCE" | "SEMIANNUAL" | "ANNUAL";
    section: { id: string; code: string | null; title: string };
  };
  assignment: {
    id: string;
    manualId: string;
    company: { id: string; name: string };
    manual: { id: string; title: string };
    consultant: { name: string | null } | null;
  };
}

/**
 * Agenda del consultor: todas las actividades con fecha de sus empresas,
 * ordenadas por urgencia. El filtro por empresa es lo que la hace usable
 * cuando se acompañan varios clientes a la vez.
 */
export function StaffAgenda({
  rows,
  basePath,
}: {
  rows: StaffAgendaRow[];
  basePath: string;
}) {
  const [company, setCompany] = useState("ALL");

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.assignment.company.id, r.assignment.company.name);
    return [...map]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(
    () =>
      company === "ALL"
        ? rows
        : rows.filter((r) => r.assignment.company.id === company),
    [rows, company],
  );

  const overdue = filtered.filter((r) => r.state === "OVERDUE");
  const soon = filtered.filter((r) => r.state === "DUE_SOON");
  const later = filtered.filter((r) => r.state === "OPEN");

  return (
    <div className="space-y-6">
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

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No hay actividades con fecha comprometida.
          </p>
        </div>
      ) : null}

      <Group title="Vencidas" rows={overdue} basePath={basePath} tone="danger" />
      <Group title="Próximas (14 días)" rows={soon} basePath={basePath} />
      <Group title="Más adelante" rows={later} basePath={basePath} />
    </div>
  );
}

function Group({
  title,
  rows,
  basePath,
  tone,
}: {
  title: string;
  rows: StaffAgendaRow[];
  basePath: string;
  tone?: "danger";
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2
        className={`font-heading text-base font-semibold ${
          tone === "danger" ? "text-rose-700" : "text-text-primary"
        }`}
      >
        {title}
        <span className="ml-2 text-sm font-normal text-text-tertiary">
          {rows.length}
        </span>
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {rows.map((r) => {
          const left = r.dueAt ? daysUntil(r.dueAt) : null;
          return (
            <Link
              key={r.id}
              href={`${basePath}/${r.assignmentId}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {r.requirement.name}
                </p>
                <p className="truncate text-sm text-text-secondary">
                  {r.assignment.company.name}
                </p>
                <p className="truncate text-xs text-text-tertiary">
                  {r.assignment.manual.title} ·{" "}
                  {r.requirement.section.code
                    ? `${r.requirement.section.code} — `
                    : ""}
                  {r.requirement.section.title}
                  {r.requirement.periodicity !== "ONCE"
                    ? ` · ${PERIODICITY_LABEL[r.requirement.periodicity]}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {r.dueAt ? (
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">
                      {DATE.format(new Date(r.dueAt))}
                    </p>
                    {left !== null ? (
                      <p className="text-xs text-text-tertiary">
                        {left < 0
                          ? `hace ${Math.abs(left)} d.`
                          : left === 0
                            ? "hoy"
                            : `en ${left} d.`}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATE_CLASS[r.state] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {ACTIVITY_STATE_LABEL[r.state]}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
