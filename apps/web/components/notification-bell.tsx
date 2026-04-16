"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  GraduationCap,
  DollarSign,
  BookOpen,
  Calendar,
  Award,
  X,
} from "lucide-react";
import { markAsRead, markAllAsRead } from "@/lib/actions/notifications";
import type { Notification } from "@prol/db";

interface NotificationBellProps {
  initialUnreadCount: number;
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

export function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen]);

  async function fetchNotifications() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications?page=1&pageSize=10");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }

    if (notification.link) {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg md:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-heading text-sm font-semibold text-text-primary">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Marcar todo como leído
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-text-tertiary" />
                <p className="mt-2 text-sm text-text-secondary">
                  No tienes notificaciones
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const isUnread = !notification.isRead;

                  const content = (
                    <div
                      className={`flex gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary ${
                        isUnread ? "border-l-2 border-primary-600 bg-primary-50" : ""
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isUnread ? "bg-primary-100" : "bg-surface-secondary"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            isUnread ? "text-primary-700" : "text-text-tertiary"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            isUnread ? "text-text-primary" : "text-text-secondary"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-text-tertiary line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-text-tertiary">
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
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
