import { Users } from "lucide-react";
import { getAdminUsers } from "@/lib/queries/admin";
import { RoleChanger } from "./role-changer";

function formatDate(date: Date | null): string {
  if (!date) return "Nunca";
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total",
            count: users.length,
          },
          {
            label: "Estudiantes",
            count: users.filter((u) => u.role === "STUDENT").length,
          },
          {
            label: "Profesores",
            count: users.filter((u) => u.role === "PROFESSOR").length,
          },
          {
            label: "Admins",
            count: users.filter(
              (u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN"
            ).length,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg bg-surface p-4 shadow-sm"
          >
            <p className="text-sm text-text-secondary">{stat.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
              {stat.count}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              No hay usuarios registrados.
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
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Último Acceso
                  </th>
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
    </div>
  );
}
