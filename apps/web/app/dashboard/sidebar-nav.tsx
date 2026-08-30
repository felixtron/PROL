"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { NAV_ICONS } from "@/components/nav-icons";
import { resolveActiveHref } from "@/components/nav-active";
import type { SidebarNavItem } from "@/components/nav-icons";

export function SidebarNav({ navItems }: { navItems: SidebarNavItem[] }) {
  const pathname = usePathname();
  const activeHref = useMemo(
    () =>
      resolveActiveHref(
        pathname,
        navItems.map((i) => i.href),
      ),
    [pathname, navItems],
  );

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {navItems.map((item) => {
        const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
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
  );
}
