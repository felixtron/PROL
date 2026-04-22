import Link from "next/link";
import {
  Building2,
  Users,
  GraduationCap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { db } from "@prol/db";
import { requireTenantAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TenantAdminDashboard() {
  const admin = await requireTenantAdmin();
  const tenantId = admin.tenantId;

  if (!tenantId) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Selecciona una academia
        </h1>
        <p className="mt-1 text-text-secondary">
          Como SUPER_ADMIN, ve al panel de admin global para gestionar academias.
        </p>
      </div>
    );
  }

  const [users, students, professors, companies, courses, enrollments] =
    await Promise.all([
      db.user.count({ where: { tenantId, disabledAt: null } }),
      db.user.count({ where: { tenantId, role: "STUDENT", disabledAt: null } }),
      db.user.count({ where: { tenantId, role: "PROFESSOR", disabledAt: null } }),
      db.company.count({ where: { tenantId } }),
      db.course.count({ where: { tenantId, status: "PUBLISHED" } }),
      db.enrollment.count({ where: { tenantId } }),
    ]);

  const stats = [
    {
      label: "Usuarios totales",
      value: users,
      sublabel: `${students} alumnos · ${professors} profesores`,
      icon: Users,
      color: "primary" as const,
      href: "/tenant-admin/users",
    },
    {
      label: "Empresas",
      value: companies,
      sublabel: "B2B / Grupos",
      icon: Building2,
      color: "emerald" as const,
      href: "/tenant-admin/companies",
    },
    {
      label: "Cursos publicados",
      value: courses,
      sublabel: `${enrollments} inscripciones`,
      icon: GraduationCap,
      color: "amber" as const,
      href: "/tenant-admin/courses",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Dashboard del Lider
          </h1>
          <p className="mt-1 text-text-secondary">
            Resumen de tu academia. Gestiona usuarios y empresas sin depender de soporte.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          const colors = {
            primary: { bg: "bg-primary-50", text: "text-primary-700" },
            emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
            amber: { bg: "bg-amber-50", text: "text-amber-700" },
          }[s.color];
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group rounded-xl border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${colors.bg}`}>
                  <Icon className={`h-5 w-5 ${colors.text}`} />
                </div>
                <ArrowRight className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 text-3xl font-bold text-text-primary">{s.value}</p>
              <p className="mt-1 text-sm font-medium text-text-secondary">{s.label}</p>
              <p className="mt-0.5 text-xs text-text-tertiary">{s.sublabel}</p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Acciones rapidas
          </h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link
            href="/tenant-admin/users/new"
            className="rounded-lg border border-border p-4 transition-colors hover:border-primary-500 hover:bg-primary-50"
          >
            <p className="text-sm font-semibold text-text-primary">+ Crear usuario</p>
            <p className="mt-1 text-xs text-text-tertiary">Da de alta a alumnos o profesores.</p>
          </Link>
          <Link
            href="/tenant-admin/users/import"
            className="rounded-lg border border-border p-4 transition-colors hover:border-primary-500 hover:bg-primary-50"
          >
            <p className="text-sm font-semibold text-text-primary">Importar CSV</p>
            <p className="mt-1 text-xs text-text-tertiary">Carga masiva de usuarios.</p>
          </Link>
          <Link
            href="/tenant-admin/companies/new"
            className="rounded-lg border border-border p-4 transition-colors hover:border-primary-500 hover:bg-primary-50"
          >
            <p className="text-sm font-semibold text-text-primary">+ Crear empresa</p>
            <p className="mt-1 text-xs text-text-tertiary">Agrupa alumnos B2B.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
