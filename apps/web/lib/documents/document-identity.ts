// Identidad resuelta de un documento nativo — puro, sin acceso a base.
//
// Dos mitades de una misma decisión:
//   - LO ACREDITATIVO SE CONGELA: razón social, código, nombre, versión,
//     estatus y fecha son los que tenía la empresa cuando emitió (o los de la
//     plantilla, en la vista previa). Cambiarlos después de emitir rompería
//     DOC-03 — lo que la empresa adoptó no puede moverse bajo sus pies.
//   - EL LOGO SE LEE EN VIVO: no se congela nunca. Es la misma convención que
//     ya sigue el emisor DC-3 ("son marca, no dato acreditativo") y es la
//     ventaja principal de renderizar en HTML en vez de generar `.docx` con
//     plantillas: cambiar el logo de una empresa re-renderiza todos sus
//     documentos sin regenerar nada.
//
// Todo llega YA resuelto, siguiendo el patrón `renderCertificate(templateId,
// data)` de `lib/certificate-templates/index.tsx`: la vista no pregunta `??`
// en ningún lado. El único opcional que queda es el logo, porque una empresa
// puede legítimamente no tener uno — la vista ramifica una vez, no cinco.
//
// Este módulo es DELIBERADAMENTE puro (sin acceso a base ni a APIs de
// servidor): tiene que poder importarse desde un componente de cliente,
// igual que `lib/document-files.ts` está separado de `lib/document-storage.ts`
// por el mismo motivo. Quien lee la base y llena esta interfaz es
// `resolve-identity.ts`.

import type { CompanyDocumentStatus, ManualDocumentKind } from "@prol/db";

export const DOCUMENT_KIND_LABEL: Record<ManualDocumentKind, string> = {
  FILE: "Archivo",
  PROCEDIMIENTO: "Procedimiento",
  REGISTRO: "Registro",
};

export const DOCUMENT_STATUS_LABEL: Record<CompanyDocumentStatus, string> = {
  BORRADOR: "Borrador",
  VIGENTE: "Vigente",
  OBSOLETO: "Obsoleto",
};

/** Mismas familias de color que EVIDENCE_STATUS_CLASS en `lib/compliance.ts`. */
export const DOCUMENT_STATUS_CLASS: Record<CompanyDocumentStatus, string> = {
  BORRADOR: "bg-amber-100 text-amber-800",
  VIGENTE: "bg-emerald-100 text-emerald-700",
  OBSOLETO: "bg-slate-100 text-slate-700",
};

/** Formateador creado una vez a nivel de módulo, no por llamada (mismo patrón
 * que `DATE` en `components/company-project-panel.tsx`). Exportado para que
 * el historial de control de cambios (DOC-05, `lib/queries/manual-document.ts`)
 * formatee sus fechas con el mismo formateador — no se redefine ninguno. */
export const ISSUED_AT_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

/** `trim()` y `null` si queda vacío. Evita que espacios en blanco ganen sobre
 * un valor real en una cadena de `??`. */
function clean(v: string | null | undefined): string | null {
  const s = v?.trim();
  return s ? s : null;
}

/** Lo que la vista recibe. Sin `??` que la plantilla tenga que resolver. */
export interface DocumentIdentity {
  /** `dc3LegalName ?? name`, misma regla que el emisor DC-3. */
  companyName: string;
  /** Se lee en vivo. Único opcional: hay empresas sin logo. */
  companyLogo: string | null;
  tenantName: string;
  /** codeOverride ?? code */
  code: string;
  /** nameOverride ?? name */
  name: string;
  /** "" cuando el manual no declara norma: la vista comprueba truthiness, no null. */
  normaLabel: string;
  kind: ManualDocumentKind;
  kindLabel: string;
  version: number;
  status: CompanyDocumentStatus;
  statusLabel: string;
  statusClass: string;
  /** Ya formateada en es-MX / America/Mexico_City. */
  issuedAt: string;
  sourceTemplateVersion: number | null;
  latestTemplateVersion: number;
  /** La plantilla avanzó respecto a lo que esta empresa adoptó (DOC-07). */
  isOutdated: boolean;
  /** Texto listo para pintar, o null si está al día. */
  outdatedLabel: string | null;
}

/** Los campos crudos de las cuatro filas que alimentan `DocumentIdentity`:
 * Company, Tenant, Manual y (CompanyDocument | la plantilla en vista previa). */
export interface DocumentIdentityInput {
  company: {
    name: string;
    dc3LegalName: string | null;
    logo: string | null;
  };
  tenant: {
    name: string;
  };
  /** `Manual.normaLabel`. */
  normaLabel: string | null;
  /** `ManualDocument.code`. */
  code: string;
  /** `CompanyDocument.codeOverride`, o `null` en vista previa. */
  codeOverride: string | null;
  /** `ManualDocument.name`. */
  name: string;
  /** `CompanyDocument.nameOverride`, o `null` en vista previa. */
  nameOverride: string | null;
  kind: ManualDocumentKind;
  version: number;
  status: CompanyDocumentStatus;
  issuedAt: Date;
  /** `CompanyDocument.sourceTemplateVersion`. Null cuando no se sabe de qué
   * plantilla salió (una versión antigua subida como archivo, de antes de
   * esta fase): en ese caso no se avisa de nada, un aviso inventado es peor
   * que ninguno. */
  sourceTemplateVersion: number | null;
  /** `ManualDocument.templateVersion` actual. */
  latestTemplateVersion: number;
}

/**
 * `sourceTemplateVersion` nulo (una versión antigua subida como archivo, de
 * antes de esta fase) **no** avisa de nada: no se sabe de qué plantilla
 * salió, y un aviso inventado es peor que ninguno.
 *
 * Extraída aparte —y no repetida como una expresión suelta en cada lugar que
 * la necesita— para que el aviso del consultor (`getManualDocumentForEdit`,
 * plan 03-04) y el del cliente (`DocumentIdentity.isOutdated`) usen
 * exactamente la misma fórmula y no puedan divergir (DOC-07).
 */
export function isTemplateOutdated(
  sourceTemplateVersion: number | null,
  latestTemplateVersion: number,
): boolean {
  return sourceTemplateVersion !== null && latestTemplateVersion > sourceTemplateVersion;
}

export function buildDocumentIdentity(input: DocumentIdentityInput): DocumentIdentity {
  const companyName =
    clean(input.company.dc3LegalName) ?? clean(input.company.name) ?? input.company.name;
  const code = input.codeOverride ?? input.code;
  const name = input.nameOverride ?? input.name;
  const isOutdated = isTemplateOutdated(input.sourceTemplateVersion, input.latestTemplateVersion);

  return {
    companyName,
    companyLogo: input.company.logo,
    tenantName: input.tenant.name,
    code,
    name,
    normaLabel: input.normaLabel ?? "",
    kind: input.kind,
    kindLabel: DOCUMENT_KIND_LABEL[input.kind],
    version: input.version,
    status: input.status,
    statusLabel: DOCUMENT_STATUS_LABEL[input.status],
    statusClass: DOCUMENT_STATUS_CLASS[input.status],
    issuedAt: ISSUED_AT_FORMAT.format(input.issuedAt),
    sourceTemplateVersion: input.sourceTemplateVersion,
    latestTemplateVersion: input.latestTemplateVersion,
    isOutdated,
    outdatedLabel: isOutdated
      ? `Hay una versión más reciente de la plantilla (v${input.latestTemplateVersion})`
      : null,
  };
}
