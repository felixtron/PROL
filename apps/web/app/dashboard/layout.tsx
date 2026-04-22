import Link from "next/link";
import { Home, BookOpen, Calendar, Award, Settings, Building2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { NotificationBell } from "@/components/notification-bell";
import { MobileNav } from "./mobile-nav";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/courses", label: "Mis Cursos", icon: BookOpen },
  { href: "/dashboard/company", label: "Mi Empresa", icon: Building2 },
  { href: "/dashboard/workshops", label: "Workshops", icon: Calendar },
  { href: "/dashboard/certificates", label: "Certificados", icon: Award },
  { href: "/dashboard/settings", label: "Configuracion", icon: Settings },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (user?.mustResetPassword) {
    const { redirect } = await import("next/navigation");
    redirect("/force-reset-password");
  }

  const unreadCount = await getUnreadNotificationCount();

  const displayName = user?.name ?? "Estudiante";
  const displayEmail = user?.email ?? "";
  const initials = getInitials(displayName);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-secondary">
      {/* ─── Desktop sidebar (hidden on mobile) ─── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {/* Logo + Notification Bell */}
        <div className="flex h-16 items-center justify-between px-6">
          <Link
            href="/dashboard"
            className="font-heading text-2xl font-bold text-primary-600"
          >
            PROL
          </Link>
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
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {displayName}
              </p>
              <p className="truncate text-xs text-text-tertiary">
                {displayEmail}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* ─── Mobile bottom navigation ─── */}
      <MobileNav />
    </div>
  );
}
