"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createCompany, updateCompany } from "@/lib/actions/company";

type Initial = {
  id: string;
  name: string;
  contactEmail: string | null;
  seatsLimit: number | null;
  allowMemberInvitations: boolean;
};

export function CompanyForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      if (isEdit) {
        const seatsRaw = fd.get("seatsLimit") as string | null;
        const seatsLimit = seatsRaw && seatsRaw.length > 0
          ? Math.max(1, parseInt(seatsRaw, 10))
          : null;
        const contactEmailRaw = (fd.get("contactEmail") as string | null)?.trim() ?? "";
        await updateCompany(initial!.id, {
          name: (fd.get("name") as string).trim(),
          contactEmail: contactEmailRaw.length > 0 ? contactEmailRaw : null,
          seatsLimit,
          allowMemberInvitations: fd.get("allowMemberInvitations") === "true",
        });
        router.push(`/tenant-admin/companies/${initial!.id}`);
        router.refresh();
      } else {
        const result = await createCompany(fd);
        router.push(`/tenant-admin/companies/${result.companyId}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Nombre de la empresa
        </label>
        <input
          type="text"
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={initial?.name ?? ""}
          placeholder="Ej. Acme Corp"
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Email de contacto <span className="text-text-tertiary">(opcional)</span>
        </label>
        <input
          type="email"
          name="contactEmail"
          defaultValue={initial?.contactEmail ?? ""}
          placeholder="rh@acme.com"
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Límite de miembros <span className="text-text-tertiary">(opcional)</span>
        </label>
        <input
          type="number"
          name="seatsLimit"
          min={1}
          defaultValue={initial?.seatsLimit ?? ""}
          placeholder="Ej. 50"
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <p className="mt-1 text-xs text-text-tertiary">
          Deja vacio para sin limite.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border p-3">
        <input
          type="checkbox"
          id="allowMemberInvitations"
          name="allowMemberInvitations"
          value="true"
          defaultChecked={initial?.allowMemberInvitations ?? false}
          className="mt-1 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="allowMemberInvitations" className="text-sm">
          <span className="font-medium text-text-primary">
            Permitir auto-invitaciones
          </span>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Los miembros podran invitar a otras personas a unirse a la empresa.
            Recomendado solo para empresas de confianza.
          </p>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading
            ? isEdit ? "Guardando..." : "Creando..."
            : isEdit ? "Guardar cambios" : "Crear empresa"}
        </button>
      </div>
    </form>
  );
}
