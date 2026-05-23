import Link from "next/link";
import { GraduationCap, Users, DollarSign, BookOpen, ExternalLink, Eye } from "lucide-react";
import { db } from "@prol/db";
import { requireTenantAdmin } from "@/lib/auth";
import { EnrollToCourseButton } from "./enroll-to-course-button";

export const dynamic = "force-dynamic";

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return "Gratis";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

const statusStyles: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: "Publicado", color: "bg-emerald-50 text-emerald-700" },
  DRAFT: { label: "Borrador", color: "bg-surface-tertiary text-text-secondary" },
  ARCHIVED: { label: "Archivado", color: "bg-amber-50 text-amber-700" },
  REVIEW: { label: "En revisión", color: "bg-blue-50 text-blue-700" },
};

export default async function TenantAdminCoursesPage() {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Cursos
        </h1>
        <p className="mt-1 text-text-secondary">
          Como SUPER_ADMIN, ve al panel global para ver cursos cross-tenant.
        </p>
      </div>
    );
  }

  const [courses, students] = await Promise.all([
    db.course.findMany({
      where: { tenantId: admin.tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        professor: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
    }),
    db.user.findMany({
      where: { tenantId: admin.tenantId, role: "STUDENT", disabledAt: null },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
      take: 500,
    }),
  ]);

  // Aggregate revenue per course
  const revenueByCourse = await db.coursePayment.groupBy({
    by: ["courseId"],
    where: { tenantId: admin.tenantId, status: "COMPLETED" },
    _sum: { creatorReceives: true, prolFee: true },
  });
  const revenueMap = new Map(
    revenueByCourse.map((r) => [
      r.courseId,
      ((r._sum.creatorReceives ?? 0) + (r._sum.prolFee ?? 0)) / 100,
    ])
  );

  const totalEnrollments = courses.reduce((s, c) => s + c._count.enrollments, 0);
  const publishedCount = courses.filter((c) => c.status === "PUBLISHED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Cursos
        </h1>
        <p className="mt-1 text-text-secondary">
          Todos los cursos creados por los profesores de tu academia.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          icon={BookOpen}
          label="Total cursos"
          value={courses.length}
          sublabel={`${publishedCount} publicados`}
        />
        <Stat
          icon={Users}
          label="Inscripciones"
          value={totalEnrollments}
          sublabel="Total acumulado"
        />
        <Stat
          icon={DollarSign}
          label="Ingresos"
          value={`$${Array.from(revenueMap.values())
            .reduce((s, v) => s + v, 0)
            .toFixed(0)}`}
          sublabel="MXN totales"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {courses.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-text-tertiary" />
            <h2 className="mt-3 font-heading text-base font-semibold text-text-primary">
              Aún no hay cursos
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Cuando tus profesores creen cursos, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-secondary">
                <tr>
                  <Th>Curso</Th>
                  <Th>Profesor</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Precio</Th>
                  <Th className="text-right">Alumnos</Th>
                  <Th className="text-right">Ingresos</Th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {courses.map((c) => {
                  const status = statusStyles[c.status] ?? statusStyles.DRAFT!;
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {c.thumbnail ? (
                            <img
                              src={c.thumbnail}
                              alt={c.title}
                              className="h-10 w-14 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-primary-100">
                              <GraduationCap className="h-5 w-5 text-primary-700" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {c.title}
                            </p>
                            <p className="truncate text-xs text-text-tertiary">
                              {c._count.modules} módulos · {c.totalLessons} lecciones
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="truncate text-text-primary">
                          {c.professor.name ?? "—"}
                        </p>
                        <p className="truncate text-xs text-text-tertiary">
                          {c.professor.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary">
                        {formatPrice(c.priceInCents, c.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary">
                        {c._count.enrollments}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary">
                        ${(revenueMap.get(c.id) ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <EnrollToCourseButton
                            course={{
                              id: c.id,
                              title: c.title,
                              priceInCents: c.priceInCents,
                              currency: c.currency,
                            }}
                            students={students}
                          />
                          <Link
                            href={`/preview/courses/${c.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-primary-700"
                            title="Ver el curso como un alumno (modo vista previa)"
                          >
                            <Eye className="h-3 w-3" />
                            Vista previa
                          </Link>
                          {c.status === "PUBLISHED" && (
                            <Link
                              href={`/courses/${c.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                              title="Abrir página pública del curso"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sublabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-text-tertiary">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
      <p className="mt-0.5 text-xs text-text-tertiary">{sublabel}</p>
    </div>
  );
}
