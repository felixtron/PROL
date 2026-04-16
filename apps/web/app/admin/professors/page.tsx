import { GraduationCap } from "lucide-react";
import { getAdminProfessors } from "@/lib/queries/admin";

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

export default async function AdminProfessorsPage() {
  const professors = await getAdminProfessors();

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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-surface p-4 shadow-sm">
          <p className="text-sm text-text-secondary">Total Profesores</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
            {professors.length}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-4 shadow-sm">
          <p className="text-sm text-text-secondary">Total Cursos</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
            {professors.reduce((sum, p) => sum + p.courses, 0)}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-4 shadow-sm">
          <p className="text-sm text-text-secondary">Total Alumnos</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
            {professors.reduce((sum, p) => sum + p.students, 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {professors.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              No hay profesores registrados.
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
                    Ultimo Acceso
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
    </div>
  );
}
