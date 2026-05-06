import { redirect } from "next/navigation";
import { db } from "@prol/db";
import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";
import { SidebarShell, type SidebarNavItem } from "@/components/sidebar-shell";
import { TenantBrand } from "@/components/tenant-brand";
import { TenantThemeStyle } from "@/components/tenant-theme";

const navItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/tenant-admin", icon: "LayoutDashboard" },
  { label: "Empresas", href: "/tenant-admin/companies", icon: "Building2" },
  { label: "Usuarios", href: "/tenant-admin/users", icon: "Users" },
  { label: "Cursos", href: "/tenant-admin/courses", icon: "GraduationCap" },
  { label: "Configuración", href: "/tenant-admin/settings", icon: "Settings" },
];

export default async function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }
  if (user.role === "ADMIN" && !user.tenantId) {
    redirect("/dashboard");
  }
  if (user.mustResetPassword) {
    redirect("/force-reset-password");
  }

  const displayName = user.name ?? "Admin";
  const tenant = user.tenantId
    ? await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true, logo: true, primaryColor: true, accentColor: true },
      })
    : null;
  const tenantName = tenant?.name ?? user.tenant?.name ?? "Plataforma";

  return (
    <>
      <TenantThemeStyle
        primaryColor={tenant?.primaryColor}
        accentColor={tenant?.accentColor}
      />
      <SidebarShell
      navItems={navItems}
      mobileTitle={tenantName}
      brand={
        <TenantBrand
          name={tenantName}
          logo={tenant?.logo ?? null}
          badge="ADMIN"
          badgeColor="bg-emerald-500"
        />
      }
      topSlot={
        <UserMenu
          name={displayName}
          email={user.email}
          avatar={user.avatar}
          roleLabel={user.role === "SUPER_ADMIN" ? "Super Admin" : "Administrador"}
          settingsHref="/tenant-admin/settings"
        />
      }
      belowBrandSlot={
        <div className="border-b border-border px-6 pb-3">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Academia
          </p>
          <p className="truncate text-sm font-semibold text-text-primary">
            {tenantName}
          </p>
        </div>
      }
    >
      {children}
    </SidebarShell>
    </>
  );
}
