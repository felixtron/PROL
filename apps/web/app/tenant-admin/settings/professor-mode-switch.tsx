"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setProfessorMode } from "@/lib/actions/academy-panel";

export function ProfessorModeSwitch({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function toggle() {
    setError("");
    startTransition(async () => {
      try {
        await setProfessorMode(!enabled);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Funciones de profesor
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Crea y gestiona cursos, talleres, consultoría y evaluaciones con
            esta misma cuenta. Puedes apagarlo cuando quieras.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Funciones de profesor"
          disabled={pending}
          onClick={toggle}
          className="mt-0.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <span
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              enabled ? "bg-primary-600" : "bg-gray-300"
            } ${pending ? "opacity-60" : ""}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </span>
        </button>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {enabled ? (
        <Link
          href="/professor"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary-700"
        >
          Ir al panel de profesor
        </Link>
      ) : null}
    </div>
  );
}
