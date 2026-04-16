"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  GraduationCap,
  DollarSign,
  BookOpen,
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { markAsRead, markAllAsRead } from "@/lib/actions/notifications";
import type { Notification } from "@prol/db";

interface NotificationListProps {
  initialNotifications: Notification[];
  initialTotal: number;
  initialHasMore: boolean;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "ENROLLMENT":
      return GraduationCap;
    case "PAYMENT":
      return DollarSign;
    case "COURSE_UPDATE":
      return BookOpen;
    case "WORKSHOP":
      return Calendar;
    case "CERTIFICATE":
      return Award;
    case "SYSTEM":
    default:
      return Bell;
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  return `hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
}

export function NotificationList({
  initialNotifications,
  initialTotal,
  initialHasMore,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAllAsRead() {
    setIsMarkingAllAsRead(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setIsMarkingAllAsRead(false);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  }

  async function loadPage(newPage: number) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications?page=${newPage}&pageSize=20`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(newPage);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 20);
  const hasPrevious = page > 1;

  return (
    <div>
      {/* Action Bar */}
      {unreadCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-sm text-text-secondary">
            Tienes {unreadCount} notificación{unreadCount > 1 ? "es" : ""} sin leer
          </p>
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllAsRead}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            {isMarkingAllAsRead ? "Marcando..." : "Marcar todo como leído"}
          </button>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No tienes notificaciones
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const isUnread = !notification.isRead;

            const content = (
              <div
                className={`flex gap-4 rounded-lg border border-border bg-surface px-4 py-4 transition-all hover:shadow-sm ${
                  isUnread ? "border-l-4 border-l-primary-600 bg-primary-50" : ""
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isUnread ? "bg-primary-100" : "bg-surface-secondary"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isUnread ? "text-primary-700" : "text-text-tertiary"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      isUnread ? "text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-text-tertiary">
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>
              </div>
            );

            if (notification.link) {
              return (
                <Link
                  key={notification.id}
                  href={notification.link}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="cursor-pointer"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => loadPage(page - 1)}
              disabled={!hasPrevious || isLoading}
              className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              onClick={() => loadPage(page + 1)}
              disabled={!hasMore || isLoading}
              className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
