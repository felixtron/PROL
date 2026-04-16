import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

// Get dashboard stats for current student
export const getStudentDashboardStats = cache(async () => {
  const user = await requireUser();

  const [enrollmentCount, completedLessons, certificates, totalStudyMinutes] =
    await Promise.all([
      db.enrollment.count({
        where: { studentId: user.id, status: "ACTIVE" },
      }),
      db.lessonProgress.count({
        where: {
          enrollment: { studentId: user.id },
          status: "COMPLETED",
        },
      }),
      db.certificate.count({
        where: { enrollment: { studentId: user.id } },
      }),
      // Sum video duration of completed lessons
      db.lessonProgress.findMany({
        where: {
          enrollment: { studentId: user.id },
          status: "COMPLETED",
        },
        select: {
          lesson: { select: { videoDurationSeconds: true } },
        },
      }),
    ]);

  const studyHours =
    totalStudyMinutes.reduce(
      (acc, lp) => acc + (lp.lesson.videoDurationSeconds ?? 0),
      0
    ) / 3600;

  return {
    enrolledCourses: enrollmentCount,
    completedLessons,
    certificates,
    studyHours: Math.round(studyHours * 10) / 10,
  };
});

// Get student's enrolled courses with progress
export const getStudentCourses = cache(
  async (filter?: "all" | "in_progress" | "completed") => {
    const user = await requireUser();

    const statusFilter =
      filter === "in_progress"
        ? { status: "ACTIVE" as const, progress: { lt: 1.0 } }
        : filter === "completed"
          ? { status: "COMPLETED" as const }
          : {};

    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: user.id,
        ...statusFilter,
      },
      include: {
        course: {
          include: {
            professor: { select: { name: true } },
          },
        },
        lessonProgresses: {
          where: { status: "COMPLETED" },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      courseId: e.courseId,
      title: e.course.title,
      slug: e.course.slug,
      thumbnail: e.course.thumbnail,
      professor: e.course.professor.name ?? "Profesor",
      progress: Math.round(e.progress * 100),
      status: e.status,
      totalLessons: e.course.totalLessons,
      completedLessons: e.lessonProgresses.length,
      enrolledAt: e.enrolledAt,
    }));
  }
);

// Get the most recently active course for "Continue Learning" section
export const getLastActiveCourse = cache(async () => {
  const user = await requireUser();

  const enrollment = await db.enrollment.findFirst({
    where: {
      studentId: user.id,
      status: "ACTIVE",
      progress: { lt: 1.0 },
    },
    include: {
      course: {
        include: {
          professor: { select: { name: true } },
        },
      },
      lessonProgresses: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          lesson: {
            select: {
              title: true,
              position: true,
              module: { select: { position: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!enrollment) return null;

  const lastLesson = enrollment.lessonProgresses[0]?.lesson;

  return {
    enrollmentId: enrollment.id,
    courseId: enrollment.courseId,
    title: enrollment.course.title,
    slug: enrollment.course.slug,
    thumbnail: enrollment.course.thumbnail,
    professor: enrollment.course.professor.name ?? "Profesor",
    progress: Math.round(enrollment.progress * 100),
    totalLessons: enrollment.course.totalLessons,
    currentLessonTitle: lastLesson?.title,
  };
});
