"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle, Loader2, Save } from "lucide-react";
import { isValidRfc, normalizeRfc } from "@/lib/dc3/validation";
import { updateCompanyDc3Data } from "@/lib/actions/dc3";
import { Dc3ResponsibilityNotice } from "@/components/dc3-notice";

const INPUT =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

export interface EmployerDc3Data {
  id: string;
  name: string;
  dc3LegalName: string | null;
  dc3Rfc: string | null;
  dc3LegalRepName: string | null;
  dc3WorkersRepName: string | null;
  dc3ConfirmedAt: Date | null;
}

/**
 * Bloque de la empresa (el azul del formato oficial), a cargo del líder
 * de proyecto.
 *
 * Los datos se guardan en la empresa, no en cada constancia: se capturan
 * una vez y sirven para todos los DC-3 de sus miembros. Siguen siendo
 * editables después —una razón social cambia— y cada constancia ya
 * emitida conserva su propia copia congelada.
 */
export function Dc3EmployerForm({
  company,
  canEdit,
}: {
  company: EmployerDc3Data;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [legalName, setLegalName] = useState(
    company.dc3LegalName ?? company.name ?? ""
  );
  const [rfc, setRfc] = useState(company.dc3Rfc ?? "");
  const [legalRep, setLegalRep] = useState(company.dc3LegalRepName ?? "");
  const [workersRep, setWorkersRep] = useState(
    company.dc3WorkersRepName ?? ""
  );
  const [accepted, setAccepted] = useState(false);

  const rfcTouched = rfc.trim().length > 0;
  const rfcValid = rfcTouched && isValidRfc(rfc);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const formData = new FormData();
    formData.set("dc3LegalName", legalName);
    formData.set("dc3Rfc", rfc);
    formData.set("dc3LegalRepName", legalRep);
    formData.set("dc3WorkersRepName", workersRep);

    startTransition(async () => {
      try {
        await updateCompanyDc3Data(company.id, formData);
        setSaved(true);
        setAccepted(false);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al guardar los datos del patrón"
        );
      }
    });
  }

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary-500" />
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Datos del patrón (DC-3)
          </h2>
        </div>
        <p className="mt-1 text-xs text-text-tertiary">
          Los captura el líder de proyecto de tu empresa.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Razón social" value={company.dc3LegalName ?? company.name} />
          <Row label="RFC" value={company.dc3Rfc} mono />
          <Row label="Representante legal" value={company.dc3LegalRepName} />
          <Row
            label="Representante de los trabajadores"
            value={company.dc3WorkersRepName}
          />
        </dl>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary-500" />
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Datos del patrón (DC-3)
        </h2>
      </div>
      <p className="mt-1 text-xs text-text-tertiary">
        Los completas como líder de proyecto. Se reutilizan en las constancias
        DC-3 de todos los miembros de la empresa.
        {company.dc3ConfirmedAt && (
          <>
            {" "}
            Última confirmación:{" "}
            {new Date(company.dc3ConfirmedAt).toLocaleDateString("es-MX", {
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
          <p className="text-sm text-emerald-700">
            Datos del patrón confirmados
          </p>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="dc3-legal-name"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Nombre o razón social
          </label>
          <input
            id="dc3-legal-name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            maxLength={160}
            required
            className={INPUT}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            Si el patrón es persona física, anota apellido paterno, materno y
            nombre(s).
          </p>
        </div>

        <div>
          <label
            htmlFor="dc3-rfc"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            RFC con homoclave
          </label>
          <input
            id="dc3-rfc"
            value={rfc}
            onChange={(e) => setRfc(normalizeRfc(e.target.value))}
            maxLength={13}
            required
            placeholder="ABC010203XY1"
            className={`${INPUT} font-mono uppercase tracking-wide ${
              rfcTouched && !rfcValid ? "border-red-300" : ""
            }`}
          />
          {rfcTouched && !rfcValid && (
            <p className="mt-1 text-xs text-red-600">
              12 caracteres para persona moral, 13 para persona física, con
              homoclave.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="dc3-legal-rep"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Patrón o representante legal
          </label>
          <input
            id="dc3-legal-rep"
            value={legalRep}
            onChange={(e) => setLegalRep(e.target.value)}
            maxLength={120}
            required
            className={INPUT}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            Firma esta casilla en empresas de menos de 51 trabajadores. En
            empresas mayores firma el representante del patrón ante la Comisión
            Mixta de capacitación, adiestramiento y productividad.
          </p>
        </div>

        <div>
          <label
            htmlFor="dc3-workers-rep"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Representante de los trabajadores{" "}
            <span className="font-normal text-text-tertiary">(opcional)</span>
          </label>
          <input
            id="dc3-workers-rep"
            value={workersRep}
            onChange={(e) => setWorkersRep(e.target.value)}
            maxLength={120}
            className={INPUT}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            Sólo para empresas con más de 50 trabajadores (nota 5 del formato).
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
          He verificado que los datos del patrón son correctos y autorizo su uso
          para la emisión del formato DC-3.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || !accepted || !rfcValid || !legalName || !legalRep}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Confirmar datos del patrón
      </button>
    </form>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0">
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd
        className={`text-right text-sm text-text-primary ${mono ? "font-mono" : ""}`}
      >
        {value || <span className="text-text-tertiary">Sin capturar</span>}
      </dd>
    </div>
  );
}
