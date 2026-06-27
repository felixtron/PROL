import { redirect } from "next/navigation";
import { db } from "@prol/db";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { SidebarShell, type SidebarNavItem } from "@/components/sidebar-shell";
import { TenantBrand } from "@/components/tenant-brand";
import { TenantThemeStyle } from "@/components/tenant-theme";

const baseNavItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/professor", icon: "LayoutDashboard" },
  { label: "Cursos", href: "/professor/courses", icon: "BookOpen" },
  { label: "Alumnos", href: "/professor/students", icon: "Users" },
  { label: "Ingresos", href: "/professor/revenue", icon: "DollarSign" },
  { label: "Sesiones y Talleres", href: "/professor/workshops", icon: "Calendar" },
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

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      name: true,
      logo: true,
      evaluationsEnabled: true,
      surveysEnabled: true,
      primaryColor: true,
      accentColor: true,
    },
  });

  const navItems: SidebarNavItem[] = [
    ...baseNavItems,
    ...(tenant?.evaluationsEnabled
      ? [{ label: "Evaluaciones", href: "/professor/evaluations", icon: "ClipboardCheck" as const }]
      : []),
    ...(tenant?.surveysEnabled
      ? [{ label: "Encuestas", href: "/professor/surveys", icon: "ListChecks" as const }]
      : []),
    { label: "Configuración", href: "/professor/settings", icon: "Settings" },
    { label: "Documentación", href: "/professor/docs", icon: "HelpCircle" },
  ];

  return (
    <>
      <TenantThemeStyle
        primaryColor={tenant?.primaryColor}
        accentColor={tenant?.accentColor}
      />
      <SidebarShell
      navItems={navItems}
      mobileTitle={tenant?.name ?? "PROL · Profesor"}
      brand={
        <TenantBrand
          name={tenant?.name ?? "PROL"}
          logo={tenant?.logo ?? null}
          badge="PRO"
          badgeColor="bg-accent-500"
        />
      }
      topSlot={
        <div className="flex items-center gap-2">
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
      }
    >
      {children}
    </SidebarShell>
    </>
  );
}
