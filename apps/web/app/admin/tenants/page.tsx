import Link from "next/link";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { getAdminTenants } from "@/lib/queries/admin";
import { TenantFeaturesToggle } from "./tenant-features-toggle";
import { RevenueShareEditor } from "./[id]/revenue-share-editor";

const statusColors: Record<string, string> = {
  TRIAL: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PAUSED: "bg-gray-100 text-gray-600",
  CHURNED: "bg-red-50 text-red-700",
};

const statusLabels: Record<string, string> = {
  TRIAL: "Prueba",
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  CHURNED: "Cancelado",
};

export default async function AdminTenantsPage() {
  const tenants = await getAdminTenants();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Tenants
          </h1>
          <p className="mt-1 text-text-secondary">
            Gestiona todas las academias registradas en la plataforma.
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Tenant
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {tenants.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              No hay tenants registrados.
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
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Usuarios
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Cursos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Rev. Share
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    AI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Sesiones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Evaluaciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Encuestas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="transition-colors hover:bg-surface-secondary"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="text-text-primary hover:text-primary-700 hover:underline"
                      >
                        {tenant.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs">
                        {tenant.slug}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[tenant.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {statusLabels[tenant.status] ?? tenant.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {tenant._count.users}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {tenant._count.courses}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      <RevenueShareEditor
                        tenantId={tenant.id}
                        current={tenant.revenueShareRate}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <TenantFeaturesToggle
                        tenantId={tenant.id}
                        feature="aiEnabled"
                        enabled={tenant.aiEnabled}
                        label="AI"
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <TenantFeaturesToggle
                        tenantId={tenant.id}
                        feature="workshopsEnabled"
                        enabled={tenant.workshopsEnabled}
                        label="Sesiones y Talleres"
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <TenantFeaturesToggle
                        tenantId={tenant.id}
                        feature="evaluationsEnabled"
                        enabled={tenant.evaluationsEnabled}
                        label="Evaluaciones"
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <TenantFeaturesToggle
                        tenantId={tenant.id}
                        feature="surveysEnabled"
                        enabled={tenant.surveysEnabled}
                        label="Encuestas"
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50"
                      >
                        Ver detalle
                        <ExternalLink className="h-3 w-3" />
                      </Link>
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
