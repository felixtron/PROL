import Link from "next/link";
import {
  ArrowLeft,
  Users,
  BookOpen,
  DollarSign,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getAdminTenantDetail } from "@/lib/queries/admin";
import { TenantFeaturesToggle } from "../tenant-features-toggle";
import { RevenueShareEditor } from "./revenue-share-editor";

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

const roleLabels: Record<string, string> = {
  STUDENT: "Estudiante",
  PROFESSOR: "Profesor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

const courseStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  REVIEW: "Revision",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

const courseStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  REVIEW: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

export default async function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getAdminTenantDetail(id);

  return (
    <div className="space-y-6">
      {/* Back Link + Header */}
      <div>
        <Link
          href="/admin/tenants"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Tenants
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            {tenant.name}
          </h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[tenant.status] ?? "bg-gray-100 text-gray-600"}`}
          >
            {statusLabels[tenant.status] ?? tenant.status}
          </span>
        </div>
        <p className="mt-1 text-text-secondary">
          Slug:{" "}
          <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs">
            {tenant.slug}
          </code>
          {tenant.customDomain && (
            <>
              {" "}
              | Dominio:{" "}
              <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs">
                {tenant.customDomain}
              </code>
            </>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-text-secondary">Usuarios</p>
          </div>
          <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
            {tenant._count.users}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <BookOpen className="h-5 w-5 text-accent-600" />
            </div>
            <p className="text-sm font-medium text-text-secondary">Cursos</p>
          </div>
          <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
            {tenant._count.courses}
          </p>
        </div>
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
            {formatCurrency(tenant.revenue.total)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              Comision PROL
            </p>
          </div>
          <p className="mt-4 font-heading text-2xl font-bold text-emerald-600">
            {formatCurrency(tenant.revenue.prolFee)}
          </p>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Configuracion del Tenant
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg bg-surface-secondary p-4">
            <span className="text-sm font-medium text-text-primary">
              Revenue Share
            </span>
            <RevenueShareEditor
              tenantId={tenant.id}
              current={tenant.revenueShareRate}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-secondary p-4">
            <span className="text-sm font-medium text-text-primary">AI</span>
            <TenantFeaturesToggle
              tenantId={tenant.id}
              feature="aiEnabled"
              enabled={tenant.aiEnabled}
              label="AI"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-secondary p-4">
            <span className="text-sm font-medium text-text-primary">
              Sesiones y Talleres
            </span>
            <TenantFeaturesToggle
              tenantId={tenant.id}
              feature="workshopsEnabled"
              enabled={tenant.workshopsEnabled}
              label="Sesiones y Talleres"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-secondary p-4">
            <span className="text-sm font-medium text-text-primary">
              Evaluaciones
            </span>
            <TenantFeaturesToggle
              tenantId={tenant.id}
              feature="evaluationsEnabled"
              enabled={tenant.evaluationsEnabled}
              label="Evaluaciones"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Usuarios ({tenant.users.length})
          </h2>
        </div>
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
                  Registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Último Acceso
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenant.users.map((user) => (
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
                    <span className="inline-flex items-center rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                      {roleLabels[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {formatDate(user.lastLoginAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Courses List */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Cursos ({tenant.courses.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Titulo
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Inscripciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenant.courses.map((course) => (
                <tr
                  key={course.id}
                  className="transition-colors hover:bg-surface-secondary"
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                    {course.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${courseStatusColors[course.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {courseStatusLabels[course.status] ?? course.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {formatCurrency(course.priceInCents / 100)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {course._count.enrollments}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Desglose de Ingresos
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-secondary">Total Ingresos</p>
            <p className="mt-1 text-xl font-bold text-text-primary">
              {formatCurrency(tenant.revenue.total)}
            </p>
          </div>
          <div className="rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-secondary">Comision PROL</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {formatCurrency(tenant.revenue.prolFee)}
            </p>
          </div>
          <div className="rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-secondary">Pagos al Creador</p>
            <p className="mt-1 text-xl font-bold text-text-primary">
              {formatCurrency(tenant.revenue.creatorPayouts)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
