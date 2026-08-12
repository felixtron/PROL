import { Users } from "lucide-react";
import {
  ADMIN_LIST_LIMIT,
  ADMIN_USER_SORTS,
  getAdminCompanyOptions,
  getAdminTenantOptions,
  getAdminUserStats,
  getAdminUsers,
  type AdminRoleFilter,
  type AdminUserSort,
  type SortDirection,
} from "@/lib/queries/admin";
import { AdminFilters } from "../admin-filters";
import { SortHeader } from "../sort-header";
import { RoleChanger } from "./role-changer";

const BASE_PATH = "/admin/users";

const ROLE_OPTIONS: { value: AdminRoleFilter; label: string }[] = [
  { value: "STUDENT", label: "Estudiantes" },
  { value: "PROFESSOR", label: "Profesores" },
  { value: "ADMIN", label: "Admins" },
  { value: "SUPER_ADMIN", label: "Super Admins" },
];

function parseRole(value?: string): AdminRoleFilter | undefined {
  return ROLE_OPTIONS.some((r) => r.value === value)
    ? (value as AdminRoleFilter)
    : undefined;
}

function parseSort(value?: string): AdminUserSort | undefined {
  return ADMIN_USER_SORTS.includes(value as AdminUserSort)
    ? (value as AdminUserSort)
    : undefined;
}

function parseDir(value?: string): SortDirection | undefined {
  return value === "asc" || value === "desc" ? value : undefined;
}

function formatDate(date: Date | null): string {
  if (!date) return "Nunca";
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    tenant?: string;
    company?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const sp = await searchParams;
  const company = sp.company || undefined;
  // Orden por defecto: los usuarios más recientes primero.
  const sort = parseSort(sp.sort) ?? "createdAt";
  const dir = parseDir(sp.dir) ?? (sp.sort ? "asc" : "desc");

  const filter = {
    search: sp.q?.trim() || undefined,
    role: parseRole(sp.role),
    tenantId: sp.tenant || undefined,
    companyId: company === "none" ? undefined : company,
    companyFilter: company === "none" ? ("none" as const) : undefined,
    sort,
    dir,
  };
  const hasFilters = Boolean(
    filter.search || filter.role || filter.tenantId || company,
  );

  const [users, stats, tenants, companies] = await Promise.all([
    getAdminUsers(filter),
    getAdminUserStats(),
    getAdminTenantOptions(),
    getAdminCompanyOptions(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Usuarios
        </h1>
        <p className="mt-1 text-text-secondary">
          Gestiona todos los usuarios de la plataforma.
        </p>
      </div>

      {/* Summary — totales globales, no dependen del filtro */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", count: stats.total },
          { label: "Estudiantes", count: stats.students },
          { label: "Profesores", count: stats.professors },
          { label: "Admins", count: stats.admins },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-surface p-4 shadow-sm">
            <p className="text-sm text-text-secondary">{stat.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
              {stat.count}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <AdminFilters
        basePath={BASE_PATH}
        placeholder="Buscar por nombre, email, empresa o tenant..."
        tenants={tenants}
        companies={companies}
        roles={ROLE_OPTIONS}
        value={{
          search: filter.search,
          role: filter.role,
          tenantId: filter.tenantId,
          company,
        }}
      />

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              {hasFilters
                ? "Ningún usuario coincide con los filtros seleccionados."
                : "No hay usuarios registrados."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  {[
                    { column: "name", label: "Nombre" },
                    { column: "email", label: "Email" },
                    { column: "role", label: "Rol" },
                    { column: "company", label: "Empresa" },
                    { column: "tenant", label: "Tenant" },
                    {
                      column: "lastLogin",
                      label: "Último Acceso",
                      defaultDir: "desc" as const,
                    },
                  ].map((col) => (
                    <SortHeader
                      key={col.column}
                      basePath={BASE_PATH}
                      params={sp}
                      column={col.column}
                      label={col.label}
                      defaultDir={col.defaultDir}
                      activeSort={sp.sort ? sort : undefined}
                      activeDir={dir}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-surface-secondary"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                      {user.name ?? "Sin nombre"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <RoleChanger
                        userId={user.id}
                        currentRole={user.role}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {user.company ? (
                        user.company.name
                      ) : (
                        <span className="text-text-tertiary">Sin empresa</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {user.tenant ? (
                        <span>
                          {user.tenant.name}{" "}
                          <code className="rounded bg-surface-secondary px-1 py-0.5 text-xs text-text-tertiary">
                            {user.tenant.slug}
                          </code>
                        </span>
                      ) : (
                        <span className="text-text-tertiary">Sin tenant</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {formatDate(user.lastLoginAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {users.length > 0 && (
        <p className="text-xs text-text-tertiary">
          Mostrando {users.length} de {stats.total} usuarios.
          {users.length >= ADMIN_LIST_LIMIT &&
            ` (límite ${ADMIN_LIST_LIMIT}, refina la búsqueda)`}
        </p>
      )}
    </div>
  );
}
