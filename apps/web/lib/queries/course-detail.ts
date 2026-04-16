import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

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
          professor: {
            select: { id: true, name: true, avatar: true },
          },
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
                  videoHash: true,
                  content: true,
                },
              },
            },
          },
        },
      },
      lessonProgresses: true,
    },
  });

  if (!enrollment) throw new Error("No estás inscrito en este curso");

  return {
    enrollment,
    course: enrollment.course,
    professor: enrollment.course.professor,
    modules: enrollment.course.modules,
    progress: enrollment.progress,
    lessonProgress: enrollment.lessonProgresses,
  };
});
