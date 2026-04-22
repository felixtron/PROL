import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Clock,
  Users,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getCatalogCourses, getCatalogCategories } from "@/lib/queries/catalog";
import type { CatalogCourse, CatalogFilters } from "@/lib/queries/catalog";
import { CatalogSearch } from "./catalog-search";
import { CatalogSort } from "./catalog-sort";

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

function ProfessorAvatar({
  name,
  avatar,
}: {
  name: string;
  avatar: string | null;
}) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={24}
        height={24}
        className="h-6 w-6 rounded-full object-cover"
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
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
      {initials}
    </div>
  );
}

function CourseCard({ course }: { course: CatalogCourse }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-all hover:shadow-md hover:border-primary-200"
    >
      {/* Thumbnail */}
      {course.thumbnail ? (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
          <BookOpen className="h-10 w-10 text-white/60" />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category badge */}
        {course.category && (
          <span className="mb-2 inline-flex w-fit items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            {course.category}
          </span>
        )}

        {/* Title */}
        <h3 className="font-heading text-base font-semibold text-text-primary line-clamp-2">
          {course.title}
        </h3>

        {/* Description */}
        {course.description && (
          <p className="mt-1.5 text-sm text-text-secondary line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Professor */}
        <div className="mt-3 flex items-center gap-2">
          <ProfessorAvatar
            name={course.professorName}
            avatar={course.professorAvatar}
          />
          <span className="text-sm text-text-secondary">
            {course.professorName}
          </span>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-3 text-xs text-text-tertiary">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.totalLessons} {course.totalLessons === 1 ? "leccion" : "lecciones"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(course.totalDurationMinutes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {course.studentsCount}
          </span>
        </div>

        {/* Price */}
        <div className="mt-auto pt-4">
          {course.priceInCents === 0 ? (
            <span className="text-base font-bold text-emerald-600">
              Gratis
            </span>
          ) : (
            <span className="text-base font-bold text-text-primary">
              {formatCurrency(course.priceInCents, course.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-secondary p-16 text-center">
      <GraduationCap className="h-12 w-12 text-text-tertiary" />
      <h3 className="mt-4 font-heading text-lg font-semibold text-text-primary">
        No hay cursos disponibles
      </h3>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Aun no se han publicado cursos en esta academia. Vuelve pronto para
        descubrir nuevo contenido.
      </p>
    </div>
  );
}

function Págination({
  currentPage,
  totalPages,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  searchParams: URLSearchParams;
}) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    return `/courses?${params.toString()}`;
  };

  // Generate page numbers to show (max 7 pages)
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    // Show pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      {/* Previous button */}
      <Link
        href={createPageUrl(currentPage - 1)}
        className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          currentPage === 1
            ? "pointer-events-none border-border bg-surface-secondary text-text-tertiary"
            : "border-border bg-surface text-text-primary hover:bg-surface-tertiary"
        }`}
        aria-disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Anterior</span>
      </Link>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-text-tertiary"
            >
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={createPageUrl(page)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-primary-600 text-white"
                  : "border border-border bg-surface text-text-primary hover:bg-surface-tertiary"
              }`}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {/* Next button */}
      <Link
        href={createPageUrl(currentPage + 1)}
        className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          currentPage === totalPages
            ? "pointer-events-none border-border bg-surface-secondary text-text-tertiary"
            : "border-border bg-surface text-text-primary hover:bg-surface-tertiary"
        }`}
        aria-disabled={currentPage === totalPages}
      >
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function CourseCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await searchParams
  const params = await searchParams;

  // Parse filters from search params
  const filters: CatalogFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    sort:
      typeof params.sort === "string" &&
      ["newest", "popular", "price-low", "price-high"].includes(params.sort)
        ? (params.sort as CatalogFilters["sort"])
        : "newest",
    page:
      typeof params.page === "string" && !isNaN(Number(params.page))
        ? Number(params.page)
        : 1,
    pageSize: 12,
  };

  // Fetch data
  const [catalogData, categories] = await Promise.all([
    getCatalogCourses(filters),
    getCatalogCategories(),
  ]);

  const { courses, total, page, totalPages } = catalogData;

  // Create URLSearchParams for págination
  const urlSearchParams = new URLSearchParams();
  if (filters.search) urlSearchParams.set("search", filters.search);
  if (filters.category) urlSearchParams.set("category", filters.category);
  if (filters.sort && filters.sort !== "newest")
    urlSearchParams.set("sort", filters.sort);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-text-primary">
          Explorar Cursos
        </h1>
        <p className="mt-2 text-text-secondary">
          Descubre los cursos disponibles y comienza a aprender hoy.
        </p>

        {/* Search and Sort */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <CatalogSearch />
          </div>
          <CatalogSort />
        </div>

        {/* Category filter chips */}
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {/* "Todos" chip */}
            <Link
              href="/courses"
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors ${
                !filters.category
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-border bg-surface text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
              }`}
            >
              Todos
            </Link>
            {categories.map((category) => {
              const params = new URLSearchParams(urlSearchParams.toString());
              params.set("category", category);
              params.delete("page"); // Reset to page 1 when filtering

              return (
                <Link
                  key={category}
                  href={`/courses?${params.toString()}`}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors ${
                    filters.category === category
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-border bg-surface text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
                  }`}
                >
                  {category}
                </Link>
              );
            })}
          </div>
        )}

        {/* Results count */}
        {(filters.search || filters.category) && (
          <p className="mt-4 text-sm text-text-secondary">
            {total === 0
              ? "No se encontraron cursos"
              : `${total} ${total === 1 ? "curso encontrado" : "cursos encontrados"}`}
          </p>
        )}
      </div>

      {/* Course grid */}
      {courses.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {/* Págination */}
          <Págination
            currentPage={page}
            totalPages={totalPages}
            searchParams={urlSearchParams}
          />
        </>
      )}
    </div>
  );
}
