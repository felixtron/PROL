import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import type { Notification } from "@prol/db";

// Get unread count for the bell badge
export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const user = await requireUser();

  const count = await db.notification.count({
    where: {
      userId: user.id,
      isRead: false,
    },
  });

  return count;
});

// Get notifications with pagination
export async function getNotifications(page = 1, pageSize = 20): Promise<{
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}> {
  const user = await requireUser();

  const skip = (page - 1) * pageSize;

  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip,
    }),
    db.notification.count({
      where: { userId: user.id },
    }),
  ]);

  const hasMore = skip + notifications.length < total;

  return {
    notifications,
    total,
    hasMore,
  };
}
