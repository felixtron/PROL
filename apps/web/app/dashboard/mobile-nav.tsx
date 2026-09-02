"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Calendar,
  Award,
  MoreHorizontal,
  X,
  LayoutDashboard,
} from "lucide-react";
import { NAV_ICONS, flattenNavHrefs, isNavGroup } from "@/components/nav-icons";
import { resolveActiveHref } from "@/components/nav-active";
import type { SidebarNavItem } from "@/components/nav-icons";

/**
 * Los cuatro destinos que viven en la barra; el resto de las secciones del
 * alumno (que dependen de los flags del tenant) van al panel "Más". Antes la
 * barra tenía cinco entradas fijas y hasta cinco secciones quedaban
 * inalcanzables desde el móvil.
 */
const PRIMARY = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/courses", label: "Cursos", icon: BookOpen },
  { href: "/dashboard/workshops", label: "Talleres", icon: Calendar },
  { href: "/dashboard/certificates", label: "Diplomas", icon: Award },
];

const PRIMARY_HREFS = PRIMARY.map((i) => i.href);

export function MobileNav({ navItems }: { navItems: SidebarNavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Todo lo que no cabe en la barra. Conserva el orden del sidebar. Un grupo
  // no tiene `href` propio, así que siempre pasa el filtro de overflow.
  const overflowItems = useMemo(
    () =>
      navItems.filter(
        (item) => isNavGroup(item) || !PRIMARY_HREFS.includes(item.href),
      ),
    [navItems],
  );

  const activeHref = useMemo(
    () =>
      resolveActiveHref(pathname, [
        ...PRIMARY_HREFS,
        ...flattenNavHrefs(overflowItems),
      ]),
    [pathname, overflowItems],
  );

  // La sección actual vive en el panel "Más": se marca el propio botón.
  const overflowActive =
    activeHref !== null && !PRIMARY_HREFS.includes(activeHref);

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
                className="rounded-lg p-2 text-text-secondary active:bg-surface-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {overflowItems.map((item) => {
                if (isNavGroup(item)) {
                  // La hoja ya es un contenedor bajo demanda: un grupo se
                  // pinta como encabezado de sección con sus hijos debajo,
                  // sin un acordeón dentro de otro desplegable.
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
                            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
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
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
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

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md md:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? "text-primary-600"
                    : "text-text-tertiary active:text-text-primary"
                }`}
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
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                overflowActive || open
                  ? "text-primary-600"
                  : "text-text-tertiary active:text-text-primary"
              }`}
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
