import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

// Get professor dashboard stats
export const getProfessorDashboardStats = cache(async () => {
  const user = await requireUser();

  const [
    courses,
    activeStudents,
    completedEnrollments,
    totalEnrollments,
    monthlyRevenue,
  ] = await Promise.all([
    db.course.findMany({
      where: { professorId: user.id },
      select: { id: true, status: true },
    }),
    db.enrollment.count({
      where: { course: { professorId: user.id }, status: "ACTIVE" },
    }),
    db.enrollment.count({
      where: { course: { professorId: user.id }, status: "COMPLETED" },
    }),
    db.enrollment.count({
      where: { course: { professorId: user.id } },
    }),
    db.coursePayment.aggregate({
      where: {
        course: { professorId: user.id },
        status: "COMPLETED",
        paidAt: {
          gte: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ),
        },
      },
      _sum: { creatorReceives: true },
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
    monthlyRevenue: (monthlyRevenue._sum.creatorReceives ?? 0) / 100,
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
        professorId: user.id,
        ...statusFilter,
      },
      include: {
        _count: { select: { enrollments: true } },
        payments: {
          where: { status: "COMPLETED" },
          select: { creatorReceives: true },
        },
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
      revenue:
        c.payments.reduce((sum, p) => sum + p.creatorReceives, 0) / 100,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }
);

// Get recent activity for professor's courses
export const getProfessorRecentActivity = cache(async (limit = 10) => {
  const user = await requireUser();

  // Fetch recent enrollments and payments as activity items
  const [recentEnrollments, recentPayments, recentCompletions] =
    await Promise.all([
      db.enrollment.findMany({
        where: { course: { professorId: user.id } },
        include: {
          student: { select: { name: true } },
          course: { select: { title: true } },
        },
        orderBy: { enrolledAt: "desc" },
        take: limit,
      }),
      db.coursePayment.findMany({
        where: {
          course: { professorId: user.id },
          status: "COMPLETED",
        },
        include: { course: { select: { title: true } } },
        orderBy: { paidAt: "desc" },
        take: limit,
      }),
      db.enrollment.findMany({
        where: {
          course: { professorId: user.id },
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
    type: "enrollment" | "payment" | "completion";
    text: string;
    time: Date;
  };

  const activities: ActivityItem[] = [
    ...recentEnrollments.map((e) => ({
      type: "enrollment" as const,
      text: `Nuevo alumno: ${e.student.name ?? "Estudiante"}`,
      time: e.enrolledAt,
    })),
    ...recentPayments.map((p) => ({
      type: "payment" as const,
      text: `Pago recibido: $${(p.creatorReceives / 100).toLocaleString()} ${p.currency}`,
      time: p.paidAt ?? p.createdAt,
    })),
    ...recentCompletions
      .filter((e) => e.completedAt)
      .map((e) => ({
        type: "completion" as const,
        text: `${e.student.name ?? "Estudiante"} completo ${e.course.title}`,
        time: e.completedAt!,
      })),
  ];

  return activities
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, limit);
});
