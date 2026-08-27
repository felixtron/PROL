"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
} from "lucide-react";
import { DC3_ROLE_LABELS, type Dc3Readiness } from "@/lib/dc3/readiness";
import { generateDc3 } from "@/lib/actions/dc3";
import {
  Dc3PostPrintNotice,
  Dc3ResponsibilityNotice,
} from "@/components/dc3-notice";

export interface Dc3CourseRowData {
  enrollmentId: string;
  courseTitle: string;
  completedAt: Date | null;
  readiness: Dc3Readiness;
  dc3: {
    id: string;
    folio: string;
    status: string;
    issuedAt: Date;
    printCount: number;
    lastPrintedAt: Date | null;
  } | null;
}

/**
 * Una fila por curso: dice si la constancia se puede emitir, y si no, qué
 * falta y quién tiene que completarlo.
 *
 * Nombrar al responsable importa: un alumno no puede arreglar el RFC de su
 * patrón, y sin esa pista se queda mirando un botón deshabilitado sin
 * saber a quién ir a buscar.
 */
export function Dc3CourseRow({ row }: { row: Dc3CourseRowData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [justIssued, setJustIssued] = useState<string | null>(null);

  const { readiness, dc3 } = row;

  function handleGenerate() {
    setError("");
    startTransition(async () => {
      try {
        const result = await generateDc3(row.enrollmentId);
        setJustIssued(result.dc3Id);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al generar el DC-3"
        );
      }
    });
  }

  const pdfHref = dc3 ? `/api/dc3/${dc3.id}/pdf` : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-sm font-semibold text-text-primary md:text-base">
            {row.courseTitle}
          </h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {row.completedAt
              ? `Concluido el ${new Date(row.completedAt).toLocaleDateString(
                  "es-MX",
                  { year: "numeric", month: "long", day: "numeric" }
                )}`
              : "Curso en progreso"}
          </p>
        </div>
        <StatusBadge readiness={readiness} dc3={dc3} />
      </div>

      {/* No aplica: no es un dato que falte, es un documento que no le
          corresponde a esta persona en este curso. */}
      {!readiness.applicable && (
        <p className="mt-3 text-xs text-text-secondary">
          {readiness.notApplicableReason}
        </p>
      )}

      {readiness.applicable && !readiness.completed && (
        <p className="mt-3 text-xs text-text-secondary">
          La constancia DC-3 se habilita al concluir el curso.
        </p>
      )}

      {readiness.applicable && readiness.missing.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
          <p className="text-xs font-semibold text-amber-900">
            Faltan datos para poder emitir la constancia:
          </p>
          <ul className="mt-2 space-y-1">
            {readiness.missing.map((m) => (
              <li key={`${m.role}-${m.field}`} className="text-xs text-amber-900">
                • {m.label}{" "}
                <span className="text-amber-700">
                  — {DC3_ROLE_LABELS[m.role]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Ya emitida: sólo queda reimprimir, y cada copia queda registrada. */}
      {dc3 && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-surface-secondary px-3.5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[11px] text-text-tertiary">
                Folio de control
              </span>
              <span className="font-mono text-xs text-text-secondary">
                {dc3.folio}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-text-tertiary">
              Emitida el{" "}
              {new Date(dc3.issuedAt).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {dc3.printCount > 0 && (
                <>
                  {" · "}
                  {dc3.printCount}{" "}
                  {dc3.printCount === 1 ? "impresión" : "impresiones"}
                </>
              )}
            </p>
          </div>

          {justIssued && <Dc3PostPrintNotice />}

          <a
            href={pdfHref!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Printer className="h-4 w-4" />
            {dc3.printCount > 0 ? "Reimprimir DC-3" : "Imprimir DC-3"}
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      )}

      {/* Lista para emitir por primera vez. */}
      {!dc3 && readiness.ready && (
        <div className="mt-4 space-y-3">
          <Dc3ResponsibilityNotice />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Generar DC-3
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  readiness,
  dc3,
}: {
  readiness: Dc3Readiness;
  dc3: Dc3CourseRowData["dc3"];
}) {
  const base =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium";

  if (dc3?.status === "CANCELLED") {
    return (
      <span className={`${base} bg-red-50 text-red-700`}>
        <Ban className="h-3 w-3" />
        Cancelada
      </span>
    );
  }
  if (dc3) {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700`}>
        <BadgeCheck className="h-3 w-3" />
        Emitida
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
      <span className={`${base} bg-blue-50 text-blue-700`}>
        <FileText className="h-3 w-3" />
        Lista para emitir
      </span>
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
