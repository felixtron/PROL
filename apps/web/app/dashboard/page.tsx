import Link from "next/link";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Award,
  Play,
  ArrowRight,
  ArrowUpRight,
  Bell,
} from "lucide-react";
import {
  getStudentDashboardStats,
  getStudentCourses,
  getLastActiveCourse,
} from "@/lib/queries/student";
import { listMyPendingEvaluations } from "@/lib/queries/evaluation";
import { getRecentNotifications } from "@/lib/queries/notifications";
import { getCurrentUser } from "@/lib/auth";
import { getNotificationIcon } from "@/components/notification-icon";
import { formatTimeAgo } from "@/lib/format-time-ago";
import { ProgressBar } from "@/components/progress-bar";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [stats, courses, lastActive, evaluations, notifications] =
    await Promise.all([
      getStudentDashboardStats(),
      getStudentCourses("all"),
      getLastActiveCourse(),
      listMyPendingEvaluations(),
      getRecentNotifications(4),
    ]);

  const statCards = [
    {
      label: "Cursos",
      value: stats.enrolledCourses,
      icon: BookOpen,
      color: "text-primary-600",
    },
    {
      label: "Lecciones",
      value: stats.completedLessons,
      icon: CheckCircle,
      color: "text-emerald-600",
    },
    {
      label: "Horas",
      value: stats.studyHours,
      icon: Clock,
      color: "text-accent-600",
    },
    {
      label: "Certificados",
      value: stats.certificates,
      icon: Award,
      color: "text-violet-600",
    },
  ];

  const displayName = user?.name?.split(" ")[0] ?? "Estudiante";
  const recentCourses = courses.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
      {/* Encabezado a ancho completo: dentro de la columna principal quedaba
          por debajo de todo el rail en móvil, que va primero en el DOM. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-lg font-bold text-text-primary md:text-xl">
          Hola, {displayName}
        </h1>

        {/* Franja de métricas: sustituye a cuatro tarjetas que en móvil
            dejaban ~68 px por casilla y obligaban a truncar la etiqueta. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-1.5">
                <Icon className={`h-4 w-4 shrink-0 ${stat.color}`} />
                <span className="text-base font-bold text-text-primary">
                  {stat.value}
                </span>
                <span className="text-xs text-text-tertiary">{stat.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/*
          El rail va primero en el DOM para que en móvil el avance y los
          pendientes queden arriba; `lg:order-2` lo manda a la derecha en
          escritorio, que es hacia donde barre la vista.
        */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:order-2">
          {/* ─── Continuar aprendiendo ─── */}
          {lastActive && (
            <section>
              <h2 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Continuar
              </h2>
              {/* Horizontal en móvil y vertical en el rail: en una sola
                  columna una portada de 112 px de alto era hueco muerto. */}
              <Link
                href={`/dashboard/courses/${lastActive.courseId}`}
                className="group flex gap-3 overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-sm transition-colors hover:border-primary-300 active:scale-[0.99] lg:block lg:p-0"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 lg:h-28 lg:w-full lg:rounded-none">
                  {lastActive.thumbnail ? (
                    <img
                      src={lastActive.thumbnail}
                      alt={lastActive.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm lg:h-10 lg:w-10">
                        <Play className="h-4 w-4 text-white lg:h-5 lg:w-5" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center lg:block lg:p-3">
                  {lastActive.currentLessonTitle && (
                    <p className="mb-0.5 truncate text-xs font-medium text-primary-600">
                      {lastActive.currentLessonTitle}
                    </p>
                  )}
                  <h3 className="font-heading text-sm font-bold text-text-primary line-clamp-2">
                    {lastActive.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    Prof. {lastActive.professor}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2">
                    <ProgressBar
                      value={lastActive.progress}
                      label={`Avance de ${lastActive.title}`}
                      size="sm"
                    />
                    <span className="shrink-0 text-xs font-semibold text-text-secondary">
                      {lastActive.progress}%
                    </span>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* ─── Evaluaciones asignadas ─── */}
          {evaluations.length > 0 && (
            <section>
              <h2 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Pendientes
                <span className="ml-1.5 rounded-pill bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  {evaluations.length}
                </span>
              </h2>
              <div className="space-y-2">
                {evaluations.map((p) => {
                  const latest = p.submissions[0];
                  return (
                    <Link
                      key={p.id}
                      href={`/dashboard/evaluations/${p.id}`}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary-300 hover:bg-primary-50/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {p.assignment.evaluation.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-text-tertiary">
                          {p.assignment.company.name}
                          {latest
                            ? ` · Última versión: v${latest.version}`
                            : " · Pendiente"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-pill px-2 py-1 text-xs font-medium ${
                          latest
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {latest ? "Editar" : "Contestar"}
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Avisos ─── */}
          {notifications.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-heading text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Avisos
                </h2>
                <Link
                  href="/dashboard/notifications"
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-800"
                >
                  Ver todos
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {notifications.map((n) => {
                  const Icon = getNotificationIcon(n.type);
                  return (
                    <Link
                      key={n.id}
                      href="/dashboard/notifications"
                      className={`flex gap-2.5 p-3 transition-colors hover:bg-surface-secondary ${
                        n.isRead ? "" : "bg-primary-50/40"
                      }`}
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                        <Icon className="h-3.5 w-3.5 text-primary-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-text-primary">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-text-tertiary">
                          {formatTimeAgo(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span
                          className="mt-1.5 ml-auto h-2 w-2 shrink-0 rounded-full bg-primary-600"
                          aria-label="Sin leer"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* El rail nunca queda vacío: sin curso activo ni pendientes ni
              avisos, orienta hacia el catálogo. */}
          {!lastActive &&
            evaluations.length === 0 &&
            notifications.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-surface p-5 text-center">
                <Bell className="mx-auto h-6 w-6 text-text-tertiary" />
                <p className="mt-2 text-xs text-text-secondary">
                  Aquí verás tu avance y tus avisos en cuanto empieces un curso.
                </p>
              </div>
            )}
        </aside>

        {/* ─── Columna principal ─── */}
        <div className="lg:order-1">
          {/* ─── Mis cursos ─── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-text-primary">
                Mis Cursos
              </h2>
              <Link
                href="/dashboard/courses"
                className="text-sm font-medium text-primary-600 hover:text-primary-800 active:text-primary-800"
              >
                Ver todos
              </Link>
            </div>

            {recentCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-text-tertiary" />
                <p className="mt-2 text-sm text-text-secondary">
                  Aún no tienes cursos inscritos.
                </p>
                <Link
                  href="/courses"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 active:bg-primary-800"
                >
                  Explorar Cursos
                </Link>
              </div>
            ) : (
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                {recentCourses.map((course) => (
                  <Link
                    key={course.courseId}
                    href={`/dashboard/courses/${course.courseId}`}
                    className="flex gap-3 overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-sm transition-colors hover:border-primary-300 active:scale-[0.99]"
                  >
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 shrink-0 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700" />
                    )}

                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-text-tertiary">
                        {course.professor}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <ProgressBar
                          value={course.progress}
                          label={`Avance de ${course.title}`}
                          size="sm"
                        />
                        <span className="shrink-0 text-xs font-semibold text-text-secondary">
                          {course.progress}%
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
