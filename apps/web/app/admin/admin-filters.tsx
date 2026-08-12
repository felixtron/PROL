"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

export interface AdminCompanyOption {
  id: string;
  name: string;
  tenantId: string;
  tenantName: string;
  members: number;
}

export interface AdminFilterValue {
  search?: string;
  role?: string;
  tenantId?: string;
  /** Id de empresa, o "none" para los usuarios sin empresa. */
  company?: string;
}

interface AdminFiltersProps {
  /** Ruta base a la que se empujan los filtros, ej. "/admin/users". */
  basePath: string;
  placeholder: string;
  tenants: { id: string; name: string }[];
  /** Si se omite, no se muestra el selector de rol. */
  roles?: { value: string; label: string }[];
  /** Si se omite, no se muestra el selector de empresa. */
  companies?: AdminCompanyOption[];
  value: AdminFilterValue;
}

/**
 * Barra de filtros para las tablas del panel de superusuario. El filtrado es
 * en servidor: cada cambio se refleja en la query string y la página vuelve a
 * consultar. La búsqueda se envía con Enter para no pegarle a la BD en cada
 * tecla.
 */
export function AdminFilters({
  basePath,
  placeholder,
  tenants,
  roles,
  companies,
  value,
}: AdminFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(value.search ?? "");

  // Mantiene el input sincronizado si la URL cambia por fuera (back/forward).
  useEffect(() => {
    setSearch(value.search ?? "");
  }, [value.search]);

  /**
   * Empresas visibles: si hay un tenant seleccionado solo se ofrecen las
   * suyas, agrupadas por tenant cuando se listan todas.
   */
  const companyGroups = useMemo(() => {
    if (!companies) return [];
    const visible = value.tenantId
      ? companies.filter((c) => c.tenantId === value.tenantId)
      : companies;
    const groups = new Map<string, AdminCompanyOption[]>();
    for (const c of visible) {
      const list = groups.get(c.tenantName) ?? [];
      list.push(c);
      groups.set(c.tenantName, list);
    }
    return Array.from(groups.entries());
  }, [companies, value.tenantId]);

  function buildHref(next: AdminFilterValue): string {
    // Se parte de la query actual para conservar el orden de la tabla.
    const sp = new URLSearchParams(searchParams.toString());
    const set = (key: string, v?: string) => {
      if (v) sp.set(key, v);
      else sp.delete(key);
    };
    set("q", next.search);
    set("role", next.role);
    set("tenant", next.tenantId);
    set("company", next.company);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  function apply(next: AdminFilterValue) {
    startTransition(() => {
      router.push(buildHref(next));
    });
  }

  const hasFilters = Boolean(
    value.search || value.role || value.tenantId || value.company,
  );

  const selectClass =
    "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ ...value, search: search.trim() });
        }}
        className="relative min-w-64 flex-1"
      >
        {pending ? (
          <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-tertiary" />
        ) : (
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        )}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-lg border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </form>

      {roles && (
        <select
          value={value.role ?? ""}
          onChange={(e) => apply({ ...value, role: e.target.value })}
          aria-label="Filtrar por rol"
          className={selectClass}
        >
          <option value="">Todos los roles</option>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      )}

      {companies && (
        <select
          value={value.company ?? ""}
          onChange={(e) => apply({ ...value, company: e.target.value })}
          aria-label="Filtrar por empresa"
          className={selectClass}
        >
          <option value="">Todas las empresas</option>
          <option value="none">Sin empresa</option>
          {companyGroups.map(([tenantName, list]) => (
            <optgroup key={tenantName} label={tenantName}>
              {list.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.members})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      <select
        value={value.tenantId ?? ""}
        // Cambiar de tenant invalida la empresa elegida: pertenece al anterior.
        onChange={(e) =>
          apply({ ...value, tenantId: e.target.value, company: undefined })
        }
        aria-label="Filtrar por tenant"
        className={selectClass}
      >
        <option value="">Todos los tenants</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            apply({});
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-secondary"
        >
          <X className="h-4 w-4" />
          Limpiar
        </button>
      )}
    </div>
  );
}
