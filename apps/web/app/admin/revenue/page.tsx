import { DollarSign, TrendingUp, Building2 } from "lucide-react";
import { getAdminRevenue, getAdminDashboardStats } from "@/lib/queries/admin";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminRevenuePage() {
  const [stats, revenueData] = await Promise.all([
    getAdminDashboardStats(),
    getAdminRevenue(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Ingresos
        </h1>
        <p className="mt-1 text-text-secondary">
          Resumen de ingresos de toda la plataforma.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <DollarSign className="h-5 w-5 text-primary-600" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              Ingresos Totales
            </p>
          </div>
          <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              Comisiones PROL
            </p>
          </div>
          <p className="mt-4 font-heading text-2xl font-bold text-emerald-600">
            {formatCurrency(stats.prolFees)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <Building2 className="h-5 w-5 text-accent-600" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              Pagos a Creadores
            </p>
          </div>
          <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
            {formatCurrency(stats.creatorPayouts)}
          </p>
        </div>
      </div>

      {/* Revenue by Tenant */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Ingresos por Tenant
          </h2>
        </div>
        {revenueData.byTenant.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              No hay ingresos registrados por tenant.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Ventas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Comision PROL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Pago Creador
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revenueData.byTenant.map((t) => (
                  <tr
                    key={t.tenantId}
                    className="transition-colors hover:bg-surface-secondary"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                      {t.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {t.count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                      {formatCurrency(t.total)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-emerald-600">
                      {formatCurrency(t.prolFee)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {formatCurrency(t.creatorReceives)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Pagos Recientes
          </h2>
        </div>
        {revenueData.recentPayments.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="mx-auto h-10 w-10 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              No hay pagos registrados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Comision PROL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Pago Creador
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revenueData.recentPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-surface-secondary"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {formatDate(p.paidAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                      {p.tenant}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {p.course}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-emerald-600">
                      {formatCurrency(p.prolFee)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {formatCurrency(p.creatorReceives)}
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
