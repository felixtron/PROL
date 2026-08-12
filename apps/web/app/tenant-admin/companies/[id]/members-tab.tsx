"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Crown, Loader2, Search, UserPlus, X } from "lucide-react";
import {
  addMemberToCompany,
  removeMemberFromCompany,
  setCompanyLeader,
  unsetCompanyLeader,
} from "@/lib/actions/company";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
  enrollments: {
    id: string;
    progress: number;
    status: string;
    course: { id: string; title: string };
  }[];
}

interface AssignableUser {
  id: string;
  name: string | null;
  email: string;
  /** Empresa a la que pertenece hoy, si ya tiene una. */
  company: { id: string; name: string } | null;
}

/**
 * Normaliza para buscar sin acentos ni mayúsculas: escribir "velazquez"
 * debe encontrar a "Velázquez".
 */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Busca el texto en el nombre, el email y la empresa actual del usuario. */
function matches(
  user: { name: string | null; email: string; company?: { name: string } | null },
  query: string,
): boolean {
  const q = normalize(query);
  return [user.name, user.email, user.company?.name].some(
    (field) => field && normalize(field).includes(q),
  );
}

/** A partir de cuántas filas vale la pena mostrar un buscador. */
const SEARCH_THRESHOLD = 8;

export function MembersTab({
  companyId,
  members,
  assignableUsers,
  seatsLimit,
  leaderId,
}: {
  companyId: string;
  members: Member[];
  assignableUsers: AssignableUser[];
  seatsLimit: number | null;
  leaderId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaderTogglingId, setLeaderTogglingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [assignableQuery, setAssignableQuery] = useState("");

  function handleSetLeader(userId: string) {
    setError("");
    setLeaderTogglingId(userId);
    startTransition(async () => {
      try {
        await setCompanyLeader(companyId, userId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setLeaderTogglingId(null);
      }
    });
  }

  function handleUnsetLeader() {
    if (!confirm("Quitar al líder actual de la empresa?")) return;
    setError("");
    setLeaderTogglingId(leaderId);
    startTransition(async () => {
      try {
        await unsetCompanyLeader(companyId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setLeaderTogglingId(null);
      }
    });
  }

  const atCapacity = seatsLimit !== null && members.length >= seatsLimit;

  const filteredMembers = useMemo(
    () =>
      memberQuery.trim()
        ? members.filter((m) => matches(m, memberQuery.trim()))
        : members,
    [members, memberQuery],
  );

  const filteredAssignable = useMemo(
    () =>
      assignableQuery.trim()
        ? assignableUsers.filter((u) => matches(u, assignableQuery.trim()))
        : assignableUsers,
    [assignableUsers, assignableQuery],
  );

  function handleAdd(userId: string) {
    setError("");
    setAddingId(userId);
    startTransition(async () => {
      try {
        await addMemberToCompany(companyId, userId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setAddingId(null);
      }
    });
  }

  function handleRemove(userId: string) {
    if (!confirm("Quitar este usuario de la empresa?")) return;
    setError("");
    setRemovingId(userId);
    startTransition(async () => {
      try {
        await removeMemberFromCompany(companyId, userId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setRemovingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Current members */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Miembros actuales ({members.length}
            {seatsLimit ? `/${seatsLimit}` : ""})
          </h3>
          {members.length > SEARCH_THRESHOLD && (
            <ListSearch
              value={memberQuery}
              onChange={setMemberQuery}
              placeholder="Buscar miembro..."
            />
          )}
        </div>
        {members.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-tertiary">
            Esta empresa aun no tiene miembros. Agregalos desde la lista de abajo.
          </p>
        ) : filteredMembers.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-tertiary">
            Ningun miembro coincide con &ldquo;{memberQuery.trim()}&rdquo;.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredMembers.map((m) => {
              const totalProgress =
                m.enrollments.length > 0
                  ? Math.round(
                      (m.enrollments.reduce((sum, e) => sum + e.progress, 0) /
                        m.enrollments.length) *
                        100
                    )
                  : 0;
              const isLeader = m.id === leaderId;
              const togglingThis = leaderTogglingId === m.id;
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {m.name ?? m.email}
                      </p>
                      {isLeader && (
                        <span className="inline-flex items-center gap-1 rounded-pill bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Crown className="h-3 w-3" />
                          Líder
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-tertiary">
                      {m.email} · {m.enrollments.length} curso(s) · {totalProgress}% promedio
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {m.role === "STUDENT" && (
                      isLeader ? (
                        <button
                          type="button"
                          onClick={handleUnsetLeader}
                          disabled={pending && togglingThis}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50 disabled:opacity-50"
                          title="Quitar como líder"
                        >
                          {pending && togglingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Quitar líder"
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetLeader(m.id)}
                          disabled={pending && togglingThis}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50"
                          title="Designar como líder de la empresa"
                        >
                          {pending && togglingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Crown className="h-3.5 w-3.5" />
                          )}
                          Hacer líder
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(m.id)}
                      disabled={pending && removingId === m.id}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      title="Quitar de la empresa"
                    >
                      {pending && removingId === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add existing user */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div>
            <h3 className="font-heading text-base font-semibold text-text-primary">
              Agregar usuarios existentes
            </h3>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Alumnos de tu academia que aun no pertenecen a esta empresa.
            </p>
          </div>
          {!atCapacity && assignableUsers.length > 0 && (
            <ListSearch
              value={assignableQuery}
              onChange={setAssignableQuery}
              placeholder="Buscar por nombre, email o empresa..."
            />
          )}
        </div>
        {atCapacity ? (
          <div className="p-6 text-center text-sm text-amber-700">
            Esta empresa alcanzo su limite de {seatsLimit} miembros.
          </div>
        ) : assignableUsers.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-tertiary">
            No hay usuarios disponibles para agregar.
          </p>
        ) : filteredAssignable.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-tertiary">
            Ningun usuario coincide con &ldquo;{assignableQuery.trim()}&rdquo;.
          </p>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {filteredAssignable.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {u.name ?? u.email}
                    </p>
                    {/* Agregarlo lo mueve de su empresa actual: hay que avisarlo. */}
                    {u.company && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-surface-tertiary px-2 py-0.5 text-xs text-text-secondary">
                        <Building2 className="h-3 w-3" />
                        {u.company.name}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-text-tertiary">{u.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(u.id)}
                  disabled={pending && addingId === u.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                >
                  {pending && addingId === u.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Agregar
                </button>
              </li>
            ))}
          </ul>
        )}
        {assignableQuery.trim() && filteredAssignable.length > 0 && (
          <p className="border-t border-border px-5 py-2 text-xs text-text-tertiary">
            {filteredAssignable.length} de {assignableUsers.length} usuarios.
          </p>
        )}
      </div>
    </div>
  );
}

/** Input de búsqueda de las listas de esta pestaña (filtra en el cliente). */
function ListSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </div>
  );
}
