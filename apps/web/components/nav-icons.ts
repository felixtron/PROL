import {
  LayoutDashboard,
  BookOpen,
  Users,
  DollarSign,
  Calendar,
  Settings,
  Building2,
  GraduationCap,
  Home,
  Award,
  Bell,
  ClipboardCheck,
  ListChecks,
  Laptop,
  HelpCircle,
  FileText,
  FolderOpen,
  CalendarClock,
  FileCheck2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Iconos de navegación por nombre. Los layouts son Server Components y no
 * pueden pasar un componente React a través del límite servidor/cliente, así
 * que los ítems de menú viajan con el icono como string y se resuelve aquí.
 */
export const NAV_ICONS = {
  LayoutDashboard,
  BookOpen,
  Users,
  DollarSign,
  Calendar,
  Settings,
  Building2,
  GraduationCap,
  Home,
  Award,
  Bell,
  ClipboardCheck,
  ListChecks,
  Laptop,
  HelpCircle,
  FileText,
  FolderOpen,
  CalendarClock,
  FileCheck2,
} satisfies Record<string, LucideIcon>;

export type SidebarIcon = keyof typeof NAV_ICONS;

export interface SidebarNavLink {
  href: string;
  label: string;
  icon: SidebarIcon;
}

/**
 * Un grupo desplegable del menú. **No navega**: no tiene página propia, y
 * ninguna de sus rutas hijas cambió de URL al agruparse — el menú es puramente
 * de presentación. Por eso el grupo lleva `id` (clave de React y del estado de
 * apertura) en vez de `href`.
 */
export interface SidebarNavGroup {
  id: string;
  label: string;
  icon: SidebarIcon;
  children: SidebarNavLink[];
}

export type SidebarNavItem = SidebarNavLink | SidebarNavGroup;

export function isNavGroup(item: SidebarNavItem): item is SidebarNavGroup {
  return "children" in item;
}

/**
 * Todos los hrefs navegables, con los grupos aplanados. Es lo que come
 * `resolveActiveHref`, que sigue sin saber que existen los grupos.
 */
export function flattenNavHrefs(items: SidebarNavItem[]): string[] {
  return items.flatMap((item) =>
    isNavGroup(item) ? item.children.map((c) => c.href) : [item.href],
  );
}
