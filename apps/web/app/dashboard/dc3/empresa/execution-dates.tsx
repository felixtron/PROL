"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Clock,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createDc3Edition,
  deleteDc3Edition,
  setEnrollmentDc3Edition,
  updateDc3Edition,
} from "@/lib/actions/dc3";
import { formatDc3Date, toDateInputValue } from "@/lib/dc3/dates";
import { DC3_ROLE_LABELS } from "@/lib/dc3/readiness";
import type { Dc3CompanyCourse } from "@/lib/queries/dc3";

const INPUT =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

type Edition = Dc3CompanyCourse["editions"][number];

/**
 * Fechas reales de ejecución de un curso, capturadas por el
 * administrador de cursos de la empresa.
 *
 * Se muestra el nombre OFICIAL del curso, no su título interno: es el que
 * saldrá impreso, y ver aquí "Copy v2 — piloto" mientras la constancia
 * dice otra cosa haría imposible detectar que está mal configurado.
 */
export function Dc3ExecutionDates({ course }: { course: Dc3CompanyCourse }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const isLive = course.deliveryMode === "LIVE";
  const pending = course.participants.filter(
    (p) => p.readiness.applicable && !p.readiness.ready && !p.issuedFolio
  ).length;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold text-text-primary md:text-base">
            {course.officialName ?? course.courseTitle}
          </h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {isLive ? "Curso en vivo" : "Curso en línea"}
            {course.durationHours && ` · ${course.durationHours} h`}
            {` · ${course.participants.length} participante(s)`}
            {pending > 0 && ` · ${pending} sin poder emitir`}
          </p>
          {!course.officialName && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Este curso todavía no tiene nombre oficial para el DC-3. Lo
              captura el {DC3_ROLE_LABELS.COURSE.toLowerCase()}.
            </p>
          )}
        </div>
        {isLive && !creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Registrar fechas
          </button>
        )}
      </div>

      {/* En línea el periodo no se captura: es la ventana propia de cada
          trabajador (inscripción → conclusión), y es distinta para cada
          uno. Decirlo evita que el administrador busque un formulario que
          no existe. */}
      {!isLive ? (
        <p className="mt-3 rounded-lg bg-surface-secondary px-3.5 py-3 text-xs text-text-secondary">
          Este curso es en línea: el periodo que se imprime en cada
          constancia es la ventana real de cada trabajador, de su
          inscripción al día en que concluyó. No hay fechas que capturar
          aquí.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {creating && (
            <EditionForm
              courseId={course.courseId}
              onDone={() => setCreating(false)}
              onCancel={() => setCreating(false)}
            />
          )}

          {course.editions.length === 0 && !creating && (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-text-tertiary">
              Todavía no hay fechas registradas. Sin ellas, ninguna
              constancia de este curso puede emitirse.
            </p>
          )}

          {course.editions.map((edition) =>
            editing === edition.id ? (
              <EditionForm
                key={edition.id}
                courseId={course.courseId}
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
      )}

      <Participants course={course} />
    </div>
  );
}

function EditionRow({
  edition,
  onEdit,
}: {
  edition: Edition;
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-text-primary">
              {edition.name}
            </p>
            {!edition.ownedByCompany && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                <Lock className="h-3 w-3" />
                Registrada por la plataforma
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {formatDc3Date(new Date(edition.startDate))} —{" "}
            {formatDc3Date(new Date(edition.endDate))}
            {edition.durationHours && ` · ${edition.durationHours} h`}
            {edition.instructorName && ` · ${edition.instructorName}`}
          </p>
        </div>

        {/* Las fechas del tenant las comparten varias empresas: editarlas
            desde aquí cambiaría el periodo impreso en las constancias de
            otro patrón. Se pueden usar, no tocar. */}
        {edition.ownedByCompany && (
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
        )}
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
  edition?: Edition;
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
      className="rounded-lg border border-primary-200 bg-surface-secondary p-4"
    >
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Nombre de la generación
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            placeholder="Generación marzo 2026 — planta Monterrey"
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
            Instructor o tutor{" "}
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
          {edition ? "Guardar cambios" : "Registrar fechas"}
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

/**
 * Quién está esperando qué.
 *
 * Cada fila nombra al responsable de lo que falta —trabajador, empresa o
 * plataforma— porque el administrador no puede arreglar la CURP de nadie
 * y necesita saber a quién ir a buscar en vez de mirar una lista de
 * bloqueos sin dueño.
 */
function Participants({ course }: { course: Dc3CompanyCourse }) {
  const isLive = course.deliveryMode === "LIVE";

  if (course.participants.length === 0) return null;

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h4 className="text-xs font-semibold text-text-primary">
        Participantes
      </h4>
      <div className="mt-2 space-y-2">
        {course.participants.map((p) => (
          <ParticipantRow
            key={p.enrollmentId}
            participant={p}
            editions={course.editions}
            showEditionPicker={isLive}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipantRow({
  participant,
  editions,
  showEditionPicker,
}: {
  participant: Dc3CompanyCourse["participants"][number];
  editions: Edition[];
  showEditionPicker: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const { readiness } = participant;

  function handleEdition(editionId: string) {
    setError("");
    startTransition(async () => {
      try {
        await setEnrollmentDc3Edition(
          participant.enrollmentId,
          editionId || null
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al asignar las fechas"
        );
      }
    });
  }

  return (
    <div className="rounded-lg border border-border px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm text-text-primary">
            {participant.studentName ?? participant.studentEmail}
          </p>
          <p className="truncate text-[11px] text-text-tertiary">
            {participant.studentEmail}
          </p>
        </div>
        <ParticipantBadge participant={participant} />
      </div>

      {showEditionPicker && !participant.issuedFolio && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <label className="text-[11px] text-text-tertiary">Fechas:</label>
          <select
            value={participant.editionId ?? ""}
            onChange={(e) => handleEdition(e.target.value)}
            disabled={pending || editions.length === 0}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:border-primary-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">Sin asignar</option>
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name}
              </option>
            ))}
          </select>
          {pending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-text-tertiary" />
          )}
        </div>
      )}

      {readiness.applicable && readiness.missing.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {readiness.missing.map((m) => (
            <li
              key={`${m.role}-${m.field}`}
              className="text-[11px] text-amber-800"
            >
              • {m.label}{" "}
              <span className="text-amber-600">
                — lo captura: {DC3_ROLE_LABELS[m.role]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ParticipantBadge({
  participant,
}: {
  participant: Dc3CompanyCourse["participants"][number];
}) {
  const base =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium";
  const { readiness, issuedFolio } = participant;

  if (issuedFolio) {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700`}>
        <BadgeCheck className="h-3 w-3" />
        Emitida · {issuedFolio}
      </span>
    );
  }
  if (!readiness.applicable) {
    return (
      <span className={`${base} bg-surface-tertiary text-text-secondary`}>
        No aplica
      </span>
    );
  }
  if (readiness.ready) {
    return (
      <span className={`${base} bg-blue-50 text-blue-700`}>Lista para emitir</span>
    );
  }
  if (!readiness.completed) {
    return (
      <span className={`${base} bg-surface-tertiary text-text-secondary`}>
        <Clock className="h-3 w-3" />
        Curso en progreso
      </span>
    );
  }
  return (
    <span className={`${base} bg-amber-50 text-amber-700`}>
      <AlertCircle className="h-3 w-3" />
      Datos incompletos
    </span>
  );
}
