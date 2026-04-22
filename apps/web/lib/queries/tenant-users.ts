import { cache } from "react";
import { db, Prisma } from "@prol/db";
import { requireTenantAdmin } from "@/lib/auth";

export interface TenantUsersFilter {
  search?: string;
  role?: "STUDENT" | "PROFESSOR" | "ADMIN";
  companyId?: string;
  disabled?: boolean;
}

/**
 * List users belonging to the current admin's tenant with optional filters.
 */
export const listTenantUsers = cache(async (filter: TenantUsersFilter = {}) => {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) return [];

  const where: Prisma.UserWhereInput = {
    tenantId: admin.tenantId,
  };

  if (filter.search) {
    where.OR = [
      { email: { contains: filter.search, mode: "insensitive" } },
      { name: { contains: filter.search, mode: "insensitive" } },
    ];
  }
  if (filter.role) where.role = filter.role;
  if (filter.companyId) where.companyId = filter.companyId;
  if (filter.disabled === true) where.disabledAt = { not: null };
  if (filter.disabled === false) where.disabledAt = null;

  return db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      lastLoginAt: true,
      createdAt: true,
      disabledAt: true,
      mustResetPassword: true,
      companyId: true,
      company: { select: { id: true, name: true } },
      _count: { select: { enrollments: true } },
    },
    take: 500,
  });
});

/**
 * Companies in the current tenant for the filter dropdown.
 */
export const listTenantCompaniesForFilter = cache(async () => {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) return [];

  return db.company.findMany({
    where: { tenantId: admin.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
});
