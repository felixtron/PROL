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
import { UserMenu } from "@/components/user-menu";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Tenants", href: "/admin/tenants", icon: Building2 },
  { label: "Usuarios", href: "/admin/users", icon: Users },
  { label: "Ingresos", href: "/admin/revenue", icon: DollarSign },
  { label: "Profesores", href: "/admin/professors", icon: GraduationCap },
  { label: "Configuracion", href: "/admin/settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/");
  }
  if (user.mustResetPassword) {
    redirect("/force-reset-password");
  }

  const displayName = user.name ?? "Admin";

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        {/* Top: user menu */}
        <div className="border-b border-border px-3 py-3">
          <UserMenu
            name={displayName}
            email={user.email}
            avatar={user.avatar}
            roleLabel={user.role === "SUPER_ADMIN" ? "Super Admin" : "Administrador"}
            settingsHref="/admin/settings"
          />
        </div>

        {/* Brand */}
        <div className="flex items-center gap-2 px-6 py-4">
          <span className="font-heading text-xl font-bold text-primary-700">
            PROL
          </span>
          <span className="rounded-pill bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
            ADMIN
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
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
