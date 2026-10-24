"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStudentToolEnabled } from "@/lib/actions/academy-panel";
import type { StudentToolId } from "@prol/shared";

export interface StudentToolRow {
  id: StudentToolId;
  label: string;
  description: string;
  enabled: boolean;
  hint: string | null;
}

export function StudentToolsForm({ tools }: { tools: StudentToolRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function toggle(tool: StudentToolRow) {
    setError("");
    setPendingId(tool.id);
    startTransition(async () => {
      try {
        await setStudentToolEnabled(tool.id, !tool.enabled);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Herramientas del alumno
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Elige qué secciones ve el alumno en su panel. Lo que apagues
          desaparece del menú y deja de abrir la ruta. Configuración y
          notificaciones siguen disponibles.
        </p>
      </div>
      {error ? (
        <p className="mx-4 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-6" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-border">
        {tools.map((tool) => {
          const pending = pendingId === tool.id;
          return (
            <li key={tool.id}>
              <button
                type="button"
                role="switch"
                aria-checked={tool.enabled}
                disabled={pending}
                onClick={() => toggle(tool)}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-600 sm:px-6"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-primary">
                    {tool.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-secondary">
                    {tool.description}
                  </span>
                  {tool.hint ? (
                    <span className="mt-1 block text-xs text-text-tertiary">
                      {tool.hint}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                    tool.enabled ? "bg-primary-600" : "bg-gray-300"
                  } ${pending ? "opacity-60" : ""}`}
                  aria-hidden
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      tool.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
