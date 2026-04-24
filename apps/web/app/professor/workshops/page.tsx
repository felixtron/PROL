import Link from "next/link";
import {
  Plus,
  Calendar,
  MapPin,
  Video,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";
import { getProfessorWorkshops } from "@/lib/queries/workshop";

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  SCHEDULED: { label: "Programado", color: "text-blue-700", bg: "bg-blue-50" },
  CONFIRMED: {
    label: "Confirmado",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  IN_PROGRESS: {
    label: "En curso",
    color: "text-accent-700",
    bg: "bg-accent-50",
  },
  COMPLETED: {
    label: "Finalizado",
    color: "text-text-secondary",
    bg: "bg-surface-secondary",
  },
  CANCELLED: {
    label: "Cancelado",
    color: "text-red-700",
    bg: "bg-red-50",
  },
};

const typeIcon: Record<string, typeof MapPin> = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Calendar,
};

const typeLabel: Record<string, string> = {
  IN_PERSON: "Presencial",
  VIRTUAL: "Virtual",
  HYBRID: "Híbrido",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function WorkshopsPage() {
  const workshops = await getProfessorWorkshops();

  const upcoming = workshops.filter(
    (w) =>
      w.status === "SCHEDULED" ||
      w.status === "CONFIRMED" ||
      w.status === "IN_PROGRESS",
  );
  const past = workshops.filter(
    (w) => w.status === "COMPLETED" || w.status === "CANCELLED",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Sesiones y Talleres
          </h1>
          <p className="mt-1 text-text-secondary">
            Gestiona tus sesiones presenciales, virtuales e híbridas.
          </p>
        </div>
        <Link
          href="/professor/workshops/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Sesión o Taller
        </Link>
      </div>

      {/* Upcoming workshops */}
      {upcoming.length === 0 && past.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm font-medium text-text-secondary">
            No tienes sesiones ni talleres creados
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Crea tu primera sesión o taller presencial, virtual o híbrido.
          </p>
          <Link
            href="/professor/workshops/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Crear Sesión o Taller
          </Link>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-lg font-semibold text-text-primary">
                Próximos ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((w) => (
                  <WorkshopCard key={w.id} workshop={w} />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-lg font-semibold text-text-secondary">
                Pasados ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((w) => (
                  <WorkshopCard key={w.id} workshop={w} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function WorkshopCard({
  workshop,
}: {
  workshop: Awaited<ReturnType<typeof getProfessorWorkshops>>[number];
}) {
  const TypeIcon = typeIcon[workshop.type] ?? Calendar;
  const status = statusConfig[workshop.status] ?? {
    label: workshop.status,
    color: "text-text-secondary",
    bg: "bg-surface-secondary",
  };
  const isFull = workshop.bookings >= workshop.maxAttendees;

  return (
    <Link
      href={`/professor/workshops/${workshop.id}`}
      className="block rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Title + badges */}
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-text-primary">
              {workshop.title}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}
            >
              {status.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-text-secondary">
              <TypeIcon className="h-3 w-3" />
              {typeLabel[workshop.type]}
            </span>
          </div>

          {/* Course */}
          <p className="text-sm text-text-tertiary">{workshop.courseName}</p>

          {/* Details row */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
              {formatDate(workshop.startTime)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-text-tertiary" />
              {formatTime(workshop.startTime)} -{" "}
              {formatTime(workshop.endTime)}
            </span>
            {workshop.locationName && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-text-tertiary" />
                {workshop.locationName}
              </span>
            )}
          </div>
        </div>

        {/* Attendance counter */}
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-text-tertiary" />
            <span
              className={`text-lg font-bold ${isFull ? "text-red-600" : "text-text-primary"}`}
            >
              {workshop.bookings}
            </span>
            <span className="text-sm text-text-tertiary">
              / {workshop.maxAttendees}
            </span>
          </div>
          {isFull && (
            <span className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              Lleno
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
