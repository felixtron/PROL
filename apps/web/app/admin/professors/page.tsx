import { GraduationCap } from "lucide-react";
import {
  ADMIN_LIST_LIMIT,
  getAdminProfessorStats,
  getAdminProfessors,
  getAdminTenantOptions,
} from "@/lib/queries/admin";
import { AdminFilters } from "../admin-filters";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date | null): string {
  if (!date) return "Nunca";
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminProfessorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tenant?: string }>;
}) {
  const sp = await searchParams;
  const filter = {
    search: sp.q?.trim() || undefined,
    tenantId: sp.tenant || undefined,
  };
  const hasFilters = Boolean(filter.search || filter.tenantId);

  const [professors, stats, tenants] = await Promise.all([
    getAdminProfessors(filter),
    getAdminProfessorStats(),
    getAdminTenantOptions(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Profesores
        </h1>
        <p className="mt-1 text-text-secondary">
          Todos los profesores registrados en la plataforma.
        </p>
      </div>

      {/* Summary — totales globales, no dependen del filtro */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-surface p-4 shadow-sm">
          <p className="text-sm text-text-secondary">Total Profesores</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
            {stats.professors}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-4 shadow-sm">
          <p className="text-sm text-text-secondary">Total Cursos</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
            {stats.courses}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-4 shadow-sm">
          <p className="text-sm text-text-secondary">Total Alumnos</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
            {stats.students}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <AdminFilters
        basePath="/admin/professors"
        placeholder="Buscar por nombre, email o tenant..."
        tenants={tenants}
        value={filter}
      />

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {professors.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              {hasFilters
                ? "Ningún profesor coincide con los filtros seleccionados."
                : "No hay profesores registrados."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Cursos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Alumnos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Último Acceso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {professors.map((prof) => (
                  <tr
                    key={prof.id}
                    className="transition-colors hover:bg-surface-secondary"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                      {prof.name ?? "Sin nombre"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {prof.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {prof.tenant}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {prof.courses}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {prof.students}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-emerald-600">
                      {formatCurrency(prof.revenue)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {formatDate(prof.lastLogin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {professors.length > 0 && (
        <p className="text-xs text-text-tertiary">
          Mostrando {professors.length} de {stats.professors} profesores.
          {professors.length >= ADMIN_LIST_LIMIT &&
            ` (límite ${ADMIN_LIST_LIMIT}, refina la búsqueda)`}
        </p>
      )}
    </div>
  );
}
