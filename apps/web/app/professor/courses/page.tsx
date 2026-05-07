import Link from "next/link";
import {
  Plus,
  Users,
  BookOpen,
  DollarSign,
  Eye,
  Pencil,
  Archive,
} from "lucide-react";
import { getProfessorCourses } from "@/lib/queries/professor";
import { archiveCourse } from "@/lib/actions/course";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(amount);
}

const statusStyles: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-surface-tertiary text-text-secondary",
  ARCHIVED: "bg-amber-50 text-amber-700",
  REVIEW: "bg-blue-50 text-blue-700",
};

const statusLabels: Record<string, string> = {
  PUBLISHED: "Publicado",
  DRAFT: "Borrador",
  ARCHIVED: "Archivado",
  REVIEW: "En Revisión",
};

export default async function ProfessorCoursesPage() {
  const courses = await getProfessorCourses("all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Gestión de Cursos
        </h1>
        <Link
          href="/professor/courses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Curso
        </Link>
      </div>

      {/* Course List */}
      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            Aún no tienes cursos. Crea tu primer curso.
          </p>
          <Link
            href="/professor/courses/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Crear Curso
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Thumbnail */}
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="hidden h-28 w-44 shrink-0 rounded-lg object-cover sm:block"
                />
              ) : (
                <div className="hidden h-28 w-44 shrink-0 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 sm:flex sm:items-center sm:justify-center">
                  <BookOpen className="h-10 w-10 text-white/50" />
                </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate font-heading text-base font-semibold text-text-primary">
                        {course.title}
                      </h3>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${statusStyles[course.status] ?? statusStyles.DRAFT}`}
                      >
                        {statusLabels[course.status] ?? course.status}
                      </span>
                    </div>
                    {course.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                        {course.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats + Actions */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5 text-sm text-text-tertiary">
                      <Users className="h-4 w-4" />
                      <span>{course.students} alumnos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-text-tertiary">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.totalLessons} lecciones</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-text-tertiary">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatCurrency(course.revenue)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/professor/courses/${course.id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>
                    <Link
                      href={`/courses/${course.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Vista Previa
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await archiveCourse(course.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archivar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
