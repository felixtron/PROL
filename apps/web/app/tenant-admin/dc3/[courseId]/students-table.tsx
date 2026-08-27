"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Users } from "lucide-react";
import { DC3_ROLE_LABELS, type Dc3Readiness } from "@/lib/dc3/readiness";
import { generateDc3, setEnrollmentDc3Edition } from "@/lib/actions/dc3";

export interface Dc3StudentRow {
  enrollmentId: string;
  studentId: string;
  studentName: string | null;
  companyName: string | null;
  status: string;
  completedAt: Date | null;
  editionId: string | null;
  readiness: Dc3Readiness;
  dc3: {
    id: string;
    folio: string;
    status: string;
    issuedAt: Date;
    printCount: number;
  } | null;
}

/**
 * Alumnos del curso con su estado DC-3.
 *
 * Es la vista que permite desatascar: dice quién no puede imprimir y qué
 * falta, y deja asignar la edición (de donde salen las fechas reales) sin
 * salir de aquí.
 */
export function Dc3StudentsTable({
  students,
  editions,
  deliveryMode,
}: {
  students: Dc3StudentRow[];
  editions: { id: string; name: string }[];
  deliveryMode: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary-500" />
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Alumnos
        </h2>
      </div>
      <p className="mt-1 text-xs text-text-tertiary">
        Estado de la constancia de cada inscrito. Sólo aplica a quienes
        pertenecen a una empresa con patrón registrado.
      </p>

      <div className="mt-4 space-y-2">
        {students.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-text-tertiary">
            Nadie inscrito todavía.
          </p>
        )}
        {students.map((s) => (
          <StudentRow
            key={s.enrollmentId}
            student={s}
            editions={editions}
            deliveryMode={deliveryMode}
          />
        ))}
      </div>
    </div>
  );
}

function StudentRow({
  student,
  editions,
  deliveryMode,
}: {
  student: Dc3StudentRow;
  editions: { id: string; name: string }[];
  deliveryMode: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleEditionChange(editionId: string) {
    setError("");
    startTransition(async () => {
      try {
        await setEnrollmentDc3Edition(student.enrollmentId, editionId || null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al asignar");
      }
    });
  }

  function handleGenerate() {
    setError("");
    startTransition(async () => {
      try {
        await generateDc3(student.enrollmentId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al emitir");
      }
    });
  }

  const { readiness } = student;

  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            {student.studentName ?? "Sin nombre"}
          </p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {student.companyName ?? "Sin empresa"} ·{" "}
            {student.completedAt
              ? `Concluido el ${new Date(
                  student.completedAt
                ).toLocaleDateString("es-MX")}`
              : "En progreso"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {student.dc3 ? (
            <a
              href={`/api/dc3/${student.dc3.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary"
            >
              {student.dc3.folio}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : readiness.ready ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Emitir DC-3
            </button>
          ) : (
            <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
              {!readiness.applicable
                ? "No aplica"
                : !readiness.completed
                  ? "En progreso"
                  : "Datos incompletos"}
            </span>
          )}
        </div>
      </div>

      {/* La edición sólo se ofrece cuando el curso es en vivo: en línea el
          periodo lo dan las fechas propias del alumno. */}
      {deliveryMode === "LIVE" && readiness.applicable && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <label className="text-xs text-text-tertiary">Edición:</label>
          <select
            value={student.editionId ?? ""}
            onChange={(e) => handleEditionChange(e.target.value)}
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
          {editions.length === 0 && (
            <span className="text-xs text-amber-700">
              Registra una edición primero.
            </span>
          )}
        </div>
      )}

      {readiness.applicable && readiness.missing.length > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          Falta:{" "}
          {readiness.missing
            .map((m) => `${m.label} (${DC3_ROLE_LABELS[m.role]})`)
            .join("; ")}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
