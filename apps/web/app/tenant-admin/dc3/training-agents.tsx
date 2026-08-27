"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { createTrainingAgent, updateTrainingAgent } from "@/lib/actions/dc3";

const INPUT =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

export interface TrainingAgentRow {
  id: string;
  name: string;
  stpsRegistry: string | null;
  rfc: string | null;
  logoUrl: string | null;
  isActive: boolean;
  _count: { courses: number };
}

/**
 * Alta y edición de agentes capacitadores.
 *
 * Es una lista abierta a propósito: el agente capacitador que firma un
 * DC-3 no tiene por qué ser la consultora que opera la plataforma, y
 * darlo por supuesto imprimiría constancias a nombre de quien no las
 * impartió.
 */
export function TrainingAgents({ agents }: { agents: TrainingAgentRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary-500" />
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Agentes capacitadores
          </h2>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo agente
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-text-tertiary">
        Empresas registradas que pueden figurar como agente capacitador externo
        en el DC-3. Cada curso elige el suyo.
      </p>

      {creating && (
        <AgentForm
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="mt-4 space-y-2">
        {agents.length === 0 && !creating && (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-text-tertiary">
            Todavía no hay agentes capacitadores registrados. Sin al menos uno,
            ningún curso puede emitir DC-3.
          </p>
        )}

        {agents.map((agent) =>
          editing === agent.id ? (
            <AgentForm
              key={agent.id}
              agent={agent}
              onDone={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div
              key={agent.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {agent.name}
                  </p>
                  {agent.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <BadgeCheck className="h-3 w-3" />
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {agent.stpsRegistry
                    ? `Registro STPS: ${agent.stpsRegistry}`
                    : "Sin registro STPS capturado"}
                  {agent.rfc && ` · RFC ${agent.rfc}`}
                  {` · ${agent._count.courses} curso(s)`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(agent.id);
                  setCreating(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function AgentForm({
  agent,
  onDone,
  onCancel,
}: {
  agent?: TrainingAgentRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState(agent?.name ?? "");
  const [stpsRegistry, setStpsRegistry] = useState(agent?.stpsRegistry ?? "");
  const [rfc, setRfc] = useState(agent?.rfc ?? "");
  const [logoUrl, setLogoUrl] = useState(agent?.logoUrl ?? "");
  const [isActive, setIsActive] = useState(agent?.isActive ?? true);
  const [uploading, setUploading] = useState(false);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "No se pudo subir el logotipo");
      }
      setLogoUrl(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el logo");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const formData = new FormData();
    formData.set("name", name);
    formData.set("stpsRegistry", stpsRegistry);
    formData.set("rfc", rfc);
    formData.set("logoUrl", logoUrl);
    formData.set("isActive", String(isActive));

    startTransition(async () => {
      try {
        if (agent) {
          await updateTrainingAgent(agent.id, formData);
        } else {
          await createTrainingAgent(formData);
        }
        router.refresh();
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-lg border border-primary-200 bg-surface-secondary p-4"
    >
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Nombre o razón social
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={160}
            required
            placeholder="BMW Business Management Bureau"
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            Registro STPS{" "}
            <span className="font-normal text-text-tertiary">(opcional)</span>
          </label>
          <input
            value={stpsRegistry}
            onChange={(e) => setStpsRegistry(e.target.value)}
            maxLength={60}
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-primary">
            RFC{" "}
            <span className="font-normal text-text-tertiary">(opcional)</span>
          </label>
          <input
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            maxLength={13}
            className={`${INPUT} font-mono`}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-text-primary">
          Logotipo para el encabezado del DC-3{" "}
          <span className="font-normal text-text-tertiary">(opcional)</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logotipo del agente capacitador"
              className="h-10 w-auto max-w-[140px] rounded border border-border bg-white object-contain p-1"
            />
          )}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            {logoUrl ? "Cambiar" : "Subir logotipo"}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogo}
              className="hidden"
            />
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={() => setLogoUrl("")}
              className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
              Quitar
            </button>
          )}
        </div>
      </div>

      {agent && (
        <label className="mt-3 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
          />
          <span className="text-xs text-text-secondary">
            Activo (los inactivos no se ofrecen al configurar cursos nuevos)
          </span>
        </label>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending || uploading || !name}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {agent ? "Guardar cambios" : "Crear agente"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
