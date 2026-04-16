"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

// Mark a single notification as read
export async function markAsRead(notificationId: string) {
  const user = await requireUser();

  // Verify the notification belongs to the current user
  const notification = await db.notification.findFirst({
    where: {
      id: notificationId,
      userId: user.id,
    },
  });

  if (!notification) {
    throw new Error("Notificación no encontrada");
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  revalidatePath("/dashboard/notifications");
  return { success: true };
}

// Mark all notifications as read for the current user
export async function markAllAsRead() {
  const user = await requireUser();

  await db.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: { isRead: true },
  });

  revalidatePath("/dashboard/notifications");
  return { success: true };
}

// Delete a notification
export async function deleteNotification(notificationId: string) {
  const user = await requireUser();

  // Verify the notification belongs to the current user
  const notification = await db.notification.findFirst({
    where: {
      id: notificationId,
      userId: user.id,
    },
  });

  if (!notification) {
    throw new Error("Notificación no encontrada");
  }

  await db.notification.delete({
    where: { id: notificationId },
  });

  revalidatePath("/dashboard/notifications");
  return { success: true };
}
