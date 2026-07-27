"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import {
  listUserEnrollments,
  suspendEnrollment,
  reactivateEnrollment,
  withdrawEnrollment,
  type AdminEnrollmentRow,
} from "@/lib/actions/tenant-users";

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activo", color: "bg-emerald-50 text-emerald-700" },
  COMPLETED: { label: "Completado", color: "bg-blue-50 text-blue-700" },
  SUSPENDED: { label: "Suspendido", color: "bg-amber-50 text-amber-700" },
  EXPIRED: { label: "Expirado", color: "bg-gray-100 text-gray-600" },
  REFUNDED: { label: "Reembolsado", color: "bg-gray-100 text-gray-600" },
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UserEnrollmentsDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: { id: string; name: string | null; email: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AdminEnrollmentRow[]>([]);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setRows([]);
    setLoading(true);
    listUserEnrollments(user.id)
      .then((res) => {
        if (res.success) setRows(res.enrollments);
        else setError(res.error);
      })
      .catch(() => setError("No se pudieron cargar las inscripciones"))
      .finally(() => setLoading(false));
  }, [open, user.id]);

  function runAction(
    enrollmentId: string,
    fn: (id: string) => Promise<{ success: boolean; error?: string }>,
  ) {
    setError("");
    setActingId(enrollmentId);
    startTransition(async () => {
      try {
        const res = await fn(enrollmentId);
        if (!res.success) {
          setError(res.error ?? "Error");
          return;
        }
        const refreshed = await listUserEnrollments(user.id);
        if (refreshed.success) setRows(refreshed.enrollments);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setActingId(null);
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-surface shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Cursos inscritos
            </h2>
            <p className="mt-1 truncate text-xs text-text-tertiary">
              {user.name ?? user.email} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-tertiary disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-tertiary">
              Este usuario no tiene inscripciones.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const info = statusLabels[r.status] ?? {
                  label: r.status,
                  color: "bg-gray-100 text-gray-600",
                };
                const acting = actingId === r.id && pending;
                return (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {r.course.title}
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        Inscrito {formatDate(r.enrolledAt)} · Avance{" "}
                        {Math.round(r.progress * 100)}%
                        {r.completedAt &&
                          ` · Completado ${formatDate(r.completedAt)}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-xs font-medium ${info.color}`}
                    >
                      {info.label}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {r.status === "ACTIVE" && (
                        <button
                          type="button"
                          title="Suspender acceso (reversible)"
                          disabled={pending}
                          onClick={() => runAction(r.id, suspendEnrollment)}
                          className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50"
                        >
                          {acting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PauseCircle className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {r.status === "SUSPENDED" && (
                        <button
                          type="button"
                          title="Reactivar acceso"
                          disabled={pending}
                          onClick={() => runAction(r.id, reactivateEnrollment)}
                          className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {acting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PlayCircle className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        title="Retirar del curso (borra su avance)"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !confirm(
                              `¿Retirar a ${user.name ?? user.email} de "${r.course.title}"?\n\nSe borrará su avance, intentos de quiz, entregas y certificado de este curso. Esta acción no se puede deshacer.`,
                            )
                          )
                            return;
                          runAction(r.id, withdrawEnrollment);
                        }}
                        className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        {acting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border bg-surface-secondary px-6 py-3 text-xs text-text-tertiary">
          Suspender bloquea el acceso al curso sin borrar el avance (reversible).
          Retirar elimina la inscripción y todo el progreso.
        </div>
      </div>
    </div>
  );
}
