import Link from "next/link";
import {
  Plus,
  Users,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  UserPlus,
  CreditCard,
} from "lucide-react";
import {
  getProfessorDashboardStats,
  getProfessorCourses,
  getProfessorRecentActivity,
} from "@/lib/queries/professor";
import {
  getRevenueByMonth,
  getEnrollmentsByMonth,
  getCourseDistribution,
} from "@/lib/queries/analytics";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";

const activityIcons = {
  enrollment: UserPlus,
  payment: CreditCard,
  completion: CheckCircle2,
} as const;

const activityColors = {
  enrollment: "text-primary-500",
  payment: "text-accent-500",
  completion: "text-emerald-500",
} as const;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(amount);
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`;
  return `hace ${Math.floor(seconds / 86400)}d`;
}

export default async function ProfessorDashboardPage() {
  const [stats, courses, activity, revenueData, enrollmentData, courseDistribution] = await Promise.all([
    getProfessorDashboardStats(),
    getProfessorCourses("all"),
    getProfessorRecentActivity(5),
    getRevenueByMonth(6),
    getEnrollmentsByMonth(6),
    getCourseDistribution(),
  ]);

  const topCourses = courses.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Dashboard del Profesor
        </h1>
        <Link
          href="/professor/courses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Crear Curso
        </Link>
      </div>

      {/* Revenue Highlight + Stats Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Revenue Highlight Card */}
        <div className="rounded-lg bg-primary-900 p-6 shadow-sm lg:col-span-1">
          <p className="text-sm font-medium text-primary-200">
            Ingresos del Mes
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-white">
            {formatCurrency(stats.monthlyRevenue)}
          </p>
        </div>

        {/* Alumnos Activos */}
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              Alumnos Activos
            </p>
          </div>
          <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
            {stats.activeStudents}
          </p>
        </div>

        {/* Cursos Publicados */}
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <BookOpen className="h-5 w-5 text-accent-600" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              Cursos Publicados
            </p>
          </div>
          <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
            {stats.publishedCourses}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {stats.draftCourses} borradores
          </p>
        </div>

        {/* Tasa de Completado */}
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              Tasa de Completado
            </p>
          </div>
          <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
            {stats.completionRate}%
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
            Tendencia de Ingresos
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
        </div>

        {/* Enrollment Trend */}
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
            Inscripciones por Mes
          </h2>
          <BarChart
            data={enrollmentData.map((d) => ({
              label: d.month,
              value: d.enrollments,
              color: "#10b981",
            }))}
            height={250}
            showValues={true}
          />
        </div>

        {/* Course Distribution */}
        {courseDistribution.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
              Distribución de Estudiantes por Curso
            </h2>
            <div className="flex justify-center">
              <DonutChart
                data={courseDistribution}
                size={200}
                centerLabel="Total"
                centerValue={courseDistribution
                  .reduce((sum, d) => sum + d.value, 0)
                  .toString()}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Courses Table + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Mis Cursos Table */}
        <div className="rounded-lg border border-border bg-surface shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Mis Cursos
            </h2>
            <Link
              href="/professor/courses"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Ver todos
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Alumnos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-surface-secondary">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                      {course.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {course.students}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {formatCurrency(course.revenue)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${
                          course.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-surface-tertiary text-text-secondary"
                        }`}
                      >
                        {course.status === "PUBLISHED" ? "Activo" : "Borrador"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/professor/courses/${course.id}/edit`}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/professor/courses/${course.id}`}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                        >
                          Ver
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Actividad Reciente
            </h2>
          </div>
          <div className="p-6">
            {activity.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sin actividad reciente.</p>
            ) : (
              <div className="space-y-6">
                {activity.map((item, index) => {
                  const Icon = activityIcons[item.type];
                  const color = activityColors[item.type];
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary ${color}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {index < activity.length - 1 && (
                          <div className="mt-1 h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="min-w-0 pb-4">
                        <p className="text-sm text-text-primary">
                          {item.text}
                        </p>
                        <p className="mt-0.5 text-xs text-text-tertiary">
                          {timeAgo(item.time)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
