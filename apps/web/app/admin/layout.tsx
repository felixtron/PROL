import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";
import { SidebarShell, type SidebarNavItem } from "@/components/sidebar-shell";

const navItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
  { label: "Tenants", href: "/admin/tenants", icon: "Building2" },
  { label: "Usuarios", href: "/admin/users", icon: "Users" },
  { label: "Ingresos", href: "/admin/revenue", icon: "DollarSign" },
  { label: "Profesores", href: "/admin/professors", icon: "GraduationCap" },
  { label: "Configuración", href: "/admin/settings", icon: "Settings" },
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
    <SidebarShell
      navItems={navItems}
      mobileTitle="PROL · Admin"
      brand={
        <>
          <span className="font-heading text-xl font-bold text-primary-700">
            PROL
          </span>
          <span className="rounded-pill bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
            ADMIN
          </span>
        </>
      }
      topSlot={
        <UserMenu
          name={displayName}
          email={user.email}
          avatar={user.avatar}
          roleLabel={user.role === "SUPER_ADMIN" ? "Super Admin" : "Administrador"}
          settingsHref="/admin/settings"
        />
      }
    >
      {children}
    </SidebarShell>
  );
}
