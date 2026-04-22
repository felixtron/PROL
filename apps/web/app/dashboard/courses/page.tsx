import Link from "next/link";
import { Play, CheckCircle, BookOpen } from "lucide-react";
import { getStudentCourses } from "@/lib/queries/student";

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle className="h-3 w-3" />
        Completado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
      <Play className="h-3 w-3" />
      En Progreso
    </span>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function CoursesPage() {
  const courses = await getStudentCourses("all");

  return (
    <div className="px-4 py-5 md:p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-4 md:mb-6">
        <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
          Mis Cursos
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Gestiona y accede a todos tus cursos.
        </p>
      </div>

      {/* Course cards */}
      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center md:p-12">
          <BookOpen className="mx-auto h-8 w-8 text-text-tertiary" />
          <p className="mt-2 text-sm text-text-secondary">
            No tienes cursos inscritos aún.
          </p>
          <Link
            href="/courses"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:bg-primary-800"
          >
            Explorar Cursos
          </Link>
        </div>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
          {courses.map((course) => (
            <Link
              key={course.enrollmentId}
              href={`/dashboard/courses/${course.courseId}`}
              className="flex gap-3 overflow-hidden rounded-xl bg-surface p-3 shadow-sm active:scale-[0.99] transition-transform md:flex-col md:p-0"
            >
              {/* Thumbnail */}
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="h-24 w-24 shrink-0 rounded-lg object-cover md:h-40 md:w-full md:rounded-none md:rounded-t-xl"
                />
              ) : (
                <div className="h-24 w-24 shrink-0 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 md:h-40 md:w-full md:rounded-none md:rounded-t-xl" />
              )}

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col justify-between md:p-5">
                <div>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text-primary line-clamp-2 md:font-heading md:text-base">
                      {course.title}
                    </h3>
                    <StatusBadge status={course.status} />
                  </div>
                  <p className="text-xs text-text-tertiary">
                    Prof. {course.professor}
                  </p>
                  <p className="mt-0.5 text-[10px] text-text-tertiary md:text-xs">
                    Inscrito: {formatDate(course.enrolledAt)}
                  </p>
                </div>

                {/* Progress */}
                <div className="mt-2 md:mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-text-tertiary md:text-xs">
                      {course.completedLessons} de {course.totalLessons}{" "}
                      lecciones
                    </span>
                    <span className="text-[10px] font-semibold text-text-secondary md:text-xs">
                      {course.progress}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-primary-100 md:h-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        course.status === "COMPLETED"
                          ? "bg-emerald-500"
                          : "bg-primary-600"
                      }`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
