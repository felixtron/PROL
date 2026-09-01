import Link from "next/link";
import { Building2 } from "lucide-react";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

export interface ProjectRow {
  id: string;
  status: string;
  activatedAt: Date;
  company: { id: string; name: string };
  manual: { id: string; title: string; normaLabel: string | null };
  consultant: { id: string; name: string | null } | null;
  progress: { percent: number; approvedRequirements: number; totalRequirements: number };
  pendingReview: number;
}

/**
 * Proyectos activos: un manual implantándose en una empresa. Es la vista de
 * seguimiento del consultor, ordenada por lo que tiene esperando revisión.
 */
export function ProjectsList({
  projects,
  basePath,
}: {
  projects: ProjectRow[];
  basePath: string;
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
        <Building2 className="mx-auto h-8 w-8 text-text-tertiary" />
        <p className="mt-3 text-sm text-text-secondary">
          Todavía no hay ningún manual activado para una empresa.
        </p>
      </div>
    );
  }

  const sorted = [...projects].sort((a, b) => b.pendingReview - a.pendingReview);

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {sorted.map((p) => (
        <Link
          key={p.id}
          href={`${basePath}/${p.id}`}
          className="flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-secondary"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-text-primary">{p.company.name}</p>
              {p.status !== "ACTIVE" ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  {p.status === "PAUSED" ? "En pausa" : "Cerrado"}
                </span>
              ) : null}
              {p.pendingReview > 0 ? (
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {p.pendingReview} por revisar
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-text-secondary">
              {p.manual.title}
              {p.manual.normaLabel ? ` · ${p.manual.normaLabel}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Desde {DATE.format(new Date(p.activatedAt))}
              {p.consultant?.name ? ` · ${p.consultant.name}` : ""}
            </p>
          </div>

          <div className="w-40 shrink-0">
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>Avance</span>
              <span className="font-medium text-text-secondary">
                {p.progress.percent}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-primary-500"
                style={{ width: `${p.progress.percent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              {p.progress.approvedRequirements}/{p.progress.totalRequirements}{" "}
              evidencias
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
