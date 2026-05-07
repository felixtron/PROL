import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Users,
  BookOpen,
  Building2,
  GraduationCap,
} from "lucide-react";
import { getAdminDashboardStats } from "@/lib/queries/admin";
import {
  getAdminRevenueByMonth,
  getAdminTenantDistribution,
} from "@/lib/queries/analytics";
import { LineChart } from "@/components/charts/line-chart";
import { DonutChart } from "@/components/charts/donut-chart";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: modeParam } = await searchParams;
  const mode: "demo" | "production" = modeParam === "demo" ? "demo" : "production";

  const [stats, revenueData, tenantDistribution] = await Promise.all([
    getAdminDashboardStats(mode),
    getAdminRevenueByMonth(6),
    getAdminTenantDistribution(),
  ]);

  const statCards = [
    {
      label: "Ingresos Totales",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-primary-600",
      bg: "bg-primary-50",
    },
    {
      label: "Comisiones PROL",
      value: formatCurrency(stats.prolFees),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Usuarios Totales",
      value: stats.totalUsers.toLocaleString("es-MX"),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Cursos Totales",
      value: stats.totalCourses.toLocaleString("es-MX"),
      icon: BookOpen,
      color: "text-accent-600",
      bg: "bg-accent-50",
    },
    {
      label: "Tenants Activos",
      value: stats.activeTenants.toLocaleString("es-MX"),
      icon: Building2,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Inscripciones Totales",
      value: stats.totalEnrollments.toLocaleString("es-MX"),
      icon: GraduationCap,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Panel de Administración
          </h1>
          <p className="mt-1 text-text-secondary">
            {mode === "production"
              ? "Solo se cuentan usuarios, cursos, tenants e inscripciones con cobros reales (Stripe COMPLETED)."
              : "Modo demo: incluye datos sembrados, asignaciones gratuitas y cuentas de prueba."}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="inline-flex shrink-0 rounded-lg border border-border bg-surface p-1 text-sm">
          <Link
            href="/admin?mode=production"
            scroll={false}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              mode === "production"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Producción
          </Link>
          <Link
            href="/admin?mode=demo"
            scroll={false}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              mode === "demo"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Demo
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-surface p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-sm font-medium text-text-secondary">
                  {stat.label}
                </p>
              </div>
              <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Summary */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Resumen de Ingresos
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-secondary">Ingresos Totales</p>
            <p className="mt-1 text-xl font-bold text-text-primary">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-secondary">Comisiones PROL</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {formatCurrency(stats.prolFees)}
            </p>
          </div>
          <div className="rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-secondary">Pagos a Creadores</p>
            <p className="mt-1 text-xl font-bold text-text-primary">
              {formatCurrency(stats.creatorPayouts)}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Platform Revenue Trend */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
            Ingresos de la Plataforma
          </h2>
          <LineChart
            data={revenueData.map((d) => ({
              label: d.month,
              value: d.revenue,
            }))}
            height={250}
            color="#6366f1"
            showDots={true}
            fillArea={true}
          />
          <p className="mt-2 text-xs text-text-tertiary">
            Ingresos totales por mes (últimos 6 meses)
          </p>
        </div>

        {/* Tenant Distribution */}
        {tenantDistribution.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
              Distribución por Tenant
            </h2>
            <div className="flex justify-center">
              <DonutChart
                data={tenantDistribution}
                size={200}
                centerLabel="Inscripciones"
                centerValue={tenantDistribution
                  .reduce((sum, d) => sum + d.value, 0)
                  .toString()}
              />
            </div>
            <p className="mt-2 text-center text-xs text-text-tertiary">
              Top 5 tenants por inscripciones activas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
