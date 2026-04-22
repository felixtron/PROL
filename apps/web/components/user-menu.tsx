"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Settings, LogOut, ChevronDown, Loader2, Pencil } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  name: string;
  email: string;
  avatar: string | null;
  roleLabel: string;
  settingsHref: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu({
  name,
  email,
  avatar,
  roleLabel,
  settingsHref,
}: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

  const initials = getInitials(name);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-surface-secondary"
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">
            {name}
          </p>
          <p className="truncate text-xs text-text-tertiary">{roleLabel}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-tertiary transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-xs font-medium text-text-tertiary">
              Cuenta
            </p>
            <p className="truncate text-sm text-text-primary">{email}</p>
          </div>
          <div className="py-1">
            <Link
              href={settingsHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-secondary"
            >
              <Pencil className="h-4 w-4 text-text-tertiary" />
              Editar perfil
            </Link>
            <Link
              href={settingsHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-secondary"
            >
              <Settings className="h-4 w-4 text-text-tertiary" />
              Configuración
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
