import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  DollarSign,
  Calendar,
  Settings,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { NotificationBell } from "@/components/notification-bell";

const navItems = [
  { label: "Dashboard", href: "/professor", icon: LayoutDashboard },
  { label: "Cursos", href: "/professor/courses", icon: BookOpen },
  { label: "Alumnos", href: "/professor/students", icon: Users },
  { label: "Ingresos", href: "/professor/revenue", icon: DollarSign },
  { label: "Workshops", href: "/professor/workshops", icon: Calendar },
  { label: "Configuración", href: "/professor/settings", icon: Settings },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Require PROFESSOR role to access this section
  if (!user || user.role !== "PROFESSOR") {
    redirect("/dashboard");
  }

  // Require completed onboarding (must have a tenant)
  if (!user.onboardingCompleted || !user.tenantId) {
    redirect("/onboarding");
  }

  const unreadCount = await getUnreadNotificationCount();
  const displayName = user.name ?? "Profesor";
  const initials = getInitials(displayName);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-border bg-surface">
        {/* Logo + Notification Bell */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="font-heading text-xl font-bold text-primary-700">
              PROL
            </span>
            <span className="rounded-pill bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white">
              PRO
            </span>
          </div>
          <NotificationBell initialUnreadCount={unreadCount} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-primary-50 hover:text-primary-700"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Professor Profile */}
        <div className="border-t border-border px-4 py-4">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {displayName}
              </p>
              <p className="text-xs text-text-tertiary">Profesor</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-surface-secondary">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
