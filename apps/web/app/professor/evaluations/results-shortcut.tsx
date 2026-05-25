"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronDown, Building2 } from "lucide-react";

interface Assignment {
  id: string;
  company: { id: string; name: string };
}

/**
 * Atajo a resultados desde el listado de evaluaciones.
 * - 1 asignación: link directo a sus resultados.
 * - 2+ asignaciones: botón con popover para elegir empresa.
 */
export function ResultsShortcut({
  evaluationId,
  assignments,
}: {
  evaluationId: string;
  assignments: Assignment[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (assignments.length === 1) {
    const a = assignments[0]!;
    return (
      <Link
        href={`/professor/evaluations/${evaluationId}/results/${a.id}`}
        className="inline-flex items-center gap-1.5 self-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
        title={`Ver resultados de ${a.company.name}`}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        Resultados
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative self-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
      >
        <BarChart3 className="h-3.5 w-3.5" />
        Resultados ({assignments.length})
        <ChevronDown
          className={`h-3 w-3 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1.5 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          <p className="border-b border-border bg-surface-secondary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Empresa
          </p>
          <ul className="max-h-72 overflow-y-auto py-1">
            {assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/professor/evaluations/${evaluationId}/results/${a.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary transition-colors hover:bg-primary-50"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  <span className="truncate">{a.company.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
