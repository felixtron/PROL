import { redirect } from "next/navigation";
import { db } from "@prol/db";
import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";
import { SidebarShell, type SidebarNavItem } from "@/components/sidebar-shell";
import { TenantBrand } from "@/components/tenant-brand";
import { TenantThemeStyle } from "@/components/tenant-theme";

const baseNavItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/tenant-admin", icon: "LayoutDashboard" },
  { label: "Empresas", href: "/tenant-admin/companies", icon: "Building2" },
  { label: "Usuarios", href: "/tenant-admin/users", icon: "Users" },
  { label: "Cursos", href: "/tenant-admin/courses", icon: "GraduationCap" },
  { label: "DC-3", href: "/tenant-admin/dc3", icon: "FileText" },
];

const tailNavItems: SidebarNavItem[] = [
  { label: "Configuración", href: "/tenant-admin/settings", icon: "Settings" },
  { label: "Base de Conocimientos", href: "/tenant-admin/docs", icon: "HelpCircle" },
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
        select: {
          name: true,
          logo: true,
          primaryColor: true,
          accentColor: true,
          surveysEnabled: true,
        },
      })
    : null;
  const tenantName = tenant?.name ?? user.tenant?.name ?? "Plataforma";

  // Encuestas es un módulo de administración: sólo aparece aquí, y sólo si el
  // tenant lo tiene habilitado. Un SUPER_ADMIN sin tenant propio siempre lo ve.
  const showSurveys = user.role === "SUPER_ADMIN" || Boolean(tenant?.surveysEnabled);
  const navItems: SidebarNavItem[] = [
    ...baseNavItems,
    ...(showSurveys
      ? [{ label: "Encuestas", href: "/tenant-admin/surveys", icon: "ListChecks" as const }]
      : []),
    ...tailNavItems,
  ];

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
    >
      {children}
    </SidebarShell>
    </>
  );
}
