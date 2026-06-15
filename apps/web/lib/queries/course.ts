import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

// Shape de lección para el editor; reutilizado en lecciones directas del
// módulo y en lecciones de submódulos.
const lessonEditSelect = {
  id: true,
  title: true,
  type: true,
  position: true,
  videoDurationSeconds: true,
  videoUrl: true,
  videoProvider: true,
  videoRawUrl: true,
  content: true,
  aiStatus: true,
  interactiveStops: {
    orderBy: { timestampSeconds: "asc" },
    select: {
      id: true,
      timestampSeconds: true,
      type: true,
      content: true,
      isRequired: true,
    },
  },
} as const;

export const getCourseForEdit = cache(async (courseId: string) => {
  const user = await requireUser();

  const course = await db.course.findFirst({
    where: {
      id: courseId,
      professorId: user.id,
    },
    include: {
      modules: {
        // Solo módulos de nivel superior; los submódulos se cargan anidados.
        where: { parentModuleId: null },
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            select: lessonEditSelect,
          },
          submodules: {
            orderBy: { position: "asc" },
            include: {
              lessons: {
                orderBy: { position: "asc" },
                select: lessonEditSelect,
              },
            },
          },
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  });

  if (!course) throw new Error("Curso no encontrado");

  // All quizzes in the course — used by the MULTI block editor to reference
  // existing quizzes as quiz-blocks, and by the quiz builder to know whether
  // another quiz already holds the "final exam" flag (disables the toggle).
  const quizzes = await db.quiz.findMany({
    where: { lesson: { module: { courseId } } },
    select: { id: true, title: true, isFinalExam: true },
    orderBy: { createdAt: "asc" },
  });

  return { ...course, quizzes };
});
