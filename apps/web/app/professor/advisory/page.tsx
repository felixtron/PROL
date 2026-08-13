import Link from "next/link";
import {
  Plus,
  Calendar,
  MapPin,
  Video,
  Users,
  Building2,
  Clock,
  Repeat,
  Laptop,
} from "lucide-react";
import { getAdvisorSessions } from "@/lib/queries/advisory";
import { requireAdvisoryEnabled } from "@/lib/advisory-access";
import { APP_TIME_ZONE } from "@/lib/timezone";

const DEFAULT_STATUS = {
  label: "Programada",
  color: "text-blue-700",
  bg: "bg-blue-50",
};

const statusConfig: Record<string, typeof DEFAULT_STATUS> = {
  DRAFT: {
    label: "Borrador",
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  SCHEDULED: DEFAULT_STATUS,
  COMPLETED: {
    label: "Finalizada",
    color: "text-text-secondary",
    bg: "bg-surface-secondary",
  },
  CANCELLED: { label: "Cancelada", color: "text-red-700", bg: "bg-red-50" },
};

const typeIcon: Record<string, typeof MapPin> = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Calendar,
};

const typeLabel: Record<string, string> = {
  IN_PERSON: "Presencial",
  VIRTUAL: "Virtual",
  HYBRID: "Híbrida",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function AdvisoryPage() {
  await requireAdvisoryEnabled("/professor");

  const sessions = await getAdvisorSessions();

  const now = new Date();
  const drafts = sessions.filter((s) => s.status === "DRAFT");
  const upcoming = sessions.filter(
    (s) =>
      s.status !== "DRAFT" &&
      new Date(s.startTime) >= now &&
      s.status !== "CANCELLED",
  );
  const past = sessions.filter(
    (s) =>
      s.status !== "DRAFT" &&
      (new Date(s.startTime) < now || s.status === "CANCELLED"),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Consultoría Online
          </h1>
          <p className="mt-1 text-text-secondary">
            Agenda proyectos de acompañamiento con una empresa o con personas
            específicas. No requieren curso.
          </p>
        </div>
        <Link
          href="/professor/advisory/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center shadow-sm">
          <Laptop className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 font-medium text-text-primary">
            Todavía no tienes proyectos agendados
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Crea el primero para que tu cliente lo vea en su panel.
          </p>
        </div>
      ) : (
        <>
          <SessionSection title="Borradores" sessions={drafts} />
          <SessionSection title="Próximos" sessions={upcoming} />
          <SessionSection title="Historial" sessions={past} />
        </>
      )}
    </div>
  );
}

function SessionSection({
  title,
  sessions,
}: {
  title: string;
  sessions: Awaited<ReturnType<typeof getAdvisorSessions>>;
}) {
  if (sessions.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
        {title}
      </h2>
      <div className="space-y-3">
        {sessions.map((s) => {
          const status = statusConfig[s.status] ?? DEFAULT_STATUS;
          const Icon = typeIcon[s.type] ?? Calendar;

          return (
            <Link
              key={s.id}
              href={`/professor/advisory/${s.id}`}
              className="block rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading font-semibold text-text-primary">
                      {s.title}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}
                    >
                      {status.label}
                    </span>
                    {s.recurrenceFrequency && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                        <Repeat className="h-3 w-3" />
                        Serie
                      </span>
                    )}
                  </div>

                  {/* A quién va dirigida: es el dato que define la sesión */}
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary-700">
                    {s.audience === "COMPANY" ? (
                      <>
                        <Building2 className="h-4 w-4" />
                        {s.company?.name ?? "Empresa eliminada"}
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4" />
                        {s.participantCount}{" "}
                        {s.participantCount === 1 ? "participante" : "participantes"}
                      </>
                    )}
                  </p>
                </div>

                <div className="text-right text-sm text-text-secondary">
                  <p className="flex items-center justify-end gap-1.5 font-medium text-text-primary">
                    <Calendar className="h-4 w-4" />
                    {formatDate(s.startTime)}
                  </p>
                  <p className="mt-0.5 flex items-center justify-end gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatTime(s.startTime)} – {formatTime(s.endTime)}
                  </p>
                  <p className="mt-0.5 flex items-center justify-end gap-1.5 text-text-tertiary">
                    <Icon className="h-4 w-4" />
                    {typeLabel[s.type] ?? s.type}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
