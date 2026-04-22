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
import { UserMenu } from "@/components/user-menu";

const navItems = [
  { label: "Dashboard", href: "/professor", icon: LayoutDashboard },
  { label: "Cursos", href: "/professor/courses", icon: BookOpen },
  { label: "Alumnos", href: "/professor/students", icon: Users },
  { label: "Ingresos", href: "/professor/revenue", icon: DollarSign },
  { label: "Workshops", href: "/professor/workshops", icon: Calendar },
  { label: "Configuración", href: "/professor/settings", icon: Settings },
];

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== "PROFESSOR") {
    redirect("/dashboard");
  }
  if (user.mustResetPassword) {
    redirect("/force-reset-password");
  }
  if (!user.onboardingCompleted || !user.tenantId) {
    redirect("/onboarding");
  }

  const unreadCount = await getUnreadNotificationCount();
  const displayName = user.name ?? "Profesor";

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        {/* Top: user menu + bell */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <div className="min-w-0 flex-1">
            <UserMenu
              name={displayName}
              email={user.email}
              avatar={user.avatar}
              roleLabel="Profesor"
              settingsHref="/professor/settings"
            />
          </div>
          <NotificationBell initialUnreadCount={unreadCount} />
        </div>

        {/* Brand */}
        <div className="flex items-center gap-2 px-6 py-4">
          <span className="font-heading text-xl font-bold text-primary-700">
            PROL
          </span>
          <span className="rounded-pill bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white">
            PRO
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-2">
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
      </aside>

      <main className="flex-1 bg-surface-secondary">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
