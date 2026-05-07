import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Clock,
  Users,
  Play,
  FileText,
  Brain,
  ClipboardList,
  ChevronDown,
  GraduationCap,
  Download,
} from "lucide-react";
import { getCourseBySlug } from "@/lib/queries/catalog";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutButton } from "./checkout-button";

function formatCurrency(cents: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const lessonTypeIcons: Record<
  "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "MULTI" | "DOWNLOAD",
  typeof Play
> = {
  VIDEO: Play,
  TEXT: FileText,
  QUIZ: Brain,
  ASSIGNMENT: ClipboardList,
  MULTI: BookOpen,
  DOWNLOAD: Download,
};

function ProfessorAvatar({
  name,
  avatar,
  size = "md",
}: {
  name: string;
  avatar: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={size === "lg" ? 48 : size === "md" ? 40 : 32}
        height={size === "lg" ? 48 : size === "md" ? 40 : 32}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  );
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getCourseBySlug(slug);

  if (!result) {
    notFound();
  }

  const { course, isEnrolled } = result;
  const user = await getCurrentUser();
  const isLoggedIn = user !== null;

  // Count total lessons across all modules
  const totalModuleLessons = course.modules.reduce(
    (acc, mod) => acc + mod.lessons.length,
    0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Content Column (2/3) */}
        <div className="lg:col-span-2">
          {/* Category badge */}
          {course.category && (
            <span className="mb-3 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
              {course.category}
            </span>
          )}

          {/* Title */}
          <h1 className="font-heading text-3xl font-bold text-text-primary sm:text-4xl">
            {course.title}
          </h1>

          {/* Description */}
          {course.description && (
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              {course.description}
            </p>
          )}

          {/* Quick stats */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-text-tertiary" />
              {course.totalLessons}{" "}
              {course.totalLessons === 1 ? "leccion" : "lecciones"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-text-tertiary" />
              {formatDuration(course.totalDurationMinutes)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-text-tertiary" />
              {course.studentsCount}{" "}
              {course.studentsCount === 1 ? "estudiante" : "estudiantes"}
            </span>
          </div>

          {/* Professor card */}
          <div className="mt-8 flex items-center gap-3 rounded-lg border border-border bg-surface-secondary p-4">
            <ProfessorAvatar
              name={course.professorName}
              avatar={course.professorAvatar}
              size="lg"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Profesor
              </p>
              <p className="text-base font-semibold text-text-primary">
                {course.professorName}
              </p>
            </div>
          </div>

          {/* Course content / Curriculum */}
          <div className="mt-10">
            <h2 className="font-heading text-xl font-bold text-text-primary">
              Contenido del Curso
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {course.modules.length}{" "}
              {course.modules.length === 1 ? "modulo" : "modulos"} &middot;{" "}
              {totalModuleLessons}{" "}
              {totalModuleLessons === 1 ? "leccion" : "lecciones"}
            </p>

            <div className="mt-4 space-y-3">
              {course.modules.map((mod, modIndex) => (
                <details
                  key={modIndex}
                  className="group rounded-lg border border-border bg-surface"
                  open={modIndex === 0}
                >
                  <summary className="flex cursor-pointer items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
                        {modIndex + 1}
                      </span>
                      <div>
                        <h3 className="font-heading text-sm font-semibold text-text-primary">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-text-tertiary">
                          {mod.lessons.length}{" "}
                          {mod.lessons.length === 1 ? "leccion" : "lecciones"}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-text-tertiary transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="border-t border-border px-4 py-2">
                    <ul className="divide-y divide-border">
                      {mod.lessons.map((lesson, lessonIndex) => {
                        const LessonIcon =
                          lessonTypeIcons[lesson.type] ?? FileText;

                        return (
                          <li
                            key={lessonIndex}
                            className="flex items-center justify-between py-3"
                          >
                            <div className="flex items-center gap-3">
                              <LessonIcon className="h-4 w-4 shrink-0 text-text-tertiary" />
                              <span className="text-sm text-text-secondary">
                                {lesson.title}
                              </span>
                              {lesson.isFree && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Gratis
                                </span>
                              )}
                            </div>
                            {lesson.type === "VIDEO" &&
                              lesson.videoDurationSeconds != null && (
                                <span className="shrink-0 text-xs text-text-tertiary">
                                  {formatSeconds(lesson.videoDurationSeconds)}
                                </span>
                              )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar (1/3, sticky) */}
        <aside className="mt-8 lg:mt-0">
          <div className="sticky top-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            {/* Thumbnail or preview */}
            {course.thumbnail ? (
              <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-lg">
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              </div>
            ) : (
              <div className="mb-6 flex aspect-video w-full items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
                <GraduationCap className="h-12 w-12 text-white/60" />
              </div>
            )}

            {/* Price */}
            <div className="mb-6 text-center">
              {course.priceInCents === 0 ? (
                <span className="text-3xl font-bold text-emerald-600">
                  Gratis
                </span>
              ) : (
                <span className="text-3xl font-bold text-text-primary">
                  {formatCurrency(course.priceInCents, course.currency)}
                </span>
              )}
            </div>

            {/* CTA button */}
            <div className="mb-6">
              {isEnrolled ? (
                <Link
                  href={`/dashboard/courses/${course.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                  <Play className="h-4 w-4" />
                  Continuar Curso
                </Link>
              ) : isLoggedIn ? (
                <CheckoutButton
                  courseId={course.id}
                  priceInCents={course.priceInCents}
                  currency={course.currency}
                  isFree={course.priceInCents === 0}
                />
              ) : (
                <Link
                  href="/sign-in"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                  Iniciar Sesion para Inscribirse
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-text-secondary">
                  <BookOpen className="h-4 w-4 text-text-tertiary" />
                  Lecciones
                </span>
                <span className="font-medium text-text-primary">
                  {course.totalLessons}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-text-secondary">
                  <Clock className="h-4 w-4 text-text-tertiary" />
                  Duracion
                </span>
                <span className="font-medium text-text-primary">
                  {formatDuration(course.totalDurationMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-text-secondary">
                  <Users className="h-4 w-4 text-text-tertiary" />
                  Estudiantes
                </span>
                <span className="font-medium text-text-primary">
                  {course.studentsCount}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
