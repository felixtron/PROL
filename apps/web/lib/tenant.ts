import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@prol/db";

export const getCurrentTenant = cache(async () => {
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug");

  if (!slug) return null;

  const tenant = await db.tenant.findUnique({
    where: { slug },
    select: {
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
    },
  });

  return tenant;
});

export type CurrentTenant = NonNullable<
  Awaited<ReturnType<typeof getCurrentTenant>>
>;
