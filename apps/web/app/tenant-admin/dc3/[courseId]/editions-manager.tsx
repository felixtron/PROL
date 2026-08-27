"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createDc3Edition,
  deleteDc3Edition,
  updateDc3Edition,
} from "@/lib/actions/dc3";
import { formatDc3Date, toDateInputValue } from "@/lib/dc3/dates";

const INPUT =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

export interface Dc3EditionRow {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  durationHours: number | null;
  instructorName: string | null;
  _count: { enrollments: number };
}

/**
 * Ediciones de un curso en vivo: las fechas REALES de impartición.
 *
 * Existe porque la fecha programada y la impartida difieren a menudo, y
 * porque una misma plantilla de curso se da muchas veces. Sin esto, todas
 * las generaciones recibirían el mismo periodo, que sería falso para
 * todas menos una.
 */
export function Dc3EditionsManager({
  courseId,
  editions,
  deliveryMode,
}: {
  courseId: string;
  editions: Dc3EditionRow[];
  deliveryMode: string;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary-500" />
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Ediciones e impartición
          </h2>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nueva edición
          </button>
        )}
      </div>

      {deliveryMode === "ONLINE" ? (
        <p className="mt-1 text-xs text-text-tertiary">
          Este curso está configurado como en línea: el periodo de ejecución de
          cada DC-3 se toma de la ventana real del alumno (inscripción →
          conclusión), así que no necesita ediciones. Puedes registrarlas de
          todas formas si organizas generaciones con fechas propias.
        </p>
      ) : (
        <p className="mt-1 text-xs text-text-tertiary">
          Este curso es en vivo: cada alumno necesita estar asignado a una
          edición para que su constancia tenga periodo de ejecución.
        </p>
      )}

      {creating && (
        <EditionForm
          courseId={courseId}
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="mt-4 space-y-2">
        {editions.length === 0 && !creating && (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-text-tertiary">
            Todavía no hay ediciones registradas.
          </p>
        )}

        {editions.map((edition) =>
          editing === edition.id ? (
            <EditionForm
              key={edition.id}
              courseId={courseId}
              edition={edition}
              onDone={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <EditionRow
              key={edition.id}
              edition={edition}
              onEdit={() => {
                setEditing(edition.id);
                setCreating(false);
              }}
            />
          )
        )}
      </div>
    </div>
  );
}

function EditionRow({
  edition,
  onEdit,
}: {
  edition: Dc3EditionRow;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    setError("");
    startTransition(async () => {
      try {
        await deleteDc3Edition(edition.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  }

  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">
            {edition.name}
          </p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {formatDc3Date(new Date(edition.startDate))} —{" "}
            {formatDc3Date(new Date(edition.endDate))}
            {edition.durationHours && ` · ${edition.durationHours} h`}
            {edition.instructorName && ` · ${edition.instructorName}`}
            {` · ${edition._count.enrollments} alumno(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Eliminar
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function EditionForm({
  courseId,
  edition,
  onDone,
  onCancel,
}: {
  courseId: string;
  edition?: Dc3EditionRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState(edition?.name ?? "");
  const [startDate, setStartDate] = useState(
    edition ? toDateInputValue(new Date(edition.startDate)) : ""
  );
  const [endDate, setEndDate] = useState(
    edition ? toDateInputValue(new Date(edition.endDate)) : ""
  );
  const [durationHours, setDurationHours] = useState(
    edition?.durationHours ? String(edition.durationHours) : ""
  );
  const [instructorName, setInstructorName] = useState(
    edition?.instructorName ?? ""
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const formData = new FormData();
    formData.set("name", name);
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    formData.set("durationHours", durationHours);
    formData.set("instructorName", instructorName);

    startTransition(async () => {
      try {
        if (edition) {
          await updateDc3Edition(edition.id, formData);
        } else {
          await createDc3Edition(courseId, formData);
        }
        router.refresh();
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-lg border border-primary-200 bg-surface-secondary p-4"
    >
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Nombre de la edición
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            placeholder="Generación marzo 2026 — Monterrey"
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Fecha real de inicio
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Fecha real de término
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Duración en horas{" "}
            <span className="font-normal text-text-tertiary">
              (si difiere del curso)
            </span>
          </label>
          <input
            type="number"
            min={1}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Instructor{" "}
            <span className="font-normal text-text-tertiary">
              (si difiere del curso)
            </span>
          </label>
          <input
            value={instructorName}
            onChange={(e) => setInstructorName(e.target.value)}
            maxLength={120}
            className={INPUT}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending || !name || !startDate || !endDate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {edition ? "Guardar cambios" : "Crear edición"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
