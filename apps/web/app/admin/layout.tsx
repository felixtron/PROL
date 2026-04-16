import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  GraduationCap,
  Settings,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Tenants", href: "/admin/tenants", icon: Building2 },
  { label: "Usuarios", href: "/admin/users", icon: Users },
  { label: "Ingresos", href: "/admin/revenue", icon: DollarSign },
  { label: "Profesores", href: "/admin/professors", icon: GraduationCap },
  { label: "Configuracion", href: "/admin/settings", icon: Settings },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/");
  }

  const displayName = user.name ?? "Admin";
  const initials = getInitials(displayName);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-border bg-surface">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5">
          <span className="font-heading text-xl font-bold text-primary-700">
            PROL
          </span>
          <span className="rounded-pill bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
            ADMIN
          </span>
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

        {/* Admin Profile */}
        <div className="border-t border-border px-4 py-4">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {displayName}
              </p>
              <p className="text-xs text-text-tertiary">Administrador</p>
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
