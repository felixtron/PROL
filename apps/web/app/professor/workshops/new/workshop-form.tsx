"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Video, Calendar, Repeat } from "lucide-react";
import { createWorkshop } from "@/lib/actions/workshop";

interface Course {
  id: string;
  title: string;
  modules: { id: string; title: string; position: number }[];
}

const workshopTypes = [
  { value: "IN_PERSON", label: "Presencial", icon: MapPin },
  { value: "VIRTUAL", label: "Virtual", icon: Video },
  { value: "HYBRID", label: "Híbrido", icon: Calendar },
];

export function WorkshopForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [workshopType, setWorkshopType] = useState("IN_PERSON");
  const [recurrence, setRecurrence] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createWorkshop(formData);
        if (result.success) {
          router.push("/professor/workshops");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear el workshop");
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

      {/* Workshop type */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text-primary">
          Tipo de sesión
        </label>
        <div className="grid grid-cols-3 gap-3">
          {workshopTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = workshopType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setWorkshopType(type.value)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-border bg-surface text-text-secondary hover:border-primary-200"
                }`}
              >
                <Icon className="h-5 w-5" />
                {type.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="type" value={workshopType} />
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="mb-1.5 block text-sm font-medium text-text-primary"
        >
          Título del workshop
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          placeholder="Ej: Taller Presencial de Facebook Ads"
        />
      </div>

      {/* Description */}
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
          placeholder="Describe de qué trata el workshop y qué necesitan traer los asistentes..."
        />
      </div>

      {/* Course + Module */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="courseId"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Curso asociado
          </label>
          <select
            id="courseId"
            name="courseId"
            required
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Seleccionar curso</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="moduleId"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Módulo (opcional)
          </label>
          <select
            id="moduleId"
            name="moduleId"
            disabled={!selectedCourse}
            className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50"
          >
            <option value="">Sin módulo específico</option>
            {selectedCourse?.modules.map((m, idx) => (
              <option key={m.id} value={m.id}>
                Módulo {idx + 1}: {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date & time */}
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

      {/* Recurrence (optional) */}
      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="flex items-center gap-1.5 px-2 text-sm font-medium text-text-primary">
          <Repeat className="h-4 w-4" />
          Recurrencia (opcional)
        </legend>
        <p className="text-xs text-text-tertiary">
          Si la sesión se repite, generaremos una serie con el mismo horario y
          configuración. Cada ocurrencia se gestiona por separado.
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

      {/* Capacity */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="maxAttendees"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Cupo máximo
          </label>
          <input
            type="number"
            id="maxAttendees"
            name="maxAttendees"
            min={1}
            defaultValue={20}
            className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <div>
          <label
            htmlFor="minAttendees"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Mínimo de asistentes
          </label>
          <input
            type="number"
            id="minAttendees"
            name="minAttendees"
            min={1}
            defaultValue={3}
            className="block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      {/* Location (visible for IN_PERSON and HYBRID) */}
      {(workshopType === "IN_PERSON" || workshopType === "HYBRID") && (
        <fieldset className="space-y-4 rounded-lg border border-border p-4">
          <legend className="px-2 text-sm font-medium text-text-primary">
            Ubicación presencial
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
              placeholder="Ej: WeWork Reforma"
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
              placeholder="Paseo de la Reforma 296, CDMX"
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

      {/* Meeting URL (visible for VIRTUAL and HYBRID) */}
      {(workshopType === "VIRTUAL" || workshopType === "HYBRID") && (
        <div>
          <label
            htmlFor="meetingUrl"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Enlace de reunión (Zoom, Meet, etc.)
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

      {/* Submit */}
      <div className="flex items-center gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Creando..." : "Crear Workshop"}
        </button>
        <a
          href="/professor/workshops"
          className="text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
