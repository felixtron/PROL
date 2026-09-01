"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Loader2, Plus } from "lucide-react";
import { activateManualForCompany } from "@/lib/actions/manual";

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

export interface AssignmentRow {
  id: string;
  status: string;
  activatedAt: Date;
  company: { id: string; name: string };
  consultant: { id: string; name: string | null; email: string } | null;
}

/**
 * Activación del manual por empresa.
 *
 * Activar crea de golpe la agenda del cliente (una actividad por requisito) y
 * le avisa. Por eso el manual tiene que estar publicado: activar un borrador
 * dejaría al cliente con una agenda que cambia bajo sus pies.
 */
export function ManualCompanies({
  manualId,
  published,
  assignments,
  companies,
  consultants,
}: {
  manualId: string;
  published: boolean;
  assignments: AssignmentRow[];
  companies: Array<{ id: string; name: string }>;
  consultants: Array<{ id: string; name: string | null; email: string; role: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await activateManualForCompany({
        manualId,
        companyId,
        consultantId: consultantId || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCompanyId("");
      setConsultantId("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {assignments.length === 0 ? (
          <div className="p-6 text-center">
            <Building2 className="mx-auto h-7 w-7 text-text-tertiary" />
            <p className="mt-2 text-sm text-text-secondary">
              Ninguna empresa tiene este manual activo todavía.
            </p>
          </div>
        ) : (
          assignments.map((a) => (
            <Link
              key={a.id}
              href={`/tenant-admin/projects/${a.id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-secondary"
            >
              <div className="min-w-0">
                <p className="font-medium text-text-primary">{a.company.name}</p>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Desde {DATE.format(new Date(a.activatedAt))}
                  {a.consultant
                    ? ` · ${a.consultant.name ?? a.consultant.email}`
                    : " · Sin consultor"}
                </p>
              </div>
              {a.status !== "ACTIVE" ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  {a.status === "PAUSED" ? "En pausa" : "Cerrado"}
                </span>
              ) : null}
            </Link>
          ))
        )}
      </div>

      {!published ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Publica el manual para poder activarlo en una empresa.
        </p>
      ) : companies.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          Todas las empresas del tenant ya tienen este manual activo.
        </p>
      ) : open ? (
        <form
          onSubmit={handleActivate}
          className="space-y-3 rounded-xl border border-border bg-surface p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Empresa
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            >
              <option value="">Selecciona una empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Consultor a cargo
            </label>
            <select
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            >
              <option value="">Sin asignar (avisa a todos los administradores)</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.email} ({c.role === "PROFESSOR" ? "Profesor" : "Admin"})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending || !companyId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Activar manual
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
        >
          <Plus className="h-4 w-4" />
          Activar para una empresa
        </button>
      )}
    </div>
  );
}
