import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@prol/db";
import {
  STUDENT_TOOLS,
  firstAllowedStudentHref,
  isStudentPathAllowed,
  isStudentToolVisible,
  type StudentPanelContext,
  type StudentToolId,
} from "@prol/shared";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { resolveDocumentsMenuLabel } from "@/lib/tenant-labels";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { TenantBrand } from "@/components/tenant-brand";
import { BRAND_NAME } from "@/lib/brand";
import { TenantThemeStyle } from "@/components/tenant-theme";
import type { SidebarIcon, SidebarNavItem, SidebarNavLink } from "@/components/nav-icons";
import { SidebarNav } from "./sidebar-nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

function toolLink(id: StudentToolId): SidebarNavLink {
  const tool = STUDENT_TOOLS.find((item) => item.id === id);
  if (!tool) throw new Error(`Herramienta desconocida: ${id}`);
  return {
    href: tool.href,
    label: tool.label,
    icon: tool.icon as SidebarIcon,
  };
}

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
    // Sin tenant no hay panel de academia, y /admin es sólo de SUPER_ADMIN.
    redirect(user.tenantId ? "/tenant-admin" : "/");
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
          studentTools: true,
        },
      })
    : null;

  const panel: StudentPanelContext = {
    preferences: tenant?.studentTools ?? null,
    documentsEnabled: Boolean(tenant?.documentsEnabled),
    advisoryEnabled: Boolean(tenant?.advisoryEnabled),
    surveysEnabled: Boolean(tenant?.surveysEnabled),
    hasCompany: Boolean(user.companyId),
  };
  const show = (id: StudentToolId) => isStudentToolVisible(panel, id);

  const pathname = (await headers()).get("x-pathname");
  if (pathname && !isStudentPathAllowed(pathname, panel)) {
    const dest = firstAllowedStudentHref(panel);
    if (dest !== pathname.replace(/\/$/, "") && dest !== pathname) {
      redirect(dest);
    }
  }
  const homeHref = firstAllowedStudentHref(panel);

  const documentChildren = (
    ["manuals", "documents", "agenda"] as const
  )
    .filter((id) => show(id))
    .map((id) => toolLink(id));

  // Consultoría Online y Encuestas sólo aparecen si el tenant las habilitó
  // y el administrador no las ocultó. En Encuestas el alumno sólo responde
  // y consulta lo publicado: la gestión vive en el panel del administrador.
  const navItems: SidebarNavItem[] = [
    ...(["home", "courses", "company", "workshops"] as const)
      .filter((id) => show(id))
      .map((id) => toolLink(id)),
    ...(documentChildren.length > 0
      ? [
          {
            id: "documents",
            label: resolveDocumentsMenuLabel(tenant?.documentsMenuLabel),
            icon: "FolderOpen" as const,
            children: documentChildren,
          },
        ]
      : []),
    ...(["advisory", "surveys", "certificates"] as const)
      .filter((id) => show(id))
      .map((id) => toolLink(id)),
    { href: "/dashboard/settings", label: "Configuración", icon: "Settings" as const },
    ...(show("help") ? [toolLink("help")] : []),
    ...(show("dc3") ? [toolLink("dc3")] : []),
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
          href={homeHref}
          className="flex items-center gap-2 px-6 py-4"
        >
          <TenantBrand
            name={tenant?.name ?? BRAND_NAME}
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
            href={homeHref}
            className="font-heading text-xl font-bold text-primary-600"
          >
            PROL
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell initialUnreadCount={unreadCount} />
            <Link
              href="/dashboard/settings"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700"
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
      <MobileBottomNav navItems={navItems} />
    </div>
  );
}
