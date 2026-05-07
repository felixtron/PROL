import { cache } from "react";
import { db } from "@prol/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Admin dashboard KPIs.
 *
 * `mode = "production"` (default): only counts entities with at least one
 * COMPLETED payment behind them — i.e. real revenue, real customers. Use
 * this when showing numbers to the business / investor.
 *
 * `mode = "demo"`: counts every user/course/tenant/enrollment regardless of
 * payment status. Used during PoC walkthroughs where seed data is part of
 * the demo.
 */
export const getAdminDashboardStats = cache(
  async (mode: "demo" | "production" = "production") => {
    await requireAdmin();

    const [revenue, users, courses, tenants, enrollments] = await Promise.all([
      db.coursePayment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true, prolFee: true, creatorReceives: true },
      }),
      mode === "production"
        ? db.coursePayment
            .findMany({
              where: { status: "COMPLETED" },
              distinct: ["studentId"],
              select: { studentId: true },
            })
            .then((r) => r.length)
        : db.user.count(),
      mode === "production"
        ? db.coursePayment
            .findMany({
              where: { status: "COMPLETED" },
              distinct: ["courseId"],
              select: { courseId: true },
            })
            .then((r) => r.length)
        : db.course.count(),
      mode === "production"
        ? db.coursePayment
            .findMany({
              where: { status: "COMPLETED" },
              distinct: ["tenantId"],
              select: { tenantId: true },
            })
            .then((r) => r.length)
        : db.tenant.count({ where: { status: { in: ["TRIAL", "ACTIVE"] } } }),
      mode === "production"
        ? db.coursePayment.count({ where: { status: "COMPLETED" } })
        : db.enrollment.count(),
    ]);

    return {
      totalRevenue: (revenue._sum.amount ?? 0) / 100,
      prolFees: (revenue._sum.prolFee ?? 0) / 100,
      creatorPayouts: (revenue._sum.creatorReceives ?? 0) / 100,
      totalUsers: users,
      totalCourses: courses,
      activeTenants: tenants,
      totalEnrollments: enrollments,
    };
  },
);

export const getAdminTenants = cache(async () => {
  await requireAdmin();

  return db.tenant.findMany({
    include: {
      _count: { select: { users: true, courses: true } },
    },
    orderBy: { createdAt: "desc" },
  });
});

export const getAdminTenantDetail = cache(async (id: string) => {
  await requireAdmin();

  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
        },
      },
      courses: {
        select: {
          id: true,
          title: true,
          status: true,
          priceInCents: true,
          _count: { select: { enrollments: true } },
        },
      },
      _count: { select: { users: true, courses: true, enrollments: true } },
    },
  });

  if (!tenant) throw new Error("Tenant no encontrado");

  const revenue = await db.coursePayment.aggregate({
    where: { tenantId: id, status: "COMPLETED" },
    _sum: { amount: true, prolFee: true, creatorReceives: true },
  });

  return {
    ...tenant,
    revenue: {
      total: (revenue._sum.amount ?? 0) / 100,
      prolFee: (revenue._sum.prolFee ?? 0) / 100,
      creatorPayouts: (revenue._sum.creatorReceives ?? 0) / 100,
    },
  };
});

export const getAdminUsers = cache(async (role?: string) => {
  await requireAdmin();

  return db.user.findMany({
    where: role ? { role: role as any } : {},
    include: { tenant: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
});

export const getAdminRevenue = cache(async () => {
  await requireAdmin();

  const payments = await db.coursePayment.findMany({
    where: { status: "COMPLETED" },
    include: {
      tenant: { select: { name: true, slug: true } },
      course: { select: { title: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  const byTenant = new Map<
    string,
    {
      name: string;
      total: number;
      prolFee: number;
      creatorReceives: number;
      count: number;
    }
  >();

  for (const p of payments) {
    const existing = byTenant.get(p.tenantId) ?? {
      name: p.tenant.name,
      total: 0,
      prolFee: 0,
      creatorReceives: 0,
      count: 0,
    };
    existing.total += p.amount;
    existing.prolFee += p.prolFee;
    existing.creatorReceives += p.creatorReceives;
    existing.count++;
    byTenant.set(p.tenantId, existing);
  }

  return {
    recentPayments: payments.slice(0, 20).map((p) => ({
      id: p.id,
      amount: p.amount / 100,
      prolFee: p.prolFee / 100,
      creatorReceives: p.creatorReceives / 100,
      tenant: p.tenant.name,
      course: p.course.title,
      paidAt: p.paidAt,
    })),
    byTenant: Array.from(byTenant.entries()).map(([id, data]) => ({
      tenantId: id,
      name: data.name,
      total: data.total / 100,
      prolFee: data.prolFee / 100,
      creatorReceives: data.creatorReceives / 100,
      count: data.count,
    })),
  };
});

export const getAdminProfessors = cache(async () => {
  await requireAdmin();

  // Single query for professors with their courses and enrollment counts
  const professors = await db.user.findMany({
    where: { role: "PROFESSOR" },
    include: {
      tenant: { select: { name: true } },
      taughtCourses: {
        select: { id: true, _count: { select: { enrollments: true } } },
      },
    },
  });

  // Single aggregation query for all professors' revenue (avoids N+1)
  const revenueByProfessor = await db.coursePayment.groupBy({
    by: ["courseId"],
    where: {
      status: "COMPLETED",
      course: { professorId: { in: professors.map((p) => p.id) } },
    },
    _sum: { creatorReceives: true },
  });

  // Build a lookup: courseId -> revenue
  const courseRevenue = new Map<string, number>();
  for (const r of revenueByProfessor) {
    courseRevenue.set(r.courseId, r._sum.creatorReceives ?? 0);
  }

  return professors.map((prof) => {
    const profRevenue = prof.taughtCourses.reduce(
      (sum, c) => sum + (courseRevenue.get(c.id) ?? 0),
      0
    );
    return {
      id: prof.id,
      name: prof.name,
      email: prof.email,
      tenant: prof.tenant?.name ?? "Sin tenant",
      courses: prof.taughtCourses.length,
      students: prof.taughtCourses.reduce(
        (sum, c) => sum + c._count.enrollments,
        0
      ),
      revenue: profRevenue / 100,
      lastLogin: prof.lastLoginAt,
    };
  });
});
