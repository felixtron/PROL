"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createTenantAdmin } from "@/lib/actions/admin";

export function NewTenantForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        const res = await createTenantAdmin(formData);
        router.push(`/admin/tenants/${res.tenantId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear el tenant");
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="mb-1.5 block text-sm font-medium text-text-primary"
        >
          Nombre de la academia
        </label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          autoFocus
          placeholder="Ej: Academia Digital MX"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        />
        <p className="mt-1 text-xs text-text-tertiary">
          Aparecerá como nombre del campus para los profesores y alumnos.
        </p>
      </div>

      <div>
        <label
          htmlFor="contactEmail"
          className="mb-1.5 block text-sm font-medium text-text-primary"
        >
          Email de contacto
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          placeholder="contacto@academia.com"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        />
        <p className="mt-1 text-xs text-text-tertiary">
          Para notificaciones administrativas y facturación.
        </p>
      </div>

      <div>
        <label
          htmlFor="status"
          className="mb-1.5 block text-sm font-medium text-text-primary"
        >
          Estado inicial
        </label>
        <select
          id="status"
          name="status"
          defaultValue="TRIAL"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        >
          <option value="TRIAL">Prueba (7 días de trial)</option>
          <option value="ACTIVE">Activo</option>
        </select>
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Creando..." : "Crear tenant"}
        </button>
      </div>
    </form>
  );
}
