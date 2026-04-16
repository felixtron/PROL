"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { bookWorkshop, cancelBooking } from "@/lib/actions/workshop";

interface WorkshopInfo {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  courseName: string;
  professorName: string;
  professorAvatar: string | null;
  locationName: string | null;
  locationAddress: string | null;
  locationMapUrl: string | null;
  meetingUrl: string | null;
  startTime: Date;
  endTime: Date;
  maxAttendees: number;
}

interface BookedWorkshop {
  bookingId: string;
  bookingStatus: string;
  bookedAt: Date;
  workshop: WorkshopInfo & { totalBookings: number };
}

interface AvailableWorkshop extends WorkshopInfo {
  spotsLeft: number;
}

const typeIcon: Record<string, typeof MapPin> = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Calendar,
};

const typeLabel: Record<string, string> = {
  IN_PERSON: "Presencial",
  VIRTUAL: "Virtual",
  HYBRID: "Hibrido",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function WorkshopList({
  upcoming,
  available,
  past,
}: {
  upcoming: BookedWorkshop[];
  available: AvailableWorkshop[];
  past: BookedWorkshop[];
}) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "available" | "past">(
    upcoming.length > 0 ? "upcoming" : "available",
  );

  const tabs = [
    { id: "upcoming" as const, label: "Mis Workshops", count: upcoming.length },
    { id: "available" as const, label: "Disponibles", count: available.length },
    { id: "past" as const, label: "Pasados", count: past.length },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-secondary p-1 md:mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
              activeTab === tab.id
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-tertiary"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold md:h-5 md:w-5 ${
                  activeTab === tab.id
                    ? "bg-primary-100 text-primary-700"
                    : "bg-surface-secondary text-text-tertiary"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "upcoming" && (
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState message="No tienes workshops reservados" />
          ) : (
            upcoming.map((item) => (
              <BookedWorkshopCard key={item.bookingId} booking={item} />
            ))
          )}
        </div>
      )}

      {activeTab === "available" && (
        <div className="space-y-3">
          {available.length === 0 ? (
            <EmptyState message="No hay workshops disponibles en este momento" />
          ) : (
            available.map((w) => (
              <AvailableWorkshopCard key={w.id} workshop={w} />
            ))
          )}
        </div>
      )}

      {activeTab === "past" && (
        <div className="space-y-3">
          {past.length === 0 ? (
            <EmptyState message="No tienes workshops pasados" />
          ) : (
            past.map((item) => (
              <BookedWorkshopCard key={item.bookingId} booking={item} isPast />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
      <Calendar className="mx-auto h-8 w-8 text-text-tertiary" />
      <p className="mt-2 text-sm text-text-secondary">{message}</p>
    </div>
  );
}

function BookedWorkshopCard({
  booking,
  isPast,
}: {
  booking: BookedWorkshop;
  isPast?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const w = booking.workshop;
  const TypeIcon = typeIcon[w.type] ?? Calendar;

  function handleCancel() {
    if (!confirm("¿Cancelar tu reserva para este workshop?")) return;
    startTransition(async () => {
      try {
        await cancelBooking(w.id);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error al cancelar");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-sm">
      {/* Color bar by type */}
      <div
        className={`h-1 ${
          w.type === "IN_PERSON"
            ? "bg-primary-500"
            : w.type === "VIRTUAL"
              ? "bg-violet-500"
              : "bg-accent-500"
        }`}
      />
      <div className="p-4">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary line-clamp-2 md:text-base">
              {w.title}
            </h3>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {w.courseName} — {w.professorName}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary md:text-xs">
            <TypeIcon className="h-3 w-3" />
            {typeLabel[w.type]}
          </span>
        </div>

        {/* Details */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-secondary md:gap-4 md:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
            {formatDate(w.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-text-tertiary" />
            {formatTime(w.startTime)} - {formatTime(w.endTime)}
          </span>
          {w.locationName && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-text-tertiary" />
              {w.locationName}
            </span>
          )}
        </div>

        {/* Actions */}
        {!isPast && (
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            {w.locationMapUrl && (
              <a
                href={w.locationMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2.5 text-xs font-semibold text-white active:bg-primary-800 md:flex-none md:text-sm"
              >
                <MapPin className="h-3.5 w-3.5" />
                Ver ubicacion
              </a>
            )}
            {w.meetingUrl && (
              <a
                href={w.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2.5 text-xs font-semibold text-white active:bg-primary-800 md:flex-none md:text-sm"
              >
                <Video className="h-3.5 w-3.5" />
                Unirse
              </a>
            )}
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-xs font-medium text-red-600 active:bg-red-50 disabled:opacity-50 md:text-sm"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Cancelar
            </button>
          </div>
        )}

        {isPast && (
          <div className="mt-3 border-t border-border pt-3">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                w.status === "COMPLETED"
                  ? "text-emerald-600"
                  : "text-text-tertiary"
              }`}
            >
              {w.status === "COMPLETED" ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" /> Asististe
                </>
              ) : (
                "Cancelado"
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function AvailableWorkshopCard({ workshop }: { workshop: AvailableWorkshop }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const TypeIcon = typeIcon[workshop.type] ?? Calendar;
  const isFull = workshop.spotsLeft <= 0;

  function handleBook() {
    startTransition(async () => {
      try {
        const result = await bookWorkshop(workshop.id);
        if (result.waitlisted) {
          alert("Quedaste en lista de espera. Te notificaremos si hay cupo.");
        }
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error al reservar");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-sm">
      <div
        className={`h-1 ${
          workshop.type === "IN_PERSON"
            ? "bg-primary-500"
            : workshop.type === "VIRTUAL"
              ? "bg-violet-500"
              : "bg-accent-500"
        }`}
      />
      <div className="p-4">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary line-clamp-2 md:text-base">
              {workshop.title}
            </h3>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {workshop.courseName} — {workshop.professorName}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary md:text-xs">
            <TypeIcon className="h-3 w-3" />
            {typeLabel[workshop.type]}
          </span>
        </div>

        {workshop.description && (
          <p className="mt-1 text-xs text-text-secondary line-clamp-2">
            {workshop.description}
          </p>
        )}

        {/* Details */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-secondary md:gap-4 md:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
            {formatDate(workshop.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-text-tertiary" />
            {formatTime(workshop.startTime)} - {formatTime(workshop.endTime)}
          </span>
          {workshop.locationName && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-text-tertiary" />
              {workshop.locationName}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-text-tertiary" />
            {isFull ? (
              <span className="text-red-600">Lleno</span>
            ) : (
              `${workshop.spotsLeft} lugares`
            )}
          </span>
        </div>

        {/* Book button */}
        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={handleBook}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white active:bg-primary-800 disabled:opacity-50 transition-colors md:w-auto md:rounded-lg md:py-2.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {isPending
              ? "Reservando..."
              : isFull
                ? "Lista de espera"
                : "Reservar lugar"}
          </button>
        </div>
      </div>
    </div>
  );
}
