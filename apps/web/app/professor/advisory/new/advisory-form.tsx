"use client";

import { useState, useTransition } from "react";
import { toZonedInputValue } from "@/lib/timezone";
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
  FileText,
} from "lucide-react";
import {
  createAdvisorySession,
  updateAdvisorySession,
} from "@/lib/actions/advisory";

interface CompanyOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
  role: string;
  companyId: string | null;
  companyName: string | null;
}

const sessionTypes = [
  { value: "VIRTUAL", label: "Virtual", icon: Video },
  { value: "IN_PERSON", label: "Presencial", icon: MapPin },
  { value: "HYBRID", label: "Híbrida", icon: Calendar },
];

/** Valores iniciales cuando el formulario se usa para editar. */
export interface AdvisoryInitialValues {
  id: string;
  title: string;
  description: string | null;
  type: string;
  audience: string;
  companyId: string | null;
  participantIds: string[];
  startTime: Date;
  endTime: Date;
  locationName: string | null;
  locationAddress: string | null;
  locationMapUrl: string | null;
  meetingUrl: string | null;
  status: string;
  invitedAt: Date | null;
}


export function AdvisoryForm({
  companies,
  users,
  meetAvailable,
  initial,
}: {
  companies: CompanyOption[];
  users: UserOption[];
  /** La academia tiene una cuenta de Google conectada para generar Meets */
  meetAvailable: boolean;
  /** Presente sólo en edición */
  initial?: AdvisoryInitialValues;
}) {
  const isEdit = Boolean(initial);
  const isDraft = initial?.status === "DRAFT";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sessionType, setSessionType] = useState(initial?.type ?? "VIRTUAL");
  const [audience, setAudience] = useState<"COMPANY" | "USERS">(
    initial?.audience === "USERS" ? "USERS" : "COMPANY",
  );
  const [companyId, setCompanyId] = useState(initial?.companyId ?? "");
  const [participantIds, setParticipantIds] = useState<string[]>(
    initial?.participantIds ?? [],
  );
  // Una sesión de empresa va a toda la plantilla o sólo a quienes se marquen.
  // No hay columna que lo diga: al editar, tener convocados ES el modo
  // "sólo algunos" (la misma regla que aplican el correo y el panel).
  const [companyScope, setCompanyScope] = useState<"ALL" | "SELECTED">(
    initial?.audience === "COMPANY" && (initial?.participantIds.length ?? 0) > 0
      ? "SELECTED"
      : "ALL",
  );
  const [recurrence, setRecurrence] = useState("");
  const [autoMeet, setAutoMeet] = useState(meetAvailable && !isEdit);
  const [error, setError] = useState<string | null>(null);

  const companyMembers = companyId
    ? users.filter((u) => u.companyId === companyId)
    : [];
  // Convocar personas sueltas sigue siendo cosa de alumnos; la consulta trae
  // además miembros de empresa de otros roles, que sólo aplican al modo empresa.
  const studentOptions = users.filter((u) => u.role === "STUDENT");

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  /**
   * Cambiar de audiencia limpia la selección: los marcados de un modo no son
   * válidos en el otro, y arrastrarlos dejaba el contador señalando gente que
   * ya no aparece en la lista.
   */
  function changeAudience(next: "COMPANY" | "USERS") {
    if (next === audience) return;
    setAudience(next);
    setParticipantIds([]);
  }

  /** Al cambiar de empresa se descartan los marcados de la anterior. */
  function changeCompany(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    const memberIds = new Set(
      users.filter((u) => u.companyId === nextCompanyId).map((u) => u.id),
    );
    setParticipantIds((prev) => prev.filter((id) => memberIds.has(id)));
  }

  function submitWith(draft: boolean) {
    return async (formData: FormData) => {
      setError(null);
      if (audience === "COMPANY" && !companyId) {
        setError("Selecciona la empresa a la que va dirigida la consultoría.");
        return;
      }
      if (
        audience === "COMPANY" &&
        companyScope === "SELECTED" &&
        participantIds.length === 0
      ) {
        setError("Selecciona a los miembros que asistirán, o invita a toda la empresa.");
        return;
      }
      if (audience === "USERS" && participantIds.length === 0) {
        setError("Selecciona al menos un participante.");
        return;
      }
      if (draft) formData.set("saveAsDraft", "1");

      startTransition(async () => {
        try {
          const result = initial
            ? await updateAdvisorySession(initial.id, formData)
            : await createAdvisorySession(formData);
          if (result.success) {
            router.push("/professor/advisory");
            router.refresh();
            return;
          }
          setError(result.error);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error al guardar el proyecto");
        }
      });
    };
  }

  // `action` fija el submit por defecto (publicar); el botón de borrador usa
  // formAction para enviar el mismo formulario por el otro camino.
  const handleSubmit = submitWith(false);
  const handleDraft = submitWith(true);

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
          Título del proyecto
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          placeholder="Ej: Implementación ISO 27001 — Fase 1"
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
          defaultValue={initial?.description ?? ""}
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
            onClick={() => changeAudience("COMPANY")}
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
            onClick={() => changeAudience("USERS")}
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
            <div className="space-y-4">
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
                  onChange={(e) => changeCompany(e.target.value)}
                  className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Seleccionar empresa</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {companyId && (
                <div>
                  <p className="mb-2 text-sm font-medium text-text-secondary">
                    ¿Quiénes asisten?
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ScopeOption
                      selected={companyScope === "ALL"}
                      onClick={() => setCompanyScope("ALL")}
                      title="Toda la empresa"
                      detail={
                        companyMembers.length === 1
                          ? "1 miembro"
                          : `${companyMembers.length} miembros`
                      }
                    />
                    <ScopeOption
                      selected={companyScope === "SELECTED"}
                      onClick={() => setCompanyScope("SELECTED")}
                      title="Sólo algunos"
                      detail="Eliges a quién invitar"
                    />
                  </div>

                  {companyScope === "ALL" ? (
                    <p className="mt-2 text-xs text-text-tertiary">
                      La invitación le llegará a todos los miembros de la empresa,
                      incluidos los que se den de alta más adelante.
                    </p>
                  ) : companyMembers.length === 0 ? (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Esta empresa todavía no tiene miembros registrados.
                    </p>
                  ) : (
                    <div className="mt-3">
                      <ParticipantList
                        users={companyMembers}
                        selected={participantIds}
                        onToggle={toggleParticipant}
                      />
                      <p className="mt-2 text-xs text-text-tertiary">
                        Sólo los marcados reciben el correo y ven el proyecto en su
                        panel. El correo les sugiere reenviarlo a sus compañeros.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        ) : studentOptions.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu academia todavía no tiene usuarios registrados.
          </p>
        ) : (
          <ParticipantList
            users={studentOptions}
            selected={participantIds}
            onToggle={toggleParticipant}
          />
        )}
        {/* El alcance viaja aparte: sin él, "toda la empresa" y "algunos, pero
            ninguno marcado" llegarían idénticos al servidor. */}
        <input
          type="hidden"
          name="companyScope"
          value={audience === "COMPANY" ? companyScope : "ALL"}
        />
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
            defaultValue={initial ? toZonedInputValue(initial.startTime) : undefined}
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
            defaultValue={initial ? toZonedInputValue(initial.endTime) : undefined}
            className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      {/* Recurrencia — sólo al crear: editar una ocurrencia no regenera la serie */}
      {!isEdit && (
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
      )}

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
              defaultValue={initial?.locationName ?? ""}
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
              defaultValue={initial?.locationAddress ?? ""}
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
              defaultValue={initial?.locationMapUrl ?? ""}
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
                    defaultValue={initial?.meetingUrl ?? ""}
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
                  defaultValue={initial?.meetingUrl ?? ""}
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

      <div className="space-y-3 border-t border-border pt-6">
        {/* Al publicar se avisa por correo; conviene decirlo antes de apretar */}
        <p className="text-xs text-text-tertiary">
          {isEdit && !isDraft
            ? "Los destinatarios ya fueron notificados. Si cambias la fecha u hora, se les enviará un aviso de reprogramación."
            : "Al publicar se enviará la invitación por correo a los destinatarios. Un borrador no notifica a nadie."}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending
              ? "Guardando..."
              : isEdit && !isDraft
                ? "Guardar cambios"
                : "Publicar y notificar"}
          </button>

          {/* Guardar como borrador sólo tiene sentido antes de publicar */}
          {(!isEdit || isDraft) && (
            <button
              type="submit"
              formAction={handleDraft}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Guardar como borrador
            </button>
          )}

          <Link
            href="/professor/advisory"
            className="text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}

/** Botón de "toda la empresa" / "sólo algunos". */
function ScopeOption({
  selected,
  onClick,
  title,
  detail,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-lg border-2 px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-primary-500 bg-primary-50"
          : "border-border bg-surface hover:border-primary-200"
      }`}
    >
      <span
        className={`block text-sm font-medium ${
          selected ? "text-primary-700" : "text-text-primary"
        }`}
      >
        {title}
      </span>
      <span className="block text-xs text-text-tertiary">{detail}</span>
    </button>
  );
}

/**
 * Lista de casillas de personas. La comparten los dos modos de audiencia:
 * elegir miembros de una empresa y convocar personas sueltas.
 */
function ParticipantList({
  users,
  selected,
  onToggle,
}: {
  users: UserOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-secondary">
        Participantes ({selected.length} seleccionados)
      </p>
      <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
        {users.map((u) => {
          const isSelected = selected.includes(u.id);
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
                onChange={() => onToggle(u.id)}
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
  );
}
