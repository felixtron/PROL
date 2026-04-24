import Link from "next/link";
import { redirect } from "next/navigation";
import { Home, BookOpen, Calendar, Award, Settings, Building2 } from "lucide-react";
import { db } from "@prol/db";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { TenantBrand } from "@/components/tenant-brand";
import { MobileNav } from "./mobile-nav";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/courses", label: "Mis Cursos", icon: BookOpen },
  { href: "/dashboard/company", label: "Mi Empresa", icon: Building2 },
  { href: "/dashboard/workshops", label: "Workshops", icon: Calendar },
  { href: "/dashboard/certificates", label: "Certificados", icon: Award },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  // Defensive: middleware should already enforce auth, but if the cookie
  // points to a deleted user (e.g. after a re-seed), getCurrentUser returns
  // null. Send them to sign-in to refresh their session.
  if (!user) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }
  if (user.mustResetPassword) {
    redirect("/force-reset-password");
  }

  // Route non-students to their own dashboard. The student dashboard is the
  // generic landing for /sign-in (and the middleware sends authenticated
  // users here regardless of role), so we re-dispatch by role here so an
  // ADMIN/SUPER_ADMIN/PROFESSOR never sees the student UI by accident.
  if (user.role === "SUPER_ADMIN") {
    redirect("/admin");
  }
  if (user.role === "ADMIN") {
    redirect(user.tenantId ? "/tenant-admin" : "/admin");
  }
  if (user.role === "PROFESSOR") {
    redirect(user.onboardingCompleted ? "/professor" : "/onboarding");
  }

  const unreadCount = await getUnreadNotificationCount();
  const displayName = user.name ?? "Estudiante";

  const tenant = user.tenantId
    ? await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true, logo: true },
      })
    : null;

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-secondary">
      {/* ─── Desktop sidebar (hidden on mobile) ─── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {/* Top: user menu + bell */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <div className="min-w-0 flex-1">
            <UserMenu
              name={displayName}
              email={user.email}
              avatar={user.avatar}
              roleLabel="Estudiante"
              settingsHref="/dashboard/settings"
            />
          </div>
          <NotificationBell initialUnreadCount={unreadCount} />
        </div>

        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-6 py-4"
        >
          <TenantBrand
            name={tenant?.name ?? "PROL"}
            logo={tenant?.logo ?? null}
          />
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
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
      </aside>

      {/* ─── Mobile top header ─── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
          <Link
            href="/dashboard"
            className="font-heading text-xl font-bold text-primary-600"
          >
            PROL
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell initialUnreadCount={unreadCount} />
            <Link
              href="/dashboard/settings"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700"
              aria-label="Mi perfil"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </Link>
          </div>
        </header>

        {/* ─── Main content ─── */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* ─── Mobile bottom navigation ─── */}
      <MobileNav />
    </div>
  );
}
