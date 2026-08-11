"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Video,
  Calendar,
  Repeat,
  Link2,
  Building2,
  Users,
} from "lucide-react";
import { createAdvisorySession } from "@/lib/actions/advisory";

interface CompanyOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
  companyName: string | null;
}

const sessionTypes = [
  { value: "VIRTUAL", label: "Virtual", icon: Video },
  { value: "IN_PERSON", label: "Presencial", icon: MapPin },
  { value: "HYBRID", label: "Híbrida", icon: Calendar },
];

export function AdvisoryForm({
  companies,
  users,
  meetAvailable,
}: {
  companies: CompanyOption[];
  users: UserOption[];
  /** La academia tiene una cuenta de Google conectada para generar Meets */
  meetAvailable: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sessionType, setSessionType] = useState("VIRTUAL");
  const [audience, setAudience] = useState<"COMPANY" | "USERS">("COMPANY");
  const [companyId, setCompanyId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState("");
  const [autoMeet, setAutoMeet] = useState(meetAvailable);
  const [error, setError] = useState<string | null>(null);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    if (audience === "COMPANY" && !companyId) {
      setError("Selecciona la empresa a la que va dirigida la asesoría.");
      return;
    }
    if (audience === "USERS" && participantIds.length === 0) {
      setError("Selecciona al menos un participante.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createAdvisorySession(formData);
        if (result.success) {
          router.push("/professor/advisory");
          return;
        }
        setError(result.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al agendar la asesoría");
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Modalidad */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text-primary">
          Modalidad
        </label>
        <div className="grid grid-cols-3 gap-3">
          {sessionTypes.map((t) => {
            const Icon = t.icon;
            const isSelected = sessionType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setSessionType(t.value)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-border bg-surface text-text-secondary hover:border-primary-200"
                }`}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="type" value={sessionType} />
      </div>

      {/* Título */}
      <div>
        <label
          htmlFor="title"
          className="mb-1.5 block text-sm font-medium text-text-primary"
        >
          Título de la asesoría
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          placeholder="Ej: Seguimiento implementación ISO 27001"
        />
      </div>

      {/* Descripción */}
      <div>
        <label
          htmlFor="description"
          className="mb-1.5 block text-sm font-medium text-text-primary"
        >
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          placeholder="Temas a revisar, entregables esperados..."
        />
      </div>

      {/* Audiencia */}
      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium text-text-primary">
          ¿A quién va dirigida?
        </legend>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAudience("COMPANY")}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
              audience === "COMPANY"
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-border bg-surface text-text-secondary hover:border-primary-200"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Una empresa
          </button>
          <button
            type="button"
            onClick={() => setAudience("USERS")}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
              audience === "USERS"
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-border bg-surface text-text-secondary hover:border-primary-200"
            }`}
          >
            <Users className="h-4 w-4" />
            Personas específicas
          </button>
        </div>
        <input type="hidden" name="audience" value={audience} />

        {audience === "COMPANY" ? (
          companies.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Tu academia todavía no tiene empresas dadas de alta.
            </p>
          ) : (
            <div>
              <label
                htmlFor="companyId"
                className="mb-1.5 block text-sm font-medium text-text-secondary"
              >
                Empresa
              </label>
              <select
                id="companyId"
                name="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Seleccionar empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-text-tertiary">
                La verán todos los miembros de la empresa.
              </p>
            </div>
          )
        ) : users.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu academia todavía no tiene usuarios registrados.
          </p>
        ) : (
          <div>
            <p className="mb-2 text-sm font-medium text-text-secondary">
              Participantes ({participantIds.length} seleccionados)
            </p>
            <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
              {users.map((u) => {
                const isSelected = participantIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isSelected ? "bg-primary-50" : "hover:bg-surface-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="participantIds"
                      value={u.id}
                      checked={isSelected}
                      onChange={() => toggleParticipant(u.id)}
                      className="h-4 w-4 rounded border-border text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text-primary">
                        {u.name ?? u.email}
                      </span>
                      <span className="block truncate text-xs text-text-tertiary">
                        {u.email}
                        {u.companyName ? ` · ${u.companyName}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </fieldset>

      {/* Fecha y hora */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="startTime"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Fecha y hora de inicio
          </label>
          <input
            type="datetime-local"
            id="startTime"
            name="startTime"
            required
            className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <div>
          <label
            htmlFor="endTime"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Fecha y hora de fin
          </label>
          <input
            type="datetime-local"
            id="endTime"
            name="endTime"
            required
            className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      {/* Recurrencia */}
      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="flex items-center gap-1.5 px-2 text-sm font-medium text-text-primary">
          <Repeat className="h-4 w-4" />
          Recurrencia (opcional)
        </legend>
        <p className="text-xs text-text-tertiary">
          Para acompañamientos largos. Cada ocurrencia se gestiona por separado.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="recurrence"
              className="mb-1.5 block text-sm font-medium text-text-secondary"
            >
              Frecuencia
            </label>
            <select
              id="recurrence"
              name="recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Sesión única</option>
              <option value="DAILY">Diaria</option>
              <option value="WEEKLY">Semanal</option>
              <option value="BIWEEKLY">Cada dos semanas</option>
              <option value="MONTHLY">Mensual</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="occurrences"
              className="mb-1.5 block text-sm font-medium text-text-secondary"
            >
              Número de ocurrencias
            </label>
            <input
              type="number"
              id="occurrences"
              name="occurrences"
              min={1}
              max={26}
              defaultValue={1}
              disabled={!recurrence}
              className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50"
            />
          </div>
        </div>
      </fieldset>

      {/* Ubicación presencial */}
      {(sessionType === "IN_PERSON" || sessionType === "HYBRID") && (
        <fieldset className="space-y-4 rounded-lg border border-border p-4">
          <legend className="px-2 text-sm font-medium text-text-primary">
            Ubicación
          </legend>
          <div>
            <label
              htmlFor="locationName"
              className="mb-1.5 block text-sm font-medium text-text-secondary"
            >
              Nombre del lugar
            </label>
            <input
              type="text"
              id="locationName"
              name="locationName"
              className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="Ej: Oficinas del cliente"
            />
          </div>
          <div>
            <label
              htmlFor="locationAddress"
              className="mb-1.5 block text-sm font-medium text-text-secondary"
            >
              Dirección
            </label>
            <input
              type="text"
              id="locationAddress"
              name="locationAddress"
              className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="Calle, número, ciudad"
            />
          </div>
          <div>
            <label
              htmlFor="locationMapUrl"
              className="mb-1.5 block text-sm font-medium text-text-secondary"
            >
              Enlace de Google Maps (opcional)
            </label>
            <input
              type="url"
              id="locationMapUrl"
              name="locationMapUrl"
              className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="https://maps.google.com/..."
            />
          </div>
        </fieldset>
      )}

      {/* Enlace de reunión */}
      {(sessionType === "VIRTUAL" || sessionType === "HYBRID") && (
        <fieldset className="space-y-4 rounded-lg border border-border p-4">
          <legend className="flex items-center gap-1.5 px-2 text-sm font-medium text-text-primary">
            <Link2 className="h-4 w-4" />
            Enlace de reunión
          </legend>

          {meetAvailable ? (
            <>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="autoMeet"
                  checked={autoMeet}
                  onChange={(e) => setAutoMeet(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                />
                <span>
                  <span className="block text-sm font-medium text-text-primary">
                    Generar enlace de Google Meet automáticamente
                  </span>
                  <span className="mt-0.5 block text-xs text-text-tertiary">
                    Se creará la reunión en el calendario de tu academia.
                    {recurrence ? " Toda la serie compartirá el mismo enlace." : ""}
                  </span>
                </span>
              </label>

              {!autoMeet && (
                <div>
                  <label
                    htmlFor="meetingUrl"
                    className="mb-1.5 block text-sm font-medium text-text-secondary"
                  >
                    Enlace propio (Zoom, Teams, etc.)
                  </label>
                  <input
                    type="url"
                    id="meetingUrl"
                    name="meetingUrl"
                    className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label
                  htmlFor="meetingUrl"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Enlace de reunión
                </label>
                <input
                  type="url"
                  id="meetingUrl"
                  name="meetingUrl"
                  className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              <p className="text-xs text-text-tertiary">
                Para que el enlace de Meet se genere solo, un administrador debe
                conectar la cuenta de Google de la academia en Configuración.
              </p>
            </>
          )}
        </fieldset>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Agendando..." : "Agendar asesoría"}
        </button>
        <Link
          href="/professor/advisory"
          className="text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
