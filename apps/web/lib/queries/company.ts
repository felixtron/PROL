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
 * its members and the active course assignments.
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
