import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { getRevenueStats } from "@/lib/queries/revenue";
import { getRevenueByMonth } from "@/lib/queries/analytics";
import { LineChart } from "@/components/charts/line-chart";

function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(amountInCents / 100);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function RevenuePage() {
  const [{ totalRevenue, monthRevenue, lastMonthRevenue, recentPayments }, revenueData] =
    await Promise.all([
      getRevenueStats(),
      getRevenueByMonth(6),
    ]);

  const monthChange =
    lastMonthRevenue > 0
      ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : monthRevenue > 0
        ? 100
        : 0;

  const isPositiveChange = monthChange >= 0;

  const statCards = [
    {
      label: "Total Ingresos",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: "text-primary-600",
      bg: "bg-primary-50",
    },
    {
      label: "Ingresos Este Mes",
      value: formatCurrency(monthRevenue),
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Ingresos Mes Anterior",
      value: formatCurrency(lastMonthRevenue),
      icon: CreditCard,
      color: "text-accent-600",
      bg: "bg-accent-50",
    },
    {
      label: "Cambio Mensual",
      value: `${isPositiveChange ? "+" : ""}${monthChange}%`,
      icon: isPositiveChange ? TrendingUp : TrendingDown,
      color: isPositiveChange ? "text-emerald-600" : "text-red-600",
      bg: isPositiveChange ? "bg-emerald-50" : "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Ingresos
        </h1>
        <p className="mt-1 text-text-secondary">
          Resumen de tus ingresos y pagos recibidos.
        </p>
      </div>

      {/* Revenue Trend Chart */}
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
          Tendencia de Ingresos (Últimos 6 Meses)
        </h2>
        <LineChart
          data={revenueData.map((d) => ({
            label: d.month,
            value: d.revenue,
          }))}
          height={250}
          color="#10b981"
          showDots={true}
          fillArea={true}
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg bg-surface p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-text-primary">
                    {stat.value}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Payments Table */}
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Pagos Recientes
          </h2>
        </div>

        {recentPayments.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="mx-auto h-10 w-10 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              Aún no tienes pagos registrados.
            </p>
            <p className="mt-1 text-sm text-text-tertiary">
              Los pagos aparecerán aquí cuando tus alumnos compren tus cursos.
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
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Alumno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Monto Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Tu Comisión (70%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-surface-secondary">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                      {payment.course.title}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {payment.student.name ?? "Sin nombre"}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {payment.student.email}
                        </p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-emerald-600">
                      {formatCurrency(payment.creatorReceives)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Completado
                      </span>
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
