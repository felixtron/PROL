"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Building2,
  Users,
  ExternalLink,
  Repeat,
  Pencil,
} from "lucide-react";
import { cancelAdvisorySession } from "@/lib/actions/advisory";

interface Session {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  audience: string;
  company: { id: string; name: string } | null;
  participants: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  }[];
  locationName: string | null;
  locationAddress: string | null;
  locationMapUrl: string | null;
  meetingUrl: string | null;
  startTime: Date;
  endTime: Date;
  recurrenceFrequency: string | null;
  parentSessionId: string | null;
  invitedAt: Date | null;
  series: { id: string; startTime: Date; status: string }[];
}

const DEFAULT_STATUS = {
  label: "Programada",
  color: "text-blue-700",
  bg: "bg-blue-50",
};

const statusConfig: Record<string, typeof DEFAULT_STATUS> = {
  DRAFT: { label: "Borrador", color: "text-amber-700", bg: "bg-amber-50" },
  SCHEDULED: DEFAULT_STATUS,
  COMPLETED: {
    label: "Finalizada",
    color: "text-text-secondary",
    bg: "bg-surface-secondary",
  },
  CANCELLED: { label: "Cancelada", color: "text-red-700", bg: "bg-red-50" },
};

const typeLabel: Record<string, string> = {
  IN_PERSON: "Presencial",
  VIRTUAL: "Virtual",
  HYBRID: "Híbrida",
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

export function AdvisoryDetail({ session }: { session: Session }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const status = statusConfig[session.status] ?? DEFAULT_STATUS;
  const seriesIndex = session.series.findIndex((s) => s.id === session.id);

  function handleCancel() {
    if (!confirm("¿Cancelar este proyecto? El cliente dejará de verlo.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelAdvisorySession(session.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-text-primary">
                {session.title}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}
              >
                {status.label}
              </span>
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary-700">
              {session.audience === "COMPANY" ? (
                <>
                  <Building2 className="h-4 w-4" />
                  {session.company?.name ?? "Empresa eliminada"}
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  {session.participants.length}{" "}
                  {session.participants.length === 1 ? "participante" : "participantes"}
                </>
              )}
            </p>

            {seriesIndex >= 0 && session.series.length > 1 && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-text-tertiary">
                <Repeat className="h-4 w-4" />
                Sesión {seriesIndex + 1} de {session.series.length}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {session.status !== "CANCELLED" && (
              <Link
                href={`/professor/advisory/${session.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            )}
            {(session.status === "SCHEDULED" || session.status === "DRAFT") && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {isPending ? "Cancelando..." : "Cancelar"}
              </button>
            )}
          </div>
        </div>

        {session.status === "DRAFT" && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Este proyecto es un <strong>borrador</strong>: el cliente no lo ve y
            no se ha enviado ninguna invitación. Publícalo desde Editar cuando
            esté listo.
          </div>
        )}

        {session.status !== "DRAFT" && !session.invitedAt && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Está publicado y el cliente lo ve en su panel, pero no salió correo
            de invitación. Puede que los destinatarios no tengan cuenta todavía.
          </div>
        )}

        {session.description && (
          <p className="mt-4 whitespace-pre-line text-sm text-text-secondary">
            {session.description}
          </p>
        )}

        <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
              <Calendar className="h-4 w-4" />
              Inicio
            </p>
            <p className="mt-0.5 text-sm text-text-secondary">
              {formatDateTime(session.startTime)}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
              <Clock className="h-4 w-4" />
              Fin
            </p>
            <p className="mt-0.5 text-sm text-text-secondary">
              {formatDateTime(session.endTime)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Modalidad</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              {typeLabel[session.type] ?? session.type}
            </p>
          </div>
        </div>

        {session.meetingUrl && (
          <div className="mt-4 rounded-lg border border-border bg-surface-secondary p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
              <Video className="h-4 w-4" />
              Enlace de reunión
            </p>
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 break-all text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {session.meetingUrl}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
        )}

        {(session.locationName || session.locationAddress) && (
          <div className="mt-4 rounded-lg border border-border bg-surface-secondary p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
              <MapPin className="h-4 w-4" />
              Ubicación
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {session.locationName}
              {session.locationAddress ? ` — ${session.locationAddress}` : ""}
            </p>
            {session.locationMapUrl && (
              <a
                href={session.locationMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Ver en el mapa
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {session.audience === "USERS" && session.participants.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Participantes
          </h2>
          <ul className="mt-4 divide-y divide-border">
            {session.participants.map((p) => (
              <li key={p.id} className="py-3">
                <p className="text-sm font-medium text-text-primary">
                  {p.name ?? p.email}
                </p>
                <p className="text-sm text-text-tertiary">{p.email}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
