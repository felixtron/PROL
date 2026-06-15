import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

const lessonSelect = {
  id: true,
  title: true,
  type: true,
  position: true,
  videoDurationSeconds: true,
  videoUrl: true,
  videoProvider: true,
  videoHash: true,
  content: true,
} as const;

// Carga módulos de nivel superior (parentModuleId = null) con sus lecciones
// directas y sus submódulos anidados (cada uno con sus lecciones). Reutilizado
// en el modo enrolled y en el preview.
const moduleInclude = {
  where: { parentModuleId: null },
  orderBy: { position: "asc" },
  include: {
    lessons: { orderBy: { position: "asc" }, select: lessonSelect },
    submodules: {
      orderBy: { position: "asc" },
      include: {
        lessons: { orderBy: { position: "asc" }, select: lessonSelect },
      },
    },
  },
} as const;

export const getStudentCourseDetail = cache(async (courseId: string) => {
  const user = await requireUser();

  const enrollment = await db.enrollment.findFirst({
    where: {
      courseId,
      studentId: user.id,
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    include: {
      course: {
        include: {
          professor: { select: { id: true, name: true, avatar: true } },
          modules: moduleInclude,
        },
      },
      lessonProgresses: true,
    },
  });

  if (enrollment) {
    return {
      enrollment,
      course: enrollment.course,
      professor: enrollment.course.professor,
      modules: enrollment.course.modules,
      progress: enrollment.progress,
      lessonProgress: enrollment.lessonProgresses,
      isPreview: false as const,
    };
  }

  // Preview mode: the user is not enrolled but is allowed to see the
  // course as if it were unlocked. Granted to the course's own professor,
  // any ADMIN of the same tenant, and SUPER_ADMIN. Useful for QA before
  // publishing or for the "Vista Previa" link in /professor/courses.
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      professor: { select: { id: true, name: true, avatar: true } },
      modules: moduleInclude,
    },
  });
  if (!course) throw new Error("Curso no encontrado");

  const canPreview =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.tenantId === course.tenantId) ||
    (user.role === "PROFESSOR" && course.professorId === user.id);
  if (!canPreview) throw new Error("No estás inscrito en este curso");

  return {
    // Synthetic enrollment so the client player has a stable shape. The
    // ID is namespaced with `preview-` so server actions can detect this
    // mode and refuse to persist progress.
    enrollment: { id: `preview-${user.id}-${courseId}` },
    course,
    professor: course.professor,
    modules: course.modules,
    progress: 0,
    lessonProgress: [] as { id: string; lessonId: string; status: string }[],
    isPreview: true as const,
  };
});
