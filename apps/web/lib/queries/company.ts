import { cache } from "react";
import { db } from "@prol/db";
import { requireTenantAdmin, requireUser } from "@/lib/auth";

/**
 * List all companies in the current admin's tenant.
 */
export const listCompaniesForTenant = cache(async () => {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) return []; // SUPER_ADMIN with no tenant context

  return db.company.findMany({
    where: { tenantId: admin.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { members: true, courseAssignments: true, invitations: true },
      },
    },
  });
});

/**
 * Detailed company view with members, courses and pending invitations.
 */
export const getCompanyDetail = cache(async (companyId: string) => {
  const admin = await requireTenantAdmin();

  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          enrollments: {
            select: {
              id: true,
              progress: true,
              status: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      courseAssignments: {
        where: { isActive: true },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
              priceInCents: true,
              currency: true,
              status: true,
              _count: { select: { enrollments: true } },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
      invitations: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          inviter: { select: { name: true, email: true } },
        },
      },
      _count: { select: { members: true, courseAssignments: true } },
    },
  });

  if (!company) throw new Error("Empresa no encontrada");
  if (admin.role !== "SUPER_ADMIN" && company.tenantId !== admin.tenantId) {
    throw new Error("No autorizado");
  }
  return company;
});

/**
 * Users in the same tenant who are NOT yet assigned to any company.
 * Used for the "Add member" picker.
 */
export const listAssignableUsersForTenant = cache(async (companyId: string) => {
  const admin = await requireTenantAdmin();

  // Verify the company belongs to the admin's tenant.
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { tenantId: true },
  });
  if (!company) throw new Error("Empresa no encontrada");
  if (admin.role !== "SUPER_ADMIN" && company.tenantId !== admin.tenantId) {
    throw new Error("No autorizado");
  }

  return db.user.findMany({
    where: {
      tenantId: company.tenantId,
      role: "STUDENT",
      OR: [{ companyId: null }, { companyId: { not: companyId } }],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      companyId: true,
      company: { select: { id: true, name: true } },
    },
    take: 200,
  });
});

/**
 * Courses in the same tenant that are NOT yet assigned to this company
 * (or whose assignment is inactive). Used for the "Assign course" picker.
 */
export const listAssignableCoursesForCompany = cache(
  async (companyId: string) => {
    const admin = await requireTenantAdmin();

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { tenantId: true },
    });
    if (!company) throw new Error("Empresa no encontrada");
    if (admin.role !== "SUPER_ADMIN" && company.tenantId !== admin.tenantId) {
      throw new Error("No autorizado");
    }

    const activeAssignments = await db.companyCourseAssignment.findMany({
      where: { companyId, isActive: true },
      select: { courseId: true },
    });
    const assignedIds = activeAssignments.map((a) => a.courseId);

    return db.course.findMany({
      where: {
        tenantId: company.tenantId,
        status: "PUBLISHED",
        ...(assignedIds.length > 0 ? { id: { notIn: assignedIds } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
        priceInCents: true,
        currency: true,
        _count: { select: { enrollments: true } },
      },
    });
  }
);

/**
 * For a student dashboard: returns the company they belong to (if any),
 * its members and the active course assignments. Also exposes leaderId so
 * the page can render the leader-only sections (invite form, team report).
 */
export const getMyCompany = cache(async () => {
  const user = await requireUser();
  if (!user.companyId) return null;

  const company = await db.company.findUnique({
    where: { id: user.companyId },
    include: {
      members: {
        where: { id: { not: user.id } },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
        orderBy: { name: "asc" },
        take: 50,
      },
      courseAssignments: {
        where: { isActive: true },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
              priceInCents: true,
              totalLessons: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
      _count: { select: { members: true } },
    },
  });

  return company;
});

/**
 * Team progress report for the company leader. Returns one row per member
 * and a list of the company's active course assignments, plus per-member
 * enrollment progress for each of those courses.
 *
 * Authorization: caller must be the company's leader, an ADMIN of the
 * same tenant, or SUPER_ADMIN.
 */
export const getCompanyTeamReport = cache(async (companyId: string) => {
  const user = await requireUser();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, tenantId: true, leaderId: true },
  });
  if (!company) throw new Error("Empresa no encontrada");

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isTenantAdmin =
    user.role === "ADMIN" && user.tenantId === company.tenantId;
  const isLeader =
    company.leaderId === user.id && user.tenantId === company.tenantId;
  if (!isSuperAdmin && !isTenantAdmin && !isLeader) {
    throw new Error("No autorizado");
  }

  const [members, assignments] = await Promise.all([
    db.user.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        lastLoginAt: true,
        enrollments: {
          select: {
            id: true,
            courseId: true,
            progress: true,
            status: true,
            completedAt: true,
          },
        },
        workshopAttendances: {
          select: { workshopId: true },
        },
      },
    }),
    db.companyCourseAssignment.findMany({
      where: { companyId, isActive: true },
      orderBy: { assignedAt: "desc" },
      select: {
        id: true,
        courseId: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            totalLessons: true,
          },
        },
      },
    }),
  ]);

  // Per-course workshops that already happened (so attendance is meaningful).
  // Single tenant-scoped query, then group by courseId in memory.
  const courseIds = assignments.map((a) => a.courseId);
  const pastWorkshops = courseIds.length
    ? await db.workshop.findMany({
        where: {
          courseId: { in: courseIds },
          tenantId: company.tenantId,
          startTime: { lt: new Date() },
          status: { not: "CANCELLED" },
        },
        select: { id: true, courseId: true },
      })
    : [];
  const workshopsByCourse: Record<string, string[]> = {};
  for (const w of pastWorkshops) {
    (workshopsByCourse[w.courseId] ??= []).push(w.id);
  }

  return { company, members, assignments, workshopsByCourse };
});

/**
 * Look up an invitation by token (no auth — used by the public /invite page).
 * Returns minimal info to render the accept page.
 */
export async function getInvitationByToken(token: string) {
  return db.companyInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      company: {
        select: {
          id: true,
          name: true,
          tenant: {
            select: { id: true, name: true, slug: true, logo: true },
          },
        },
      },
      inviter: { select: { name: true } },
    },
  });
}
