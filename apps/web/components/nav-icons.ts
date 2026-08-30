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
} satisfies Record<string, LucideIcon>;

export type SidebarIcon = keyof typeof NAV_ICONS;

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: SidebarIcon;
}
