import { cache } from "react";
import { db } from "@prol/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import type { Notification } from "@prol/db";

// Get unread count for the bell badge.
// Returns 0 (instead of throwing) when there is no authenticated user, so
// layouts can call this safely without breaking the whole render. The auth
// guard happens via middleware/layout redirects.
export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  if (!user) return 0;

  return db.notification.count({
    where: {
      userId: user.id,
      isRead: false,
    },
  });
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

/**
 * Últimas notificaciones para el rail del dashboard.
 *
 * Usa `getCurrentUser` y no `requireUser` —igual que `getUnreadNotificationCount`—
 * porque la página y el layout se renderizan en paralelo: el redirect del layout
 * no llega a tiempo de proteger a la página y un throw aquí tumbaría el render.
 */
export async function getRecentNotifications(
  limit = 4,
): Promise<Notification[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
