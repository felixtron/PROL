"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { flattenNavHrefs, isNavGroup } from "@/components/nav-icons";
import { resolveActiveHref } from "@/components/nav-active";
import { NavGroup, NavLinkItem } from "@/components/nav-group";
import type { SidebarNavItem } from "@/components/nav-icons";

export function SidebarNav({ navItems }: { navItems: SidebarNavItem[] }) {
  const pathname = usePathname();
  const activeHref = useMemo(
    () => resolveActiveHref(pathname, flattenNavHrefs(navItems)),
    [pathname, navItems],
  );

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {navItems.map((item) =>
        isNavGroup(item) ? (
          <NavGroup key={item.id} group={item} activeHref={activeHref} />
        ) : (
          <NavLinkItem
            key={item.href}
            item={item}
            active={item.href === activeHref}
          />
        ),
      )}
    </nav>
  );
}
