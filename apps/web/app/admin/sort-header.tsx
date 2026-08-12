import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

interface SortHeaderProps {
  /** Ruta base de la tabla, ej. "/admin/users". */
  basePath: string;
  /** Query string actual, para no perder los filtros al reordenar. */
  params: Record<string, string | undefined>;
  /** Identificador de la columna que viaja en `?sort=`. */
  column: string;
  label: string;
  /** Columna y dirección activas. */
  activeSort?: string;
  activeDir?: "asc" | "desc";
  /** Dirección al hacer clic por primera vez (fechas suelen ir descendentes). */
  defaultDir?: "asc" | "desc";
}

/**
 * Encabezado de tabla clicable que clasifica en servidor: el orden viaja en
 * la query string (`?sort=<col>&dir=<asc|desc>`) junto con los filtros.
 */
export function SortHeader({
  basePath,
  params,
  column,
  label,
  activeSort,
  activeDir = "asc",
  defaultDir = "asc",
}: SortHeaderProps) {
  const active = activeSort === column;
  const nextDir = active
    ? activeDir === "asc"
      ? "desc"
      : "asc"
    : defaultDir;

  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "sort" && key !== "dir") sp.set(key, value);
  }
  sp.set("sort", column);
  sp.set("dir", nextDir);

  const Icon = active ? (activeDir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
      <Link
        href={`${basePath}?${sp.toString()}`}
        scroll={false}
        aria-label={`Ordenar por ${label} (${nextDir === "asc" ? "ascendente" : "descendente"})`}
        className={`group inline-flex items-center gap-1 transition-colors hover:text-text-secondary ${
          active ? "text-primary-600" : ""
        }`}
      >
        {label}
        <Icon
          className={`h-3.5 w-3.5 ${
            active ? "" : "opacity-0 transition-opacity group-hover:opacity-60"
          }`}
        />
      </Link>
    </th>
  );
}
