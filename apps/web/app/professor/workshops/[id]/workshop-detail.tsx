"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  cancelWorkshop,
  checkInStudent,
  markNoShow,
} from "@/lib/actions/workshop";

interface Workshop {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  course: { id: string; title: string; slug: string };
  module: { id: string; title: string; position: number } | null;
  locationName: string | null;
  locationAddress: string | null;
  locationMapUrl: string | null;
  meetingUrl: string | null;
  startTime: Date;
  endTime: Date;
  maxAttendees: number;
  minAttendees: number;
  isRequired: boolean;
  prerequisite: string;
  cancellationHrs: number;
  bookings: {
    id: string;
    student: {
      id: string;
      name: string | null;
      email: string;
      avatar: string | null;
    };
    status: string;
    waitlistPosition: number | null;
    bookedAt: Date;
    cancelledAt: Date | null;
  }[];
  attendances: {
    id: string;
    studentId: string;
    studentName: string | null;
    checkedInAt: Date;
    checkedOutAt: Date | null;
    feedback: string | null;
    rating: number | null;
  }[];
}

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
  CANCELLED: { label: "Cancelado", color: "text-red-700", bg: "bg-red-50" },
};

const defaultBookingStatus = {
  label: "Desconocido",
  color: "text-text-secondary",
  icon: Clock,
};

const bookingStatusConfig: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  CONFIRMED: {
    label: "Confirmado",
    color: "text-emerald-600",
    icon: CheckCircle,
  },
  WAITLISTED: {
    label: "Lista de espera",
    color: "text-accent-600",
    icon: Clock,
  },
  CANCELLED: { label: "Cancelado", color: "text-red-600", icon: XCircle },
  NO_SHOW: {
    label: "No asistió",
    color: "text-red-600",
    icon: AlertTriangle,
  },
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function WorkshopDetail({ workshop }: { workshop: Workshop }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const status = statusConfig[workshop.status] ?? {
    label: workshop.status,
    color: "text-text-secondary",
    bg: "bg-surface-secondary",
  };
  const confirmedBookings = workshop.bookings.filter(
    (b) => b.status === "CONFIRMED",
  );
  const checkedInIds = new Set(workshop.attendances.map((a) => a.studentId));
  const canManageAttendance =
    workshop.status === "SCHEDULED" ||
    workshop.status === "CONFIRMED" ||
    workshop.status === "IN_PROGRESS";

  function handleCancel() {
    if (!confirm("¿Estás seguro de cancelar este workshop?")) return;
    startTransition(async () => {
      await cancelWorkshop(workshop.id);
      router.refresh();
    });
  }

  function handleCheckIn(studentId: string) {
    startTransition(async () => {
      await checkInStudent(workshop.id, studentId);
      router.refresh();
    });
  }

  function handleNoShow(studentId: string) {
    startTransition(async () => {
      await markNoShow(workshop.id, studentId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/professor/workshops"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Workshops
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-text-primary">
                {workshop.title}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}
              >
                {status.label}
              </span>
            </div>
            <p className="text-sm text-text-tertiary">
              Curso: {workshop.course.title}
              {workshop.module &&
                ` — Módulo ${workshop.module.position}: ${workshop.module.title}`}
            </p>
          </div>

          {canManageAttendance && workshop.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="shrink-0 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Cancelar Workshop
            </button>
          )}
        </div>
      </div>

      {/* Details cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Date & time */}
        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Calendar className="h-4 w-4 text-primary-600" />
            Fecha y hora
          </h3>
          <p className="text-sm text-text-secondary">
            {formatDateTime(workshop.startTime)}
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Hasta las {formatTime(workshop.endTime)}
          </p>
        </div>

        {/* Location */}
        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
            {workshop.type === "VIRTUAL" ? (
              <Video className="h-4 w-4 text-primary-600" />
            ) : (
              <MapPin className="h-4 w-4 text-primary-600" />
            )}
            {workshop.type === "VIRTUAL" ? "Enlace virtual" : "Ubicación"}
          </h3>
          {workshop.locationName && (
            <p className="text-sm font-medium text-text-primary">
              {workshop.locationName}
            </p>
          )}
          {workshop.locationAddress && (
            <p className="mt-0.5 text-sm text-text-tertiary">
              {workshop.locationAddress}
            </p>
          )}
          {workshop.locationMapUrl && (
            <a
              href={workshop.locationMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Ver en mapa
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {workshop.meetingUrl && (
            <a
              href={workshop.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Abrir enlace de reunión
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {!workshop.locationName && !workshop.meetingUrl && (
            <p className="text-sm text-text-tertiary italic">
              Sin ubicación definida
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {workshop.description && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">
            Descripción
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {workshop.description}
          </p>
        </div>
      )}

      {/* Attendees */}
      <div className="rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Users className="h-4 w-4 text-primary-600" />
            Asistentes ({confirmedBookings.length} / {workshop.maxAttendees})
          </h3>
          {confirmedBookings.length < workshop.minAttendees && (
            <span className="text-xs text-accent-600">
              Mínimo {workshop.minAttendees} asistentes
            </span>
          )}
        </div>

        {workshop.bookings.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-text-tertiary" />
            <p className="mt-2 text-sm text-text-secondary">
              Aún no hay reservaciones
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {workshop.bookings.map((booking) => {
              const bStatus =
                bookingStatusConfig[booking.status] ?? defaultBookingStatus;
              const StatusIcon = bStatus.icon;
              const isCheckedIn = checkedInIds.has(booking.student.id);

              return (
                <li
                  key={booking.id}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  {/* Avatar */}
                  {booking.student.avatar ? (
                    <img
                      src={booking.student.avatar}
                      alt={booking.student.name ?? ""}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {getInitials(booking.student.name ?? "?")}
                    </div>
                  )}

                  {/* Name + email */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {booking.student.name ?? "Sin nombre"}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {booking.student.email}
                    </p>
                  </div>

                  {/* Status */}
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${bStatus.color}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {isCheckedIn ? "Asistió" : bStatus.label}
                  </span>

                  {/* Actions */}
                  {canManageAttendance &&
                    booking.status === "CONFIRMED" &&
                    !isCheckedIn && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCheckIn(booking.student.id)}
                          disabled={isPending}
                          className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                          title="Registrar asistencia"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNoShow(booking.student.id)}
                          disabled={isPending}
                          className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                          title="Marcar como no asistió"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
