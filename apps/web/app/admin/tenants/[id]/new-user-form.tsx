"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { createUserInTenant } from "@/lib/actions/tenant-users";

interface CompanyOption {
  id: string;
  name: string;
}

export function NewUserForm({
  tenantId,
  companies,
}: {
  tenantId: string;
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleSubmit(formData: FormData) {
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        await createUserInTenant(tenantId, formData);
        setSuccess(
          "Usuario creado. Recibirá un correo con su contraseña temporal.",
        );
        // Reset form fields by re-rendering: close & reopen.
        setTimeout(() => {
          setSuccess("");
          setOpen(false);
          router.refresh();
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear el usuario");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <UserPlus className="h-4 w-4" />
        Crear usuario
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-text-primary">
          Crear usuario en este tenant
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-text-secondary hover:text-text-primary"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Nombre completo
          </label>
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Juan Pérez"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="juan@empresa.com"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Rol
          </label>
          <select
            name="role"
            defaultValue="STUDENT"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="STUDENT">Alumno</option>
            <option value="PROFESSOR">Profesor</option>
            <option value="ADMIN">Administrador del tenant</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Empresa (opcional)
          </label>
          <select
            name="companyId"
            defaultValue=""
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Sin empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-text-tertiary">
        Se enviará un email con una contraseña temporal. El usuario tendrá que
        cambiarla en su primer inicio de sesión.
      </p>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Crear y enviar invitación
        </button>
      </div>
    </form>
  );
}
