import { cache } from "react";
import { db } from "@prol/db";
import { requireUser, requireAdmin } from "@/lib/auth";
import { courseAccessWhere } from "@/lib/course-access";

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
        course: courseAccessWhere(user.id),
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
 * Ingresos mensuales del profesor, para la gráfica de tendencia.
 *
 * Deliberadamente alineada con `getRevenueStats` (lib/queries/revenue):
 *
 *   - suma `creatorReceives`, no `amount`, porque lo que ve el profesor es
 *     lo que le queda tras el revenue share, no lo que pagó el alumno;
 *   - filtra por `professorId` y no por `courseAccessWhere`, porque un
 *     colaborador co-crea el curso pero no cobra por él;
 *   - agrupa por `createdAt` y no por `paidAt`, que es nullable.
 *
 * Si estas tres decisiones no coincidieran con las de `getRevenueStats`,
 * la gráfica y las tarjetas de la misma página contarían historias
 * distintas.
 */
export const getRevenueByMonth = cache(async (monthsBack = 6) => {
  const user = await requireUser();
  const now = new Date();

  const monthlyData = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
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
        course: { professorId: user.id },
        status: "COMPLETED",
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { creatorReceives: true },
    });

    monthlyData.push({
      month: MONTH_NAMES[monthStart.getMonth()] ?? "",
      // En pesos: la gráfica pinta el valor tal cual, y en la DB son centavos.
      revenue: (revenue._sum.creatorReceives ?? 0) / 100,
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
      ...courseAccessWhere(user.id),
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
