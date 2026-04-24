"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Calendar, Award, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/courses", label: "Cursos", icon: BookOpen },
  { href: "/dashboard/workshops", label: "Sesiones", icon: Calendar },
  { href: "/dashboard/certificates", label: "Certs", icon: Award },
  { href: "/dashboard/settings", label: "Cuenta", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
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
      </div>
    </nav>
  );
}
