import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@prol/db";
import { getCurrentUser } from "@/lib/auth";

const TENANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  primaryColor: true,
  accentColor: true,
  favicon: true,
  customCss: true,
  status: true,
  workshopsEnabled: true,
};

/**
 * Resolves the current tenant for the request:
 *  1. Subdomain (header `x-tenant-slug` set by middleware) — anonymous
 *     visitors land on the catalog of <slug>.prol.prosuite.pro this way.
 *  2. Logged-in user's own tenant — fallback when the request hits the
 *     bare apex domain (prol.prosuite.pro) but the user belongs to a
 *     tenant. This is what makes /courses/<slug> work from the
 *     professor/admin "Vista Previa" link without forcing a subdomain.
 */
export const getCurrentTenant = cache(async () => {
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug");

  if (slug) {
    return db.tenant.findUnique({
      where: { slug },
      select: TENANT_SELECT,
    });
  }

  const user = await getCurrentUser();
  if (user?.tenantId) {
    return db.tenant.findUnique({
      where: { id: user.tenantId },
      select: TENANT_SELECT,
    });
  }

  return null;
});

export type CurrentTenant = NonNullable<
  Awaited<ReturnType<typeof getCurrentTenant>>
>;
