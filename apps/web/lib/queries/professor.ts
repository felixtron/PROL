import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { courseAccessWhere } from "@/lib/course-access";

// Get professor dashboard stats
export const getProfessorDashboardStats = cache(async () => {
  const user = await requireUser();

  // Los ingresos no se muestran al profesor: el dinero del curso lo ve el
  // admin del tenant en /tenant-admin/courses.
  const mine = courseAccessWhere(user.id);

  const [courses, activeStudents, completedEnrollments, totalEnrollments] =
    await Promise.all([
      db.course.findMany({
        where: mine,
        select: { id: true, status: true },
      }),
      db.enrollment.count({
        where: { course: mine, status: "ACTIVE" },
      }),
      db.enrollment.count({
        where: { course: mine, status: "COMPLETED" },
      }),
      db.enrollment.count({
        where: { course: mine },
      }),
    ]);

  const publishedCourses = courses.filter(
    (c) => c.status === "PUBLISHED"
  ).length;
  const draftCourses = courses.filter((c) => c.status === "DRAFT").length;
  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

  return {
    activeStudents,
    publishedCourses,
    draftCourses,
    totalCourses: courses.length,
    completionRate,
  };
});

// Get professor's courses with enrollment counts and revenue
export const getProfessorCourses = cache(
  async (filter?: "all" | "published" | "draft") => {
    const user = await requireUser();

    const statusFilter =
      filter === "published"
        ? { status: "PUBLISHED" as const }
        : filter === "draft"
          ? { status: "DRAFT" as const }
          : {};

    const courses = await db.course.findMany({
      where: {
        ...courseAccessWhere(user.id),
        ...statusFilter,
      },
      include: {
        _count: { select: { enrollments: true } },
        professor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      thumbnail: c.thumbnail,
      status: c.status,
      priceInCents: c.priceInCents,
      currency: c.currency,
      students: c._count.enrollments,
      totalLessons: c.totalLessons,
      // Un curso puede ser propio o compartido: la UI lo distingue para que
      // el profesor sepa en cuál está invitado a colaborar.
      isOwner: c.professorId === user.id,
      ownerName: c.professor.name ?? c.professor.email,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }
);

// Get recent activity for professor's courses
export const getProfessorRecentActivity = cache(async (limit = 10) => {
  const user = await requireUser();

  // Inscripciones y finalizaciones. Los pagos quedaron fuera del feed: el
  // profesor no ve dinero en ninguna vista.
  const mine = courseAccessWhere(user.id);
  const [recentEnrollments, recentCompletions] = await Promise.all([
    db.enrollment.findMany({
      where: { course: mine },
      include: {
        student: { select: { name: true } },
        course: { select: { title: true } },
      },
      orderBy: { enrolledAt: "desc" },
      take: limit,
    }),
    db.enrollment.findMany({
      where: {
        course: mine,
        status: "COMPLETED",
      },
      include: {
        student: { select: { name: true } },
        course: { select: { title: true } },
      },
      orderBy: { completedAt: "desc" },
      take: limit,
    }),
  ]);

  type ActivityItem = {
    type: "enrollment" | "completion";
    text: string;
    time: Date;
  };

  const activities: ActivityItem[] = [
    ...recentEnrollments.map((e) => ({
      type: "enrollment" as const,
      text: `Nuevo alumno: ${e.student.name ?? "Estudiante"}`,
      time: e.enrolledAt,
    })),
    ...recentCompletions
      .filter((e) => e.completedAt)
      .map((e) => ({
        type: "completion" as const,
        text: `${e.student.name ?? "Estudiante"} completó ${e.course.title}`,
        time: e.completedAt!,
      })),
  ];

  return activities
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, limit);
});
