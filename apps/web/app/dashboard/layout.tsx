import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@prol/db";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { resolveDocumentsMenuLabel } from "@/lib/tenant-labels";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { TenantBrand } from "@/components/tenant-brand";
import { TenantThemeStyle } from "@/components/tenant-theme";
import type { SidebarNavItem } from "@/components/nav-icons";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";

// Los iconos viajan como string: este layout es Server Component y no puede
// pasar componentes React al nav, que es de cliente (ver components/nav-icons).
const navItemsBefore: SidebarNavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "Home" },
  { href: "/dashboard/courses", label: "Mis Cursos", icon: "BookOpen" },
  { href: "/dashboard/company", label: "Mi Empresa", icon: "Building2" },
  { href: "/dashboard/workshops", label: "Talleres", icon: "Calendar" },
];

const navItemsAfter: SidebarNavItem[] = [
  { href: "/dashboard/certificates", label: "Diplomas", icon: "Award" },
  { href: "/dashboard/settings", label: "Configuración", icon: "Settings" },
  { href: "/dashboard/docs", label: "Ayuda", icon: "HelpCircle" },
];

// La constancia DC-3 la emite el patrón: sin empresa asociada la entrada no
// aparece, porque el documento no le corresponde a esa cuenta.
const dc3NavItem: SidebarNavItem = {
  href: "/dashboard/dc3",
  label: "Constancias DC-3",
  icon: "FileText",
};

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
        select: {
          name: true,
          logo: true,
          primaryColor: true,
          accentColor: true,
          advisoryEnabled: true,
          surveysEnabled: true,
          documentsEnabled: true,
          documentsMenuLabel: true,
        },
      })
    : null;

  // Los manuales son de la empresa: sin empresa asociada no hay nada que
  // mostrar, igual que con el DC-3.
  const showDocuments = Boolean(tenant?.documentsEnabled) && Boolean(user.companyId);

  // Consultoría Online y Encuestas sólo aparecen si el tenant las habilitó.
  // En Encuestas el alumno sólo responde y consulta lo publicado: la gestión
  // vive en el panel del administrador.
  const navItems: SidebarNavItem[] = [
    ...navItemsBefore,
    ...(showDocuments
      ? [
          {
            id: "documents",
            label: resolveDocumentsMenuLabel(tenant?.documentsMenuLabel),
            icon: "FolderOpen" as const,
            children: [
              // Plural deliberado: la ruta lista las N activaciones de la
              // empresa (listMyManuals()), igual que "Proyectos" en el panel
              // de staff apunta al mismo modelo. El singular queda para la
              // ficha de una sola.
              { href: "/dashboard/manuals", label: "Proyectos", icon: "Building2" as const },
              { href: "/dashboard/documents", label: "Documentos", icon: "FileCheck2" as const },
              { href: "/dashboard/agenda", label: "Agenda", icon: "CalendarClock" as const },
            ],
          },
        ]
      : []),
    ...(tenant?.advisoryEnabled
      ? [
          {
            href: "/dashboard/advisory",
            label: "Consultoría Online",
            icon: "Laptop" as const,
          },
        ]
      : []),
    ...(tenant?.surveysEnabled
      ? [
          {
            href: "/dashboard/surveys",
            label: "Encuestas",
            icon: "ListChecks" as const,
          },
        ]
      : []),
    ...navItemsAfter,
    ...(user.companyId ? [dc3NavItem] : []),
  ];

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-secondary">
      <TenantThemeStyle
        primaryColor={tenant?.primaryColor}
        accentColor={tenant?.accentColor}
      />
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
        <SidebarNav navItems={navItems} />
      </aside>

      {/* ─── Mobile top header ─── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
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
        <main
          data-scroll-container
          className="flex-1 overflow-y-auto pb-20 md:pb-0"
        >
          {children}
        </main>
      </div>

      {/* ─── Mobile bottom navigation ─── */}
      <MobileNav navItems={navItems} />
    </div>
  );
}
