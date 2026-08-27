"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Save, UserRound } from "lucide-react";
import { DC3_OCCUPATION_AREAS } from "@/lib/dc3/catalogs";
import { isValidCurp, normalizeCurp } from "@/lib/dc3/validation";
import { updateMyDc3Data } from "@/lib/actions/dc3";
import { Dc3ResponsibilityNotice } from "@/components/dc3-notice";

const INPUT =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

export interface WorkerProfile {
  name: string | null;
  dc3FullName: string | null;
  curp: string | null;
  dc3OccupationCode: string | null;
  dc3JobPosition: string | null;
  dc3ConfirmedAt: Date | null;
}

/**
 * Bloque del trabajador (el amarillo del formato oficial).
 *
 * El nombre llega precargado del perfil pero es editable: la STPS pide
 * "apellido paterno, materno y nombre(s)" y casi nadie tiene el perfil
 * escrito en ese orden. Confirmar aquí exige marcar la casilla de
 * responsabilidad, que es el momento en que el usuario acepta que estos
 * datos van al documento.
 */
export function Dc3WorkerForm({ profile }: { profile: WorkerProfile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState(
    profile.dc3FullName ?? profile.name ?? ""
  );
  const [curp, setCurp] = useState(profile.curp ?? "");
  const [occupation, setOccupation] = useState(
    profile.dc3OccupationCode ?? ""
  );
  const [jobPosition, setJobPosition] = useState(profile.dc3JobPosition ?? "");
  const [accepted, setAccepted] = useState(false);

  // La validación de CURP se pinta mientras se escribe: descubrir el
  // error al pulsar guardar, después de un round-trip, es peor.
  const curpTouched = curp.trim().length > 0;
  const curpValid = curpTouched && isValidCurp(curp);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const formData = new FormData();
    formData.set("dc3FullName", fullName);
    formData.set("curp", curp);
    formData.set("dc3OccupationCode", occupation);
    formData.set("dc3JobPosition", jobPosition);

    startTransition(async () => {
      try {
        await updateMyDc3Data(formData);
        setSaved(true);
        setAccepted(false);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al guardar tus datos"
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5 text-primary-500" />
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Datos del trabajador
        </h2>
      </div>
      <p className="mt-1 text-xs text-text-tertiary">
        Los completas tú. Se reutilizan en todas tus constancias DC-3.
        {profile.dc3ConfirmedAt && (
          <>
            {" "}
            Última confirmación:{" "}
            {new Date(profile.dc3ConfirmedAt).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            .
          </>
        )}
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {saved && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">Datos confirmados</p>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="dc3-name"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Nombre completo
          </label>
          <input
            id="dc3-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={120}
            required
            className={INPUT}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            Anota apellido paterno, materno y nombre(s), en ese orden. Es como
            aparecerá impreso.
          </p>
        </div>

        <div>
          <label
            htmlFor="dc3-curp"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            CURP
          </label>
          <input
            id="dc3-curp"
            value={curp}
            onChange={(e) => setCurp(normalizeCurp(e.target.value))}
            maxLength={18}
            required
            placeholder="18 caracteres"
            className={`${INPUT} font-mono uppercase tracking-wide ${
              curpTouched && !curpValid ? "border-red-300" : ""
            }`}
          />
          {curpTouched && !curpValid && (
            <p className="mt-1 text-xs text-red-600">
              La CURP debe tener 18 caracteres con el formato oficial de
              RENAPO.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="dc3-occupation"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Ocupación específica
          </label>
          <select
            id="dc3-occupation"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            required
            className={INPUT}
          >
            <option value="">Selecciona tu ocupación…</option>
            {DC3_OCCUPATION_AREAS.map((area) => (
              <optgroup key={area.code} label={`${area.code} — ${area.label}`}>
                <option value={area.code}>
                  {area.code} — {area.label} (área general)
                </option>
                {area.subareas.map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    {sub.code} — {sub.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-tertiary">
            Catálogo Nacional de Ocupaciones (nota 1 del formato DC-3).
          </p>
        </div>

        <div>
          <label
            htmlFor="dc3-position"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Puesto{" "}
            <span className="font-normal text-text-tertiary">(opcional)</span>
          </label>
          <input
            id="dc3-position"
            value={jobPosition}
            onChange={(e) => setJobPosition(e.target.value)}
            maxLength={100}
            placeholder="Puesto que desempeñas en la empresa"
            className={INPUT}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            El formato oficial lo marca como dato no obligatorio.
          </p>
        </div>
      </div>

      <Dc3ResponsibilityNotice className="mt-4" />

      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
        />
        <span className="text-xs text-text-secondary">
          He verificado que mis datos son correctos y autorizo su uso para la
          emisión del formato DC-3.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || !accepted || !curpValid || !occupation}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Confirmar mis datos
      </button>
    </form>
  );
}
