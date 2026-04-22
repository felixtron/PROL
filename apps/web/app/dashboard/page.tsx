import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Award, Play } from "lucide-react";
import {
  getStudentDashboardStats,
  getStudentCourses,
  getLastActiveCourse,
} from "@/lib/queries/student";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [stats, courses, lastActive] = await Promise.all([
    getStudentDashboardStats(),
    getStudentCourses("all"),
    getLastActiveCourse(),
  ]);

  const statCards = [
    {
      label: "Cursos",
      value: stats.enrolledCourses,
      icon: BookOpen,
      color: "text-primary-600",
      bg: "bg-primary-50",
    },
    {
      label: "Lecciones",
      value: stats.completedLessons,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Horas",
      value: stats.studyHours,
      icon: Clock,
      color: "text-accent-600",
      bg: "bg-accent-50",
    },
    {
      label: "Certificados",
      value: stats.certificates,
      icon: Award,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  const displayName = user?.name?.split(" ")[0] ?? "Estudiante";
  const recentCourses = courses.slice(0, 3);

  return (
    <div className="px-4 py-5 md:p-6 lg:p-8">
      {/* ─── Mobile header ─── */}
      <div className="mb-5 md:mb-8">
        <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
          Hola, {displayName}
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Continúa donde lo dejaste.
        </p>
      </div>

      {/* ─── Continue learning card ─── */}
      {lastActive && (
        <section className="mb-5 md:mb-8">
          <Link
            href={`/dashboard/courses/${lastActive.courseId}`}
            className="group block overflow-hidden rounded-xl bg-surface shadow-sm active:scale-[0.99] transition-transform"
          >
            <div className="relative">
              {/* Thumbnail */}
              <div className="relative h-36 w-full bg-gradient-to-br from-primary-500 to-primary-700 sm:h-48">
                {lastActive.thumbnail ? (
                  <img
                    src={lastActive.thumbnail}
                    alt={lastActive.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
                {/* Progress pill on image */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{ width: `${lastActive.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white">
                    {lastActive.progress}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4">
              {lastActive.currentLessonTitle && (
                <p className="mb-0.5 text-xs font-medium text-primary-600">
                  {lastActive.currentLessonTitle}
                </p>
              )}
              <h3 className="font-heading text-base font-bold text-text-primary md:text-lg">
                {lastActive.title}
              </h3>
              <p className="mt-0.5 text-xs text-text-tertiary">
                Prof. {lastActive.professor}
              </p>
            </div>
          </Link>
        </section>
      )}

      {/* ─── Stats grid ─── */}
      <section className="mb-5 md:mb-8">
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl bg-surface p-3 shadow-sm md:p-5"
              >
                <div className="flex flex-col items-center text-center md:flex-row md:items-center md:gap-3 md:text-left">
                  <div
                    className={`mb-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg md:mb-0 md:h-10 md:w-10 ${stat.bg}`}
                  >
                    <Icon
                      className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-text-primary md:text-2xl">
                      {stat.value}
                    </p>
                    <p className="truncate text-[10px] text-text-tertiary md:text-xs">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── My courses ─── */}
      <section>
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <h2 className="font-heading text-base font-semibold text-text-primary md:text-lg">
            Mis Cursos
          </h2>
          <Link
            href="/dashboard/courses"
            className="text-sm font-medium text-primary-600 active:text-primary-800"
          >
            Ver todos
          </Link>
        </div>

        {recentCourses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center md:p-12">
            <BookOpen className="mx-auto h-8 w-8 text-text-tertiary md:h-10 md:w-10" />
            <p className="mt-2 text-sm text-text-secondary">
              Aún no tienes cursos inscritos.
            </p>
            <Link
              href="/courses"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:bg-primary-800"
            >
              Explorar Cursos
            </Link>
          </div>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-5 md:space-y-0 lg:grid-cols-3">
            {recentCourses.map((course) => (
              <Link
                key={course.courseId}
                href={`/dashboard/courses/${course.courseId}`}
                className="flex gap-3 overflow-hidden rounded-xl bg-surface p-3 shadow-sm transition-shadow active:scale-[0.99] md:flex-col md:p-0"
              >
                {/* Thumbnail */}
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover md:h-36 md:w-full md:rounded-none md:rounded-t-xl"
                  />
                ) : (
                  <div className="h-20 w-20 shrink-0 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 md:h-36 md:w-full md:rounded-none md:rounded-t-xl" />
                )}
                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col justify-center md:p-4">
                  <h3 className="text-sm font-semibold text-text-primary line-clamp-2 md:font-heading md:text-base">
                    {course.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {course.professor}
                  </p>
                  {/* Progress */}
                  <div className="mt-2 md:mt-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] text-text-tertiary md:text-xs">
                        Progreso
                      </span>
                      <span className="text-[10px] font-semibold text-text-secondary md:text-xs">
                        {course.progress}%
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-primary-100 md:h-1.5">
                      <div
                        className="h-full rounded-full bg-primary-600 transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
