import { cache } from "react";
import { db } from "@prol/db";
import { getCurrentTenant } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth";

export type CatalogCourse = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  priceInCents: number;
  currency: string;
  category: string | null;
  totalLessons: number;
  totalDurationMinutes: number;
  professorName: string;
  professorAvatar: string | null;
  studentsCount: number;
};

export type CatalogFilters = {
  search?: string;
  category?: string;
  sort?: "newest" | "popular" | "price-low" | "price-high";
  page?: number;
  pageSize?: number;
};

export type PaginatedCatalog = {
  courses: CatalogCourse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getCatalogCourses(
  filters: CatalogFilters = {}
): Promise<PaginatedCatalog> {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return {
      courses: [],
      total: 0,
      page: 1,
      pageSize: filters.pageSize ?? 12,
      totalPages: 0,
    };
  }

  const {
    search,
    category,
    sort = "newest",
    page = 1,
    pageSize = 12,
  } = filters;

  // Build where clause
  const where = {
    tenantId: tenant.id,
    status: "PUBLISHED" as const,
    ...(search && {
      title: {
        contains: search,
        mode: "insensitive" as const,
      },
    }),
    ...(category && { category }),
  };

  // Build orderBy clause
  let orderBy:
    | { publishedAt: "desc" }
    | { enrollments: { _count: "desc" } }
    | { priceInCents: "asc" }
    | { priceInCents: "desc" };

  switch (sort) {
    case "popular":
      orderBy = { enrollments: { _count: "desc" } };
      break;
    case "price-low":
      orderBy = { priceInCents: "asc" };
      break;
    case "price-high":
      orderBy = { priceInCents: "desc" };
      break;
    case "newest":
    default:
      orderBy = { publishedAt: "desc" };
      break;
  }

  // Get total count
  const total = await db.course.count({ where });

  // Get paginated courses
  const courses = await db.course.findMany({
    where,
    include: {
      professor: {
        select: {
          name: true,
          avatar: true,
          image: true,
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const totalPages = Math.ceil(total / pageSize);

  return {
    courses: courses.map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail: course.thumbnail,
      priceInCents: course.priceInCents,
      currency: course.currency,
      category: course.category,
      totalLessons: course.totalLessons,
      totalDurationMinutes: course.totalDurationMinutes,
      professorName: course.professor.name ?? "Profesor",
      professorAvatar: course.professor.avatar ?? course.professor.image,
      studentsCount: course._count.enrollments,
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export const getCatalogCategories = cache(async (): Promise<string[]> => {
  const tenant = await getCurrentTenant();
  if (!tenant) return [];

  const courses = await db.course.findMany({
    where: {
      tenantId: tenant.id,
      status: "PUBLISHED",
      category: { not: null },
    },
    select: {
      category: true,
    },
    distinct: ["category"],
  });

  return courses
    .map((c) => c.category)
    .filter((c): c is string => c !== null)
    .sort();
});

export type CourseDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  previewVideoUrl: string | null;
  priceInCents: number;
  currency: string;
  category: string | null;
  totalLessons: number;
  totalDurationMinutes: number;
  professorName: string;
  professorAvatar: string | null;
  studentsCount: number;
  modules: {
    title: string;
    lessons: {
      title: string;
      type: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT";
      videoDurationSeconds: number | null;
      isFree: boolean;
    }[];
  }[];
};

export const getCourseBySlug = cache(
  async (
    slug: string
  ): Promise<{ course: CourseDetail; isEnrolled: boolean } | null> => {
    const tenant = await getCurrentTenant();
    if (!tenant) return null;

    const course = await db.course.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug,
        },
      },
      include: {
        professor: {
          select: {
            name: true,
            avatar: true,
            image: true,
          },
        },
        modules: {
          where: { isPublished: true },
          orderBy: { position: "asc" },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { position: "asc" },
              select: {
                title: true,
                type: true,
                videoDurationSeconds: true,
                isFree: true,
              },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!course || course.status !== "PUBLISHED") return null;

    // Check if current user is enrolled (getCurrentUser returns null if not logged in)
    let isEnrolled = false;
    const user = await getCurrentUser();

    if (user) {
      const enrollment = await db.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: user.id,
            courseId: course.id,
          },
        },
        select: { id: true },
      });
      isEnrolled = enrollment !== null;
    }

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
        previewVideoUrl: course.previewVideoUrl,
        priceInCents: course.priceInCents,
        currency: course.currency,
        category: course.category,
        totalLessons: course.totalLessons,
        totalDurationMinutes: course.totalDurationMinutes,
        professorName: course.professor.name ?? "Profesor",
        professorAvatar: course.professor.avatar ?? course.professor.image,
        studentsCount: course._count.enrollments,
        modules: course.modules.map((mod) => ({
          title: mod.title,
          lessons: mod.lessons.map((lesson) => ({
            title: lesson.title,
            type: lesson.type,
            videoDurationSeconds: lesson.videoDurationSeconds,
            isFree: lesson.isFree,
          })),
        })),
      },
      isEnrolled,
    };
  }
);
