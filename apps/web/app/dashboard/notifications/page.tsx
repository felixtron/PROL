import Link from "next/link";
import { getNotifications } from "@/lib/queries/notifications";
import { NotificationList } from "./notification-list";

export default async function NotificationsPage() {
  const { notifications, total, hasMore } = await getNotifications(1, 20);

  return (
    <div className="px-4 py-5 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-5 md:mb-8">
        <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
          Notificaciones
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Mantente al tanto de tus actividades
        </p>
      </div>

      {/* Notifications List Client Component */}
      <NotificationList
        initialNotifications={notifications}
        initialTotal={total}
        initialHasMore={hasMore}
      />
    </div>
  );
}
