import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

export const getCourseForEdit = cache(async (courseId: string) => {
  const user = await requireUser();

  const course = await db.course.findFirst({
    where: {
      id: courseId,
      professorId: user.id,
    },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            select: {
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
  // existing quizzes as quiz-blocks.
  const quizzes = await db.quiz.findMany({
    where: { lesson: { module: { courseId } } },
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" },
  });

  return { ...course, quizzes };
});
