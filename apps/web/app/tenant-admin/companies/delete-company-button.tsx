"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { deleteCompany } from "@/lib/actions/company";

type Variant = "button" | "icon";

export function DeleteCompanyButton({
  companyId,
  companyName,
  membersCount,
  assignmentsCount,
  redirectTo,
  variant = "button",
}: {
  companyId: string;
  companyName: string;
  membersCount: number;
  assignmentsCount: number;
  redirectTo?: string;
  variant?: Variant;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function handleDelete() {
    if (confirmName.trim() !== companyName) {
      setError("El nombre no coincide");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await deleteCompany(companyId);
        setOpen(false);
        if (redirectTo) {
          router.push(redirectTo);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
          title="Eliminar empresa"
          aria-label={`Eliminar ${companyName}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-surface px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-company-title"
        >
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="delete-company-title"
                  className="font-heading text-lg font-semibold text-text-primary"
                >
                  Eliminar “{companyName}”
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Esto borrará la empresa, sus invitaciones pendientes y sus
                  asignaciones de cursos.
                </p>
                <ul className="mt-3 space-y-1 rounded-lg bg-surface-secondary p-3 text-xs text-text-secondary">
                  <li>
                    <strong className="text-text-primary">
                      {membersCount}
                    </strong>{" "}
                    miembro(s) conservarán su cuenta, sus inscripciones y su
                    progreso. Quedarán como usuarios B2C (sin empresa).
                  </li>
                  <li>
                    <strong className="text-text-primary">
                      {assignmentsCount}
                    </strong>{" "}
                    asignación(es) de curso a esta empresa se eliminarán.
                  </li>
                </ul>
                <p className="mt-3 text-sm text-text-secondary">
                  Para confirmar, escribe el nombre exacto:{" "}
                  <strong className="text-text-primary">{companyName}</strong>
                </p>
                <input
                  ref={inputRef}
                  type="text"
                  value={confirmName}
                  onChange={(e) => {
                    setConfirmName(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={pending}
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder={companyName}
                  autoComplete="off"
                />
                {error && (
                  <p className="mt-2 text-xs text-red-700">{error}</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending || confirmName.trim() !== companyName}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {pending ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
