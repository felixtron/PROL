"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";

interface Sibling {
  id: string;
  companyName: string;
  respondents: number;
  totalParticipants: number;
}

/**
 * Selector para saltar entre los resultados de otras empresas que tengan
 * la misma evaluación asignada.
 */
export function AssignmentSwitcher({
  evaluationId,
  currentCompany,
  siblings,
}: {
  evaluationId: string;
  currentCompany: string;
  siblings: Sibling[];
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-primary-50 hover:text-primary-700"
        title={`Ver resultados de otra empresa (actual: ${currentCompany})`}
      >
        <Building2 className="h-4 w-4" />
        Cambiar empresa
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
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
            Otras empresas
          </p>
          <ul className="max-h-72 overflow-y-auto py-1">
            {siblings.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/professor/evaluations/${evaluationId}/results/${s.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-text-primary transition-colors hover:bg-primary-50"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    <span className="truncate">{s.companyName}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-medium text-text-tertiary">
                    {s.respondents}/{s.totalParticipants}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
