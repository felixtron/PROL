"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import { NAV_ICONS } from "./nav-icons";
import type { SidebarNavGroup, SidebarNavLink } from "./nav-icons";

const LINK_CLASS_BASE =
  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors";
const LINK_CLASS_ACTIVE = "bg-primary-50 text-primary-700";
const LINK_CLASS_INACTIVE =
  "text-text-secondary hover:bg-primary-50 hover:text-primary-700";

export function groupContainsHref(
  group: SidebarNavGroup,
  activeHref: string | null,
): boolean {
  if (!activeHref) return false;
  return group.children.some((child) => child.href === activeHref);
}

export function NavLinkItem({
  item,
  active,
  nested = false,
}: {
  item: SidebarNavLink;
  active: boolean;
  nested?: boolean;
}) {
  const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${LINK_CLASS_BASE} ${nested ? "pl-9 pr-3 py-2.5" : "px-3 py-2.5"} ${
        active ? LINK_CLASS_ACTIVE : LINK_CLASS_INACTIVE
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {item.label}
    </Link>
  );
}

export function NavGroup({
  group,
  activeHref,
}: {
  group: SidebarNavGroup;
  activeHref: string | null;
}) {
  const contains = groupContainsHref(group, activeHref);
  const [override, setOverride] = useState<boolean | null>(null);
  const [lastContains, setLastContains] = useState(contains);
  if (lastContains !== contains) {
    // La ruta entró o salió del grupo: la decisión manual anterior caducó.
    // Ajustar estado durante el render es el idioma de React para "estado
    // derivado que se reinicia con una prop"; con un useEffect habría un
    // frame pintado con el estado viejo. No "simplificar" a un
    // `useState(contains)` que deja de reaccionar a la navegación.
    setLastContains(contains);
    setOverride(null);
  }
  const open = override ?? contains;

  const Icon = NAV_ICONS[group.icon] ?? LayoutDashboard;
  const headerId = `nav-group-${group.id}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOverride(!open)}
        aria-expanded={open}
        aria-controls={headerId}
        className={`${LINK_CLASS_BASE} w-full px-3 py-2.5 ${
          contains && !open ? LINK_CLASS_ACTIVE : LINK_CLASS_INACTIVE
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div id={headerId} className="mt-1 space-y-1">
          {group.children.map((child) => (
            <NavLinkItem
              key={child.href}
              item={child}
              active={child.href === activeHref}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}
