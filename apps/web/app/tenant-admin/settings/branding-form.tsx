"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Upload, Building2, X } from "lucide-react";
import { updateTenantBranding } from "@/lib/actions/tenant";

interface BrandingFormProps {
  tenantName: string;
  initialName: string;
  initialLogo: string | null;
  initialPrimaryColor: string;
  initialAccentColor: string;
}

export function BrandingForm({
  tenantName,
  initialName,
  initialLogo,
  initialPrimaryColor,
  initialAccentColor,
}: BrandingFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [accentColor, setAccentColor] = useState(initialAccentColor);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  void tenantName;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("El logo debe pesar menos de 2MB");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Error al subir");
      }
      const data = (await res.json()) as { url: string };
      setLogo(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError("");
    startTransition(async () => {
      try {
        await updateTenantBranding({
          name,
          logo,
          primaryColor,
          accentColor,
        });
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          Marca actualizada
        </div>
      )}

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Nombre de la academia
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* Logo */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Logotipo
        </label>
        <p className="mb-3 text-xs text-text-tertiary">
          Aparecerá en los sidebars de profesor, alumno y admin. Tamaño
          recomendado: cuadrado, mínimo 128×128px.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-secondary">
            {logo ? (
              <img
                src={logo}
                alt={name}
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2 className="h-7 w-7 text-text-tertiary" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleFile}
                className="hidden"
              />
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {logo ? "Cambiar logo" : "Subir logo"}
                </>
              )}
            </label>
            {logo && !uploading && (
              <button
                type="button"
                onClick={() => setLogo(null)}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3" />
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorField
          label="Color primario"
          value={primaryColor}
          onChange={setPrimaryColor}
          help="Botones, links, brand"
        />
        <ColorField
          label="Color de acento"
          value={accentColor}
          onChange={setAccentColor}
          help="Highlights, badges"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function ColorField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-surface"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9a-fA-F]{6}$"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
      <p className="mt-1 text-xs text-text-tertiary">{help}</p>
    </div>
  );
}
