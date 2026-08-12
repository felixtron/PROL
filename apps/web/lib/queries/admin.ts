import { cache } from "react";
import { db, Prisma } from "@prol/db";
import { requireAdmin } from "@/lib/auth";

/** Tope de filas devueltas por las tablas del panel de superusuario. */
export const ADMIN_LIST_LIMIT = 500;

export type AdminRoleFilter = "STUDENT" | "PROFESSOR" | "ADMIN" | "SUPER_ADMIN";

/**
 * Busca el texto en nombre / email del usuario, en nombre / slug del tenant
 * y en el nombre de la empresa a la que pertenece.
 */
function userSearchClause(search: string): Prisma.UserWhereInput[] {
  return [
    { name: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
    { tenant: { name: { contains: search, mode: "insensitive" } } },
    { tenant: { slug: { contains: search, mode: "insensitive" } } },
    { company: { name: { contains: search, mode: "insensitive" } } },
  ];
}

/** Columnas por las que se puede clasificar la tabla de usuarios. */
export const ADMIN_USER_SORTS = [
  "name",
  "email",
  "role",
  "company",
  "tenant",
  "lastLogin",
  "createdAt",
] as const;

export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];
export type SortDirection = "asc" | "desc";

/**
 * Traduce (columna, dirección) al `orderBy` de Prisma. Los nulos siempre van
 * al final para que "Sin empresa" / "Nunca" no encabecen la tabla.
 */
function userOrderBy(
  sort: AdminUserSort,
  dir: SortDirection,
): Prisma.UserOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { name: { sort: dir, nulls: "last" } };
    case "email":
      return { email: dir };
    case "role":
      return { role: dir };
    case "company":
      return { company: { name: dir } };
    case "tenant":
      return { tenant: { name: dir } };
    case "lastLogin":
      return { lastLoginAt: { sort: dir, nulls: "last" } };
    case "createdAt":
      return { createdAt: dir };
  }
}

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

export interface AdminUsersFilter {
  /**
   * Texto libre: nombre o email del usuario, nombre o slug del tenant,
   * nombre de la empresa.
   */
  search?: string;
  role?: AdminRoleFilter;
  tenantId?: string;
  companyId?: string;
  /** "none" = usuarios sin empresa asignada. */
  companyFilter?: "none";
  sort?: AdminUserSort;
  dir?: SortDirection;
}

export const getAdminUsers = cache(async (filter: AdminUsersFilter = {}) => {
  await requireAdmin();

  const where: Prisma.UserWhereInput = {};
  if (filter.search) where.OR = userSearchClause(filter.search);
  if (filter.role) where.role = filter.role;
  if (filter.tenantId) where.tenantId = filter.tenantId;
  if (filter.companyFilter === "none") where.companyId = null;
  else if (filter.companyId) where.companyId = filter.companyId;

  return db.user.findMany({
    where,
    include: {
      tenant: { select: { name: true, slug: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: userOrderBy(filter.sort ?? "createdAt", filter.dir ?? "desc"),
    take: ADMIN_LIST_LIMIT,
  });
});

/**
 * Totales globales de usuarios por rol. Se calculan aparte de `getAdminUsers`
 * para que las tarjetas de resumen no cambien al filtrar la tabla.
 */
export const getAdminUserStats = cache(async () => {
  await requireAdmin();

  const grouped = await db.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });

  const byRole = new Map(grouped.map((g) => [g.role, g._count._all]));

  return {
    total: grouped.reduce((sum, g) => sum + g._count._all, 0),
    students: byRole.get("STUDENT") ?? 0,
    professors: byRole.get("PROFESSOR") ?? 0,
    admins: (byRole.get("ADMIN") ?? 0) + (byRole.get("SUPER_ADMIN") ?? 0),
  };
});

/** Tenants (id + nombre) para los selectores de filtro del panel admin. */
export const getAdminTenantOptions = cache(async () => {
  await requireAdmin();

  return db.tenant.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
});

/**
 * Empresas para el selector de filtro. Los nombres solo son únicos dentro de
 * un tenant, así que se devuelve también el tenant para poder distinguirlas
 * cuando se listan todas.
 */
export const getAdminCompanyOptions = cache(async () => {
  await requireAdmin();

  const companies = await db.company.findMany({
    select: {
      id: true,
      name: true,
      tenantId: true,
      tenant: { select: { name: true } },
      _count: { select: { members: true } },
    },
    orderBy: [{ tenant: { name: "asc" } }, { name: "asc" }],
  });

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    tenantId: c.tenantId,
    tenantName: c.tenant.name,
    members: c._count.members,
  }));
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

export interface AdminProfessorsFilter {
  /** Texto libre: nombre o email del profesor, nombre o slug del tenant. */
  search?: string;
  tenantId?: string;
}

export const getAdminProfessors = cache(
  async (filter: AdminProfessorsFilter = {}) => {
    await requireAdmin();

    const where: Prisma.UserWhereInput = { role: "PROFESSOR" };
    if (filter.search) where.OR = userSearchClause(filter.search);
    if (filter.tenantId) where.tenantId = filter.tenantId;

    // Single query for professors with their courses and enrollment counts
    const professors = await db.user.findMany({
      where,
      include: {
        tenant: { select: { name: true } },
        taughtCourses: {
          select: { id: true, _count: { select: { enrollments: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: ADMIN_LIST_LIMIT,
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
  }
);

/**
 * Totales globales de profesores. Igual que en usuarios, se calculan aparte
 * para que las tarjetas de resumen no dependan del filtro de la tabla.
 */
export const getAdminProfessorStats = cache(async () => {
  await requireAdmin();

  const [professors, courses, students] = await Promise.all([
    db.user.count({ where: { role: "PROFESSOR" } }),
    db.course.count({ where: { professor: { role: "PROFESSOR" } } }),
    db.enrollment.count({
      where: { course: { professor: { role: "PROFESSOR" } } },
    }),
  ]);

  return { professors, courses, students };
});
