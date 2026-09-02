import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, FileText } from "lucide-react";
import { getManualOverview } from "@/lib/queries/manual";
import { ACTIVITY_STATE_LABEL } from "@/lib/compliance";

export const dynamic = "force-dynamic";

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

export default async function ManualOverviewPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const data = await getManualOverview(assignmentId).catch(() => null);
  if (!data) notFound();

  const { manual, progress, checkedBySection, upcoming } = data;

  // Capítulos raíz en orden, cada uno con sus subcapítulos.
  const roots = manual.chapters.filter((c) => !c.parentChapterId);
  const childrenOf = (id: string) =>
    manual.chapters.filter((c) => c.parentChapterId === id);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <Link
          href="/dashboard/manuals"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Proyectos
        </Link>
        <h1 className="mt-3 font-heading text-2xl font-bold text-text-primary">
          {manual.title}
        </h1>
        {manual.normaLabel ? (
          <p className="text-sm text-text-tertiary">{manual.normaLabel}</p>
        ) : null}
        {manual.description ? (
          <p className="mt-2 text-text-secondary">{manual.description}</p>
        ) : null}
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-text-primary">Avance de implantación</span>
          <span className="text-text-secondary">{progress.percent}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {progress.checkedItems} de {progress.totalItems} pasos completados
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-text-tertiary" />
            {progress.approvedRequirements} de {progress.totalRequirements}{" "}
            evidencias aprobadas
          </span>
        </div>
      </section>

      {upcoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Próximas actividades
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {upcoming.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/manuals/${assignmentId}/sections/${a.requirement.section.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {a.requirement.name}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    {a.requirement.section.code
                      ? `${a.requirement.section.code} — `
                      : ""}
                    {a.requirement.section.title}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.dueAt ? (
                    <span className="text-xs text-text-secondary">
                      {DATE.format(a.dueAt)}
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATE_CLASS[a.state] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {ACTIVITY_STATE_LABEL[a.state]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/dashboard/agenda"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            <CalendarClock className="h-4 w-4" />
            Ver toda la agenda
          </Link>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Contenido del manual
        </h2>

        {roots.map((chapter) => (
          <div
            key={chapter.id}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="border-b border-border bg-surface-secondary px-4 py-2.5">
              <h3 className="text-sm font-semibold text-text-primary">
                {chapter.title}
              </h3>
            </div>
            <SectionList
              assignmentId={assignmentId}
              sections={chapter.sections}
              checkedBySection={checkedBySection}
            />
            {childrenOf(chapter.id).map((sub) => (
              <div key={sub.id}>
                <div className="border-y border-border bg-surface-secondary/60 px-4 py-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    {sub.title}
                  </h4>
                </div>
                <SectionList
                  assignmentId={assignmentId}
                  sections={sub.sections}
                  checkedBySection={checkedBySection}
                />
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

function SectionList({
  assignmentId,
  sections,
  checkedBySection,
}: {
  assignmentId: string;
  sections: Array<{
    id: string;
    code: string | null;
    title: string;
    _count: { items: number; requirements: number };
  }>;
  checkedBySection: Record<string, number>;
}) {
  if (sections.length === 0) return null;
  return (
    <ul className="divide-y divide-border">
      {sections.map((s) => {
        const checked = checkedBySection[s.id] ?? 0;
        const done = s._count.items > 0 && checked >= s._count.items;
        return (
          <li key={s.id}>
            <Link
              href={`/dashboard/manuals/${assignmentId}/sections/${s.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${
                    done ? "text-emerald-600" : "text-text-tertiary/40"
                  }`}
                />
                <span className="truncate text-sm text-text-primary">
                  {s.code ? (
                    <span className="font-medium text-text-secondary">{s.code} </span>
                  ) : null}
                  {s.title}
                </span>
              </div>
              <span className="shrink-0 text-xs text-text-tertiary">
                {s._count.items > 0 ? `${checked}/${s._count.items}` : null}
                {s._count.requirements > 0 ? (
                  <span className="ml-2">
                    {s._count.requirements}{" "}
                    {s._count.requirements === 1 ? "evidencia" : "evidencias"}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
