"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Search,
  X,
} from "lucide-react";

export interface CompanyOption {
  id: string;
  name: string;
  /** Cuántas evaluaciones tiene asignadas. */
  evaluations: number;
}

/**
 * Filtro por empresa del listado de evaluaciones. Combobox con buscador:
 * la lista de empresas puede ser larga, así que se filtra escribiendo.
 * La selección se refleja en la query string (`?company=<id>`) para que el
 * servidor devuelva solo las evaluaciones de esa empresa.
 */
export function CompanyFilter({
  companies,
  selectedId,
}: {
  companies: CompanyOption[];
  selectedId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  const selected = companies.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, query]);

  function select(companyId: string | null) {
    setOpen(false);
    setQuery("");
    startTransition(() => {
      router.push(
        companyId
          ? `/professor/evaluations?company=${encodeURIComponent(companyId)}`
          : "/professor/evaluations",
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`inline-flex min-w-56 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            selected
              ? "border-primary-200 bg-primary-50 text-primary-700"
              : "border-border bg-surface text-text-secondary hover:bg-surface-secondary"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {pending ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">
              {selected ? selected.name : "Todas las empresas"}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute left-0 top-full z-20 mt-1.5 w-80 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
          >
            <div className="relative border-b border-border">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar empresa..."
                aria-label="Buscar empresa"
                className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto py-1">
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!selectedId}
                  onClick={() => select(null)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-primary-50"
                >
                  Todas las empresas
                  {!selectedId && (
                    <Check className="h-4 w-4 shrink-0 text-primary-600" />
                  )}
                </button>
              </li>
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-sm text-text-tertiary">
                  Ninguna empresa coincide con “{query}”.
                </li>
              ) : (
                filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={c.id === selectedId}
                      onClick={() => select(c.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-primary-50"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-text-tertiary">
                          {c.evaluations}
                        </span>
                        {c.id === selectedId && (
                          <Check className="h-4 w-4 text-primary-600" />
                        )}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {selected && (
        <button
          type="button"
          onClick={() => select(null)}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-secondary"
        >
          <X className="h-4 w-4" />
          Limpiar
        </button>
      )}
    </div>
  );
}
