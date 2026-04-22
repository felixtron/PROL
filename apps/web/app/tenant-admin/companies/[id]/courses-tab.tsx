"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, GraduationCap } from "lucide-react";
import {
  assignCourseToCompany,
  revokeCourseFromCompany,
} from "@/lib/actions/company";

interface Assignment {
  id: string;
  assignedAt: Date;
  expiresAt: Date | null;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    priceInCents: number;
    currency: string;
    status: string;
    _count: { enrollments: number };
  };
}

interface AssignableCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  priceInCents: number;
  currency: string;
  _count: { enrollments: number };
}

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return "Gratis";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function CoursesTab({
  companyId,
  assignments,
  assignableCourses,
}: {
  companyId: string;
  assignments: Assignment[];
  assignableCourses: AssignableCourse[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleAssign(courseId: string) {
    setError("");
    setActingId(courseId);
    startTransition(async () => {
      try {
        await assignCourseToCompany(companyId, courseId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setActingId(null);
      }
    });
  }

  function handleRevoke(courseId: string) {
    if (!confirm("Revocar el acceso al curso para los miembros?")) return;
    setError("");
    setActingId(courseId);
    startTransition(async () => {
      try {
        await revokeCourseFromCompany(companyId, courseId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setActingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Cursos asignados ({assignments.length})
          </h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Los miembros de esta empresa pueden inscribirse a estos cursos sin pagar.
          </p>
        </div>
        {assignments.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-tertiary">
            No hay cursos asignados a esta empresa.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {a.course.thumbnail ? (
                    <img
                      src={a.course.thumbnail}
                      alt={a.course.title}
                      className="h-10 w-14 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-primary-100">
                      <GraduationCap className="h-5 w-5 text-primary-700" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {a.course.title}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {formatPrice(a.course.priceInCents, a.course.currency)} · {a.course._count.enrollments} inscripciones globales
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(a.course.id)}
                  disabled={pending && actingId === a.course.id}
                  className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  title="Revocar asignacion"
                >
                  {pending && actingId === a.course.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Cursos disponibles
          </h3>
        </div>
        {assignableCourses.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-tertiary">
            No hay cursos publicados disponibles para asignar.
          </p>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {assignableCourses.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {c.thumbnail ? (
                    <img
                      src={c.thumbnail}
                      alt={c.title}
                      className="h-10 w-14 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-surface-tertiary">
                      <GraduationCap className="h-5 w-5 text-text-tertiary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {c.title}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {formatPrice(c.priceInCents, c.currency)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAssign(c.id)}
                  disabled={pending && actingId === c.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                >
                  {pending && actingId === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Asignar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
