import { cache } from "react";
import { db } from "@prol/db";
import { requireUser, requireAdmin } from "@/lib/auth";

// Spanish month abbreviations
const MONTH_NAMES: string[] = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSOR ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get monthly revenue for the professor for the last N months
 */
export const getRevenueByMonth = cache(async (monthsBack = 6) => {
  const user = await requireUser();
  const now = new Date();

  const monthlyData = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23,
      59,
      59
    );

    const [revenue, enrollments] = await Promise.all([
      db.coursePayment.aggregate({
        where: {
          course: { professorId: user.id },
          status: "COMPLETED",
          paidAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { creatorReceives: true },
      }),
      db.enrollment.count({
        where: {
          course: { professorId: user.id },
          enrolledAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),
    ]);

    monthlyData.push({
      month: MONTH_NAMES[monthStart.getMonth()] ?? "",
      revenue: (revenue._sum.creatorReceives ?? 0) / 100,
      enrollments,
    });
  }

  return monthlyData;
});

/**
 * Get monthly enrollment counts for the professor
 */
export const getEnrollmentsByMonth = cache(async (monthsBack = 6) => {
  const user = await requireUser();
  const now = new Date();

  const monthlyData = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23,
      59,
      59
    );

    const count = await db.enrollment.count({
      where: {
        course: { professorId: user.id },
        enrolledAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    monthlyData.push({
      month: MONTH_NAMES[monthStart.getMonth()] ?? "",
      enrollments: count,
    });
  }

  return monthlyData;
});

/**
 * Get student distribution by course for donut chart
 */
export const getCourseDistribution = cache(async () => {
  const user = await requireUser();

  const courses = await db.course.findMany({
    where: {
      professorId: user.id,
      status: "PUBLISHED",
    },
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: {
      enrollments: {
        _count: "desc",
      },
    },
    take: 5, // Top 5 courses
  });

  const colors = [
    "#6366f1", // indigo
    "#f59e0b", // amber
    "#10b981", // emerald
    "#8b5cf6", // purple
    "#ef4444", // red
  ];

  return courses.map((course, index) => ({
    label: course.title,
    value: course._count.enrollments,
    color: colors[index % colors.length] ?? "#6366f1",
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get platform-wide monthly revenue for admin
 */
export const getAdminRevenueByMonth = cache(async (monthsBack = 6) => {
  await requireAdmin();
  const now = new Date();

  const monthlyData = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23,
      59,
      59
    );

    const revenue = await db.coursePayment.aggregate({
      where: {
        status: "COMPLETED",
        paidAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: { amount: true, prolFee: true },
    });

    monthlyData.push({
      month: MONTH_NAMES[monthStart.getMonth()] ?? "",
      revenue: (revenue._sum.amount ?? 0) / 100,
      prolFees: (revenue._sum.prolFee ?? 0) / 100,
    });
  }

  return monthlyData;
});

/**
 * Get enrollment distribution by tenant for admin donut chart
 */
export const getAdminTenantDistribution = cache(async () => {
  await requireAdmin();

  const tenants = await db.tenant.findMany({
    where: {
      status: { in: ["TRIAL", "ACTIVE"] },
    },
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: {
      enrollments: {
        _count: "desc",
      },
    },
    take: 5, // Top 5 tenants
  });

  const colors = [
    "#6366f1", // indigo
    "#f59e0b", // amber
    "#10b981", // emerald
    "#8b5cf6", // purple
    "#ef4444", // red
  ];

  return tenants.map((tenant, index) => ({
    label: tenant.name,
    value: tenant._count.enrollments,
    color: colors[index % colors.length] ?? "#6366f1",
  }));
});
