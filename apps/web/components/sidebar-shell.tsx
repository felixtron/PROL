"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
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
  ClipboardCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Allowed icon names — keep in sync with the imports above. Using a string
// map avoids passing React components across the server/client boundary.
const ICONS: Record<string, LucideIcon> = {
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
  ClipboardCheck,
};

export type SidebarIcon = keyof typeof ICONS;

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: SidebarIcon;
}

interface SidebarShellProps {
  navItems: SidebarNavItem[];
  brand: React.ReactNode;
  topSlot?: React.ReactNode;
  belowBrandSlot?: React.ReactNode;
  mobileTitle?: string;
  children: React.ReactNode;
}

export function SidebarShell({
  navItems,
  brand,
  topSlot,
  belowBrandSlot,
  mobileTitle,
  children,
}: SidebarShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const sidebarContent = (
    <>
      {topSlot && (
        <div className="border-b border-border px-3 py-3">{topSlot}</div>
      )}

      <div className="flex items-center gap-2 px-6 py-4">{brand}</div>

      {belowBrandSlot}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-text-secondary hover:bg-primary-50 hover:text-primary-700"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile drawer + backdrop */}
      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl md:hidden">
            <div className="flex items-center justify-end border-b border-border px-2 py-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-text-secondary hover:bg-surface-secondary"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex w-full min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-secondary"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-heading text-base font-semibold text-text-primary">
            {mobileTitle ?? "PROL"}
          </span>
        </header>

        <main className="flex-1 bg-surface-secondary">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
