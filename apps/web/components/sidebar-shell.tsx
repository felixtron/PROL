"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { flattenNavHrefs, isNavGroup } from "./nav-icons";
import { resolveActiveHref } from "./nav-active";
import { NavGroup, NavLinkItem } from "./nav-group";
import type {
  SidebarIcon,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarNavLink,
} from "./nav-icons";

export type { SidebarIcon, SidebarNavItem, SidebarNavGroup, SidebarNavLink };

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

  const activeHref = useMemo(
    () => resolveActiveHref(pathname, flattenNavHrefs(navItems)),
    [pathname, navItems],
  );

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

      {/* `min-h-0` es lo que permite que este nav se desplace dentro de sí
          mismo en vez de estirar el aside: sin él, un flex item no encoge por
          debajo de su contenido y el `overflow-y-auto` nunca se activa. */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
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
    </>
  );

  return (
    // El scroll vive en <main>, no en el <body>: así el sidebar conserva alto
    // propio y los elementos `sticky` del contenido se anclan al área de
    // contenido en lugar de competir con el header móvil.
    <div className="flex h-dvh overflow-hidden">
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
      <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar — fuera del contenedor con scroll, siempre visible */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 md:hidden">
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

        <main
          data-scroll-container
          className="flex-1 overflow-y-auto bg-surface-secondary"
        >
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
