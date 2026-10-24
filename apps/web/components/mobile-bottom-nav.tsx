"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X, LayoutDashboard } from "lucide-react";
import { NAV_ICONS, flattenNavHrefs, isNavGroup } from "@/components/nav-icons";
import { resolveActiveHref } from "@/components/nav-active";
import type { SidebarIcon, SidebarNavItem } from "@/components/nav-icons";

/**
 * Destinos fijos de la barra del alumno. El resto (lo que depende de los
 * flags del tenant) va al panel "Más".
 */
export const STUDENT_MOBILE_PRIMARY: MobilePrimaryItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "Home" },
  { href: "/dashboard/courses", label: "Cursos", icon: "BookOpen" },
  { href: "/dashboard/workshops", label: "Talleres", icon: "Calendar" },
  { href: "/dashboard/certificates", label: "Diplomas", icon: "Award" },
];

export interface MobilePrimaryItem {
  href: string;
  label: string;
  icon: SidebarIcon;
}

/**
 * Barra inferior móvil. `primary` son los destinos que se ven siempre; lo que
 * no esté ahí, y los grupos, se abren desde "Más". Si un destino primario no
 * está en `navItems` (herramienta apagada), se omite.
 */
export function MobileBottomNav({
  navItems,
  primary = STUDENT_MOBILE_PRIMARY,
}: {
  navItems: SidebarNavItem[];
  primary?: MobilePrimaryItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const availableHrefs = useMemo(
    () => new Set(flattenNavHrefs(navItems)),
    [navItems],
  );
  const visiblePrimary = useMemo(
    () => primary.filter((item) => availableHrefs.has(item.href)),
    [primary, availableHrefs],
  );
  const primaryHrefs = useMemo(
    () => visiblePrimary.map((item) => item.href),
    [visiblePrimary],
  );

  const overflowItems = useMemo(
    () =>
      navItems.filter(
        (item) => isNavGroup(item) || !primaryHrefs.includes(item.href),
      ),
    [navItems, primaryHrefs],
  );

  const activeHref = useMemo(
    () =>
      resolveActiveHref(pathname, [
        ...primaryHrefs,
        ...flattenNavHrefs(overflowItems),
      ]),
    [pathname, primaryHrefs, overflowItems],
  );

  const overflowActive =
    activeHref !== null && !primaryHrefs.includes(activeHref);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const itemClass = (active: boolean) =>
    `flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
      active
        ? "text-primary-600"
        : "text-text-tertiary active:text-text-primary"
    }`;

  return (
    <>
      {open && overflowItems.length > 0 && (
        <div className="md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-surface shadow-xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <span className="font-heading text-base font-semibold text-text-primary">
                Más
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:bg-surface-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {overflowItems.map((item) => {
                if (isNavGroup(item)) {
                  return (
                    <div key={item.id}>
                      <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        {item.label}
                      </p>
                      {item.children.map((child) => {
                        const ChildIcon = NAV_ICONS[child.icon] ?? LayoutDashboard;
                        const childActive = child.href === activeHref;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={childActive ? "page" : undefined}
                            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                              childActive
                                ? "bg-primary-50 text-primary-700"
                                : "text-text-secondary active:bg-surface-secondary"
                            }`}
                          >
                            <ChildIcon className="h-5 w-5 shrink-0" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  );
                }

                const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      active
                        ? "bg-primary-50 text-primary-700"
                        : "text-text-secondary active:bg-surface-secondary"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md md:hidden"
      >
        <div className="mx-auto flex min-h-16 max-w-lg items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {visiblePrimary.map((item) => {
            const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={itemClass(isActive)}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? "text-primary-600" : ""}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {overflowItems.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="dialog"
              className={itemClass(overflowActive || open)}
            >
              <MoreHorizontal
                className="h-5 w-5"
                strokeWidth={overflowActive || open ? 2.5 : 2}
              />
              <span className="truncate">Más</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
