"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import {
  addCourseCollaborator,
  removeCourseCollaborator,
} from "@/lib/actions/collaborators";

interface Person {
  id: string;
  name: string | null;
  email: string;
}

/** Busca sin acentos ni mayúsculas: "nunez" encuentra a "Núñez". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matches(person: Person, query: string): boolean {
  const q = normalize(query);
  return [person.name, person.email].some(
    (field) => field && normalize(field).includes(q),
  );
}

/**
 * Colaboradores del curso: otros profesores del tenant invitados a
 * co-crearlo. Pueden editar el contenido y publicar; archivar el curso y
 * administrar esta misma lista siguen siendo del dueño.
 */
export function CollaboratorsSection({
  courseId,
  owner,
  collaborators,
  assignable,
  canManage,
}: {
  courseId: string;
  owner: Person;
  collaborators: (Person & { addedAt: Date })[];
  assignable: Person[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(
    () =>
      query.trim()
        ? assignable.filter((p) => matches(p, query.trim()))
        : assignable,
    [assignable, query],
  );

  function run(userId: string, fn: () => Promise<unknown>) {
    setError("");
    setBusyId(userId);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
            <Users className="h-4 w-4 text-text-tertiary" />
            Colaboradores ({collaborators.length})
          </h2>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Otros profesores de tu academia que pueden editar y publicar este
            curso. Archivarlo y gestionar esta lista siguen siendo del dueño.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-primary-50 hover:text-primary-700"
          >
            <UserPlus className="h-4 w-4" />
            {open ? "Cerrar" : "Invitar profesor"}
          </button>
        )}
      </div>

      {error && (
        <div className="border-b border-border bg-red-50 px-5 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <ul className="divide-y divide-border">
        <li className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {owner.name ?? owner.email}
            </p>
            <p className="truncate text-xs text-text-tertiary">{owner.email}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            <Crown className="h-3 w-3" />
            Dueño
          </span>
        </li>

        {collaborators.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 px-5 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {c.name ?? c.email}
              </p>
              <p className="truncate text-xs text-text-tertiary">{c.email}</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  if (!confirm(`Quitar a ${c.name ?? c.email} del curso?`))
                    return;
                  run(c.id, () => removeCourseCollaborator(courseId, c.id));
                }}
                disabled={pending && busyId === c.id}
                className="shrink-0 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                title="Quitar del curso"
              >
                {pending && busyId === c.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && open && (
        <div className="border-t border-border">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar profesor por nombre o email..."
              aria-label="Buscar profesor"
              className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
          </div>
          {assignable.length === 0 ? (
            <p className="px-5 py-4 text-center text-sm text-text-tertiary">
              No hay otros profesores en tu academia para invitar.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-4 text-center text-sm text-text-tertiary">
              Ningún profesor coincide con &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {filtered.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {p.name ?? p.email}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {p.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      run(p.id, () => addCourseCollaborator(courseId, p.id))
                    }
                    disabled={pending && busyId === p.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                  >
                    {pending && busyId === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    Invitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
