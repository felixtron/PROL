import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

export const getTenantAIStatus = cache(async () => {
  const user = await requireUser();
  if (!user.tenantId) return { aiEnabled: false };

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { aiEnabled: true },
  });

  return { aiEnabled: tenant?.aiEnabled ?? false };
});

export const getAIJobsForUser = cache(async (limit = 10) => {
  const user = await requireUser();

  return db.aIGenerationJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      status: true,
      error: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      completedAt: true,
    },
  });
});
