"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Pencil,
  Trash2,
  Power,
  Mail,
  Loader2,
  X,
} from "lucide-react";
import {
  deleteTenantUser,
  updateTenantUser,
  resendWelcomeEmail,
} from "@/lib/actions/tenant-users";

type AssignableRole = "STUDENT" | "PROFESSOR" | "ADMIN";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  disabledAt: Date | null;
  mustResetPassword: boolean;
  companyId: string | null;
  company: { id: string; name: string } | null;
  _count: { enrollments: number };
}

interface Company {
  id: string;
  name: string;
}

function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const diffMs = Date.now() - new Date(date).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `hace ${days}d`;
  if (days < 365) return `hace ${Math.floor(days / 30)}mo`;
  return `hace ${Math.floor(days / 365)}y`;
}

const roleLabels: Record<string, { label: string; color: string }> = {
  STUDENT: { label: "Alumno", color: "bg-blue-50 text-blue-700" },
  PROFESSOR: { label: "Profesor", color: "bg-amber-50 text-amber-700" },
  ADMIN: { label: "Admin", color: "bg-red-50 text-red-700" },
  SUPER_ADMIN: { label: "Super Admin", color: "bg-red-50 text-red-700" },
};

export function UsersTable({
  users,
  companies,
  initialFilter,
}: {
  users: User[];
  companies: Company[];
  initialFilter: {
    search?: string;
    role?: string;
    companyId?: string;
    disabled?: boolean;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilter.search ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function updateFilter(key: string, value: string) {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.push(`/tenant-admin/users?${sp.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("q", search);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="w-full rounded-lg border border-border bg-surface py-1.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </form>

        <select
          value={initialFilter.role ?? ""}
          onChange={(e) => updateFilter("role", e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">Todos los roles</option>
          <option value="STUDENT">Alumnos</option>
          <option value="PROFESSOR">Profesores</option>
          <option value="ADMIN">Administradores</option>
        </select>

        <select
          value={initialFilter.companyId ?? ""}
          onChange={(e) => updateFilter("company", e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">Todas las empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={
            initialFilter.disabled === true
              ? "true"
              : initialFilter.disabled === false
                ? "false"
                : ""
          }
          onChange={(e) => updateFilter("disabled", e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          <option value="false">Activos</option>
          <option value="true">Deshabilitados</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-secondary">
            <tr>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>Empresa</Th>
              <Th>Inscripciones</Th>
              <Th>Último login</Th>
              <Th>Estado</Th>
              <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-text-tertiary"
                >
                  No se encontraron usuarios con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isEditing = editingId === u.id;
                const roleInfo = roleLabels[u.role] ?? roleLabels.STUDENT;
                return (
                  <tr
                    key={u.id}
                    className={u.disabledAt ? "bg-red-50/30" : undefined}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name ?? u.email}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                            {(u.name ?? u.email).slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {u.name ?? "—"}
                          </p>
                          <p className="truncate text-xs text-text-tertiary">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <RoleSelect
                          userId={u.id}
                          currentRole={u.role}
                          onDone={() => {
                            setEditingId(null);
                            router.refresh();
                          }}
                          onError={setError}
                        />
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium ${roleInfo!.color}`}
                        >
                          {roleInfo!.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {isEditing ? (
                        <CompanySelect
                          userId={u.id}
                          currentCompanyId={u.companyId}
                          companies={companies}
                          onDone={() => router.refresh()}
                          onError={setError}
                        />
                      ) : (
                        u.company?.name ?? "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {u._count.enrollments}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-tertiary">
                      {timeAgo(u.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3">
                      {u.disabledAt ? (
                        <span className="inline-flex items-center rounded-pill bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          Deshabilitado
                        </span>
                      ) : u.mustResetPassword ? (
                        <span className="inline-flex items-center rounded-pill bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Reset pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-pill bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          title={isEditing ? "Terminar edición" : "Editar"}
                          onClick={() => setEditingId(isEditing ? null : u.id)}
                          icon={isEditing ? X : Pencil}
                        />
                        <IconButton
                          title="Reenviar invitación"
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await resendWelcomeEmail(u.id);
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Error");
                              }
                            })
                          }
                          icon={Mail}
                          disabled={pending}
                        />
                        <IconButton
                          title={u.disabledAt ? "Habilitar" : "Deshabilitar"}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await updateTenantUser(u.id, {
                                  disabled: !u.disabledAt,
                                });
                                router.refresh();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Error");
                              }
                            })
                          }
                          icon={Power}
                          disabled={pending}
                        />
                        <IconButton
                          title="Eliminar"
                          onClick={() => {
                            if (!confirm(`Eliminar a ${u.email}?`)) return;
                            startTransition(async () => {
                              try {
                                await deleteTenantUser(u.id);
                                router.refresh();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Error");
                              }
                            });
                          }}
                          icon={Trash2}
                          disabled={pending}
                          variant="danger"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-tertiary">
        Mostrando {users.length} usuarios.{users.length >= 500 && " (limite 500, refina filtros)"}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
      {children}
    </th>
  );
}

function IconButton({
  title,
  onClick,
  icon: Icon,
  disabled,
  variant = "default",
}: {
  title: string;
  onClick: () => void;
  icon: React.ElementType;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  const color =
    variant === "danger"
      ? "text-red-600 hover:bg-red-50"
      : "text-text-secondary hover:bg-surface-secondary";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-1.5 transition-colors disabled:opacity-50 ${color}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function RoleSelect({
  userId,
  currentRole,
  onDone,
  onError,
}: {
  userId: string;
  currentRole: string;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as AssignableRole;
    if (newRole === currentRole) return;
    startTransition(async () => {
      try {
        await updateTenantUser(userId, { role: newRole });
        onDone();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={handleChange}
      disabled={pending}
      className="rounded border border-border bg-surface px-2 py-1 text-xs"
    >
      <option value="STUDENT">Alumno</option>
      <option value="PROFESSOR">Profesor</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}

function CompanySelect({
  userId,
  currentCompanyId,
  companies,
  onDone,
  onError,
}: {
  userId: string;
  currentCompanyId: string | null;
  companies: Company[];
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const newCompanyId = v === "" ? null : v;
    if (newCompanyId === currentCompanyId) return;
    startTransition(async () => {
      try {
        await updateTenantUser(userId, { companyId: newCompanyId });
        onDone();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <select
      defaultValue={currentCompanyId ?? ""}
      onChange={handleChange}
      disabled={pending}
      className="rounded border border-border bg-surface px-2 py-1 text-xs"
    >
      <option value="">Sin empresa</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
