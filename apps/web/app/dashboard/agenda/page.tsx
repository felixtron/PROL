import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { listAgendaForCompany } from "@/lib/queries/evidence";
import {
  ACTIVITY_STATE_LABEL,
  PERIODICITY_LABEL,
  daysUntil,
  type ActivityState,
} from "@/lib/compliance";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

const STATE_CLASS: Record<string, string> = {
  OVERDUE: "bg-rose-100 text-rose-700",
  DUE_SOON: "bg-amber-100 text-amber-800",
  OPEN: "bg-slate-100 text-slate-700",
};

/**
 * Agenda de cumplimiento de la empresa.
 *
 * Tres grupos en vez de un calendario mensual: lo que ya se pasó de fecha, lo
 * que viene y lo que está pendiente sin fecha comprometida. Es la lectura que
 * pide una agenda de cumplimiento — qué me está ardiendo, qué preparo y qué
 * queda por planificar.
 */
export default async function CompanyAgendaPage() {
  const user = await requireUser();
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { documentsEnabled: true },
    });
    if (!tenant) notFound();
    if (!tenant.documentsEnabled) redirect("/dashboard");
  }

  const activities = await listAgendaForCompany();

  const overdue = activities.filter((a) => a.state === "OVERDUE");
  const upcoming = activities.filter(
    (a) => a.dueAt && a.state !== "OVERDUE",
  );
  const undated = activities.filter((a) => !a.dueAt);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Agenda</h1>
        <p className="mt-1 text-text-secondary">
          Las actividades de cumplimiento de tu empresa: qué toca actualizar,
          revisar o evidenciar, y para cuándo.
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No hay actividades pendientes. Cuando tu consultor active un manual,
            sus actividades aparecerán aquí.
          </p>
        </div>
      ) : null}

      <AgendaGroup
        title="Vencidas"
        activities={overdue}
        emptyHidden
        tone="danger"
      />
      <AgendaGroup title="Próximas" activities={upcoming} emptyHidden />
      <AgendaGroup
        title="Sin fecha comprometida"
        activities={undated}
        emptyHidden
        hint="Tu consultor fijará la fecha, o puedes atenderlas cuando corresponda."
      />
    </div>
  );
}

interface AgendaActivity {
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
  assignment: { manual: { id: string; title: string } };
}

function AgendaGroup({
  title,
  activities,
  emptyHidden,
  tone,
  hint,
}: {
  title: string;
  activities: AgendaActivity[];
  emptyHidden?: boolean;
  tone?: "danger";
  hint?: string;
}) {
  if (activities.length === 0 && emptyHidden) return null;

  return (
    <section className="space-y-3">
      <h2
        className={`font-heading text-base font-semibold ${
          tone === "danger" ? "text-rose-700" : "text-text-primary"
        }`}
      >
        {title}
        <span className="ml-2 text-sm font-normal text-text-tertiary">
          {activities.length}
        </span>
      </h2>
      {hint ? <p className="text-xs text-text-tertiary">{hint}</p> : null}
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {activities.map((a) => {
          const left = a.dueAt ? daysUntil(a.dueAt) : null;
          return (
            <Link
              key={a.id}
              href={`/dashboard/manuals/${a.assignmentId}/sections/${a.requirement.section.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {a.requirement.name}
                </p>
                <p className="truncate text-xs text-text-tertiary">
                  {a.assignment.manual.title} ·{" "}
                  {a.requirement.section.code
                    ? `${a.requirement.section.code} — `
                    : ""}
                  {a.requirement.section.title}
                  {a.requirement.periodicity !== "ONCE"
                    ? ` · ${PERIODICITY_LABEL[a.requirement.periodicity]}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {a.dueAt ? (
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">
                      {DATE.format(new Date(a.dueAt))}
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
                    STATE_CLASS[a.state] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {ACTIVITY_STATE_LABEL[a.state]}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
