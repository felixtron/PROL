---
phase: 03-procedimientos-nativos
plan: 04
subsystem: api
tags: [prisma, next-rsc, server-actions, sanitize-html, versioning, ops-05]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Esquema del documento nativo (ManualDocument.kind/contentHtml/templateVersion, CompanyDocument.kind/contentHtml/nameOverride/status/sourceTemplateVersion) y la fixture P-RFC-4.1-01 / Acme Corp / Constructora Delta"
  - phase: 03-02
    provides: "El invariante VIGENTE-es-estatus (OPS-05), que este plan da por sentado al leer CompanyDocument por status"
  - phase: 03-03
    provides: "sanitizeManualHtml ya ejercitado por convertDocxToManualHtml; el mismo sanitizador se reutiliza aquí en el segundo camino de escritura"
provides:
  - "DocumentIdentity (tipo + buildDocumentIdentity puro): razón social, logo, código, nombre, versión, estatus, fecha y norma ya resueltos, con isOutdated calculado por isTemplateOutdated"
  - "resolve-identity.ts: loadCompanyDocumentIdentity (emisión existente) y loadTemplatePreviewIdentity (vista previa de plantilla) llenan la misma DocumentIdentity desde fuentes distintas"
  - "updateManualDocumentBody: sanea antes de comparar/escribir, sube templateVersion sólo en cambio real, deja el primer cuerpo en v1, convierte FILE -> PROCEDIMIENTO al recibir cuerpo"
  - "createManualDocument acepta kind (FILE por defecto, PROCEDIMIENTO admitido, REGISTRO rechazado explícitamente)"
  - "getManualDocumentForEdit: documento + manual + secciones + estado de emisión de cada empresa activa (current/draft/isOutdated) con una sola consulta a companyDocument"
affects: [03-05, 03-06, 03-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split puro/servidor para 'identidad resuelta una vez' (document-identity.ts puro + resolve-identity.ts servidor), calcado de renderCertificate(templateId, data): dos consumidores llenan la misma interfaz desde fuentes distintas para que vista previa y emitido no puedan divergir"
    - "Fórmula compartida extraída a función importable (isTemplateOutdated) en vez de repetida como expresión suelta, para que dos avisos (consultor y cliente) no puedan divergir con el tiempo"
    - "Comparación entre saneados (safeHtml === previous), no entre crudo entrante y guardado, para que marcado descartado por el sanitizador no cuente como cambio de versión"

key-files:
  created:
    - apps/web/lib/documents/document-identity.ts
    - apps/web/lib/documents/resolve-identity.ts
    - apps/web/lib/actions/manual-document.ts
    - apps/web/lib/queries/manual-document.ts
  modified:
    - apps/web/lib/actions/manual.ts

key-decisions:
  - "isTemplateOutdated se extrajo como función exportada de document-identity.ts (no una expresión booleana repetida) para que getManualDocumentForEdit y buildDocumentIdentity usen exactamente la misma fórmula: el aviso de plantilla desactualizada al consultor y al cliente no pueden divergir con el tiempo."
  - "current.updatedAt en getManualDocumentForEdit se resuelve como CompanyDocument.createdAt: el modelo no tiene columna updatedAt propia (confirmado contra schema.prisma) y añadirla es un cambio de esquema fuera del alcance de este plan. Documentado en el código; el bucle BORRADOR real (edición en sitio) llega en el plan 03-05, que es quien necesitaría esa columna de verdad."
  - "getManualDocumentForEdit lista TODAS las empresas con el manual activo (no sólo las que ya tienen emisión de este documento): es lo que le dice al consultor a quién le falta emitir, y evita que el editor necesite una segunda consulta."

requirements-completed: [DOC-01, DOC-04, DOC-07]

# Metrics
duration: ~20min
completed: 2026-09-02
---

# Phase 3 Plan 4: Contratos del documento nativo — identidad resuelta y escritura del cuerpo Summary

**`DocumentIdentity` (puro, patrón `renderCertificate`) con logo en vivo y razón social DC-3, más `updateManualDocumentBody` con su política de `templateVersion` verificada contra la base real: mismo cuerpo no sube versión, marcado saneado tampoco, cambio real sí, y el primer cuerpo de un `FILE` lo convierte en `PROCEDIMIENTO` sin pasar por v2.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-02T17:01:29Z
- **Tasks:** 3 completadas (la tarea 3 es de verificación pura contra la base real, sin cambios de código)
- **Files modified:** 5 (4 nuevos, 1 modificado)

## Accomplishments

- `DocumentIdentity` entrega razón social (`dc3LegalName ?? name`, misma regla que el emisor DC-3), logo en vivo, código y nombre con sus overrides, versión, estatus (con etiqueta y clase de color), fecha ya formateada en es-MX, y `isOutdated`/`outdatedLabel` calculados con una fórmula extraída (`isTemplateOutdated`) para que el aviso no diverja entre pantallas.
- `resolve-identity.ts` llena esa misma interfaz por dos caminos —una emisión real (`loadCompanyDocumentIdentity`) y una vista previa de plantilla (`loadTemplatePreviewIdentity`, con `status: "BORRADOR"` y `sourceTemplateVersion` igual al actual para que nunca aparezca desactualizada)— sin autorizar por su cuenta.
- `updateManualDocumentBody` sanea antes de comparar y antes de escribir, no sube `templateVersion` en guardados sin cambio real (ni cuando el único "cambio" es marcado que el sanitizador descarta), deja el primer cuerpo en v1, y convierte `FILE` en `PROCEDIMIENTO` la primera vez que hay contenido — verificado contra la base real, no sólo leído.
- `createManualDocument` acepta `kind` (`FILE` por defecto, `PROCEDIMIENTO` admitido) y cierra `REGISTRO` con un mensaje explícito, sin tocar ningún otro comportamiento de `manual.ts` (los intocables del plan 03-02 siguen intactos, confirmado por diff).
- `getManualDocumentForEdit` trae documento, manual, secciones y el estado de emisión de las dos empresas activas (Acme Corp, Constructora Delta) con **una** consulta a `companyDocument`, agrupada en memoria — nada de una consulta por empresa.

## Task Commits

1. **Tarea 1: DocumentIdentity — resuelta una vez, sin nulls que interpretar** - `e75548e` (feat)
2. **Tarea 2: escribir el cuerpo de la plantilla, con su política de versión** - `d281a32` (feat)
3. **Tarea 3: la política de versión, demostrada contra la base** - sin commit propio (tarea de verificación pura contra la base real; el script desechable no se commitea, según especifica el plan)

_Nota: el commit de metadata de este SUMMARY se hace por separado._

## Files Created/Modified

- `apps/web/lib/documents/document-identity.ts` (nuevo) - Tipo `DocumentIdentity`, las tres tablas de etiquetas, `isTemplateOutdated` y `buildDocumentIdentity`. Puro: sólo `import type` de `@prol/db`.
- `apps/web/lib/documents/resolve-identity.ts` (nuevo) - `loadCompanyDocumentIdentity` y `loadTemplatePreviewIdentity`, sólo servidor, no autoriza.
- `apps/web/lib/actions/manual-document.ts` (nuevo) - `updateManualDocumentBody`, `"use server"`, archivo propio para el ciclo de vida del documento nativo.
- `apps/web/lib/queries/manual-document.ts` (nuevo) - `getManualDocumentForEdit`, con `cache()`, autoriza con `requireManualAdmin` + `assertTenantScope`.
- `apps/web/lib/actions/manual.ts` (modificado) - `createManualDocument` gana el parámetro `kind`.

## Firmas exactas para los planes 03-05/06/07

### `DocumentIdentity` (apps/web/lib/documents/document-identity.ts)

```typescript
export const DOCUMENT_KIND_LABEL: Record<ManualDocumentKind, string> = {
  FILE: "Archivo", PROCEDIMIENTO: "Procedimiento", REGISTRO: "Registro",
};
export const DOCUMENT_STATUS_LABEL: Record<CompanyDocumentStatus, string> = {
  BORRADOR: "Borrador", VIGENTE: "Vigente", OBSOLETO: "Obsoleto",
};
export const DOCUMENT_STATUS_CLASS: Record<CompanyDocumentStatus, string> = {
  BORRADOR: "bg-amber-100 text-amber-800",
  VIGENTE: "bg-emerald-100 text-emerald-700",
  OBSOLETO: "bg-slate-100 text-slate-700",
};

export interface DocumentIdentity {
  companyName: string;             // dc3LegalName ?? name (regla del DC-3)
  companyLogo: string | null;      // única propiedad opcional; se lee en vivo
  tenantName: string;
  code: string;                    // codeOverride ?? code
  name: string;                    // nameOverride ?? name
  normaLabel: string;              // "" si el manual no declara norma
  kind: ManualDocumentKind;
  kindLabel: string;
  version: number;
  status: CompanyDocumentStatus;
  statusLabel: string;
  statusClass: string;
  issuedAt: string;                // ya formateada, es-MX / America/Mexico_City
  sourceTemplateVersion: number | null;
  latestTemplateVersion: number;
  isOutdated: boolean;
  outdatedLabel: string | null;    // `Hay una versión más reciente de la plantilla (v${n})`
}

export interface DocumentIdentityInput {
  company: { name: string; dc3LegalName: string | null; logo: string | null };
  tenant: { name: string };
  normaLabel: string | null;
  code: string;
  codeOverride: string | null;
  name: string;
  nameOverride: string | null;
  kind: ManualDocumentKind;
  version: number;
  status: CompanyDocumentStatus;
  issuedAt: Date;
  sourceTemplateVersion: number | null;
  latestTemplateVersion: number;
}

export function isTemplateOutdated(
  sourceTemplateVersion: number | null,
  latestTemplateVersion: number,
): boolean; // sourceTemplateVersion !== null && latestTemplateVersion > sourceTemplateVersion

export function buildDocumentIdentity(input: DocumentIdentityInput): DocumentIdentity;
```

### `resolve-identity.ts`

```typescript
export async function loadCompanyDocumentIdentity(companyDocumentId: string): Promise<{
  identity: DocumentIdentity;
  contentHtml: string;
  companyId: string;
  documentId: string;
} | null>;

export async function loadTemplatePreviewIdentity(
  documentId: string,
  companyId: string,
): Promise<{ identity: DocumentIdentity; contentHtml: string } | null>;
```

### `updateManualDocumentBody` (apps/web/lib/actions/manual-document.ts)

```typescript
export async function updateManualDocumentBody(input: {
  documentId: string;
  contentHtml: string;
}): Promise<
  | { success: true; templateVersion: number; changed: boolean; kind: ManualDocumentKind }
  | { success: false; error: string }
>;
```

Nota: en la práctica esta función sólo `throw`s (documento no encontrado, tenant no coincide) o devuelve `success: true` — no hay ninguna rama que devuelva `success: false` todavía. El tipo de unión queda declarado para que los planes 05/06/07 lo consuman de forma discriminada sin tener que ampliarlo si una validación de entrada se añade después.

### `getManualDocumentForEdit` (apps/web/lib/queries/manual-document.ts)

```typescript
export const getManualDocumentForEdit: (documentId: string) => Promise<{
  document: {
    id: string; code: string; name: string; description: string | null;
    kind: ManualDocumentKind; contentHtml: string | null;
    templateVersion: number; baseFileName: string | null;
  };
  manual: { id: string; title: string; normaLabel: string | null; tenantId: string };
  sections: { code: string | null; title: string }[];
  companies: {
    assignmentId: string;
    companyId: string;
    companyName: string;
    companyLogo: string | null;
    current: {
      id: string; version: number; status: CompanyDocumentStatus;
      sourceTemplateVersion: number | null; updatedAt: Date; // = CompanyDocument.createdAt, ver decisión
    } | null;
    draft: { id: string; version: number } | null;
    isOutdated: boolean;
  }[];
} | null>;
```

Probado en vivo contra la fixture: para `P-RFC-4.1-01` devuelve `document.templateVersion = 1`, `manual.tenantId` de Academia Digital, `sections = [{ code: "4.1", title: "Comprensión de la organización y de su contexto" }]`, y `companies` con Acme Corp y Constructora Delta, ambas con `current: null` y `draft: null` (todavía no hay ninguna emisión) e `isOutdated: false`.

## `createManualDocument`: ningún llamador tocado

`createManualDocument` ganó el parámetro opcional `kind` sin cambiar su firma de forma incompatible (`kind?: ManualDocumentKind`, por defecto `"FILE"`). Grep de sus llamadores confirma que hoy sólo lo invoca la UI del catálogo de documentos (`apps/web/app/tenant-admin/manuals/[id]/`), que en este plan no se toca — sigue creando documentos sin pasar `kind`, y sigue recibiendo `"FILE"` exactamente como antes. La UI que ofrezca elegir `PROCEDIMIENTO` al crear es del plan 03-06.

## Tabla de los seis pasos de `templateVersion` — valores observados

Ejecutado con un script desechable (`packages/db/prisma/_tmp-template-version.ts`, borrado al terminar) que replica el cuerpo exacto de `updateManualDocumentBody` contra la base real, importando el `sanitizeManualHtml` real (no una copia) vía ruta relativa desde `packages/db` — confirmado que la resolución de módulos funciona igual bajo `tsx` porque Node resuelve `sanitize-html` relativo a la ubicación real del archivo importado (`apps/web/lib/`), no a la del script que lo invoca.

| # | Qué se guarda | `templateVersion` esperada | Observada | `kind` esperado | Observado |
|---|---|---|---|---|---|
| 0 | (estado inicial de la fixture) | 1 | **1** | PROCEDIMIENTO | **PROCEDIMIENTO** |
| 1 | el mismo cuerpo que ya tiene | 1 (sin cambio) | **1**, `changed: false` | PROCEDIMIENTO | **PROCEDIMIENTO** |
| 2 | el mismo cuerpo + `<script>alert(1)</script>` | 1 (el sanitizador lo borra, resultado idéntico) | **1**, `changed: false` | PROCEDIMIENTO | **PROCEDIMIENTO** |
| 3 | un cuerpo distinto de verdad | 2 | **2**, `changed: true` | PROCEDIMIENTO | **PROCEDIMIENTO** |
| 4 | otro cuerpo distinto | 3 | **3**, `changed: true` | PROCEDIMIENTO | **PROCEDIMIENTO** |
| 5 | primer cuerpo de un documento **nuevo** `kind: FILE` sin contenido | 1 (no 2) | **1**, `changed: true` | pasa a **PROCEDIMIENTO** | **PROCEDIMIENTO** |
| 6 | un cuerpo distinto sobre ese mismo documento | 2 | **2**, `changed: true` | PROCEDIMIENTO | **PROCEDIMIENTO** |

El paso 2 es el que prueba que la comparación es entre saneados: si se comparara el crudo entrante contra lo guardado, pegar un `<script>` habría subido la versión aunque el resultado final fuera idéntico al ya guardado, y la insignia de DOC-07 habría avisado a las dos empresas de un cambio que no existe.

**Verificaciones adicionales tras el paso 3:** `company_documents` en `0` filas (no hay emisiones todavía, así que "editar la plantilla no toca lo emitido" queda como comprobación de conteo — la demostración de verdad de ese criterio, con emisiones reales, es del plan 03-07, como anticipa el plan).

**Estado final restaurado**, confirmado contra la base:
```
P-RFC-4.1-01 | tv=1 | kind=PROCEDIMIENTO | tabla=t
```
`company_documents` en `0`. `evidences` con `form_snapshot` no nulo en `2` (banco de regresión de la fase 1, intacto). El documento auxiliar `_tmp-aux-doc` y el script desechable fueron borrados; `git status --porcelain` no menciona ningún `_tmp-`.

## Decisions Made

- `isTemplateOutdated` se extrajo como función exportada de `document-identity.ts` en vez de repetir la expresión booleana en `getManualDocumentForEdit`: el aviso de "plantilla desactualizada" al consultor y al cliente comparten fórmula y no pueden divergir con una futura edición de una de las dos copias.
- `current.updatedAt` en `getManualDocumentForEdit` se resuelve como `CompanyDocument.createdAt`, documentado en el código: el modelo no tiene columna `updatedAt` propia (confirmado contra `schema.prisma`) y añadirla es un cambio de esquema fuera del alcance declarado de este plan (que sólo consume el esquema del plan 03-01). El bucle `BORRADOR` real —que sí necesitaría distinguir "creado" de "última edición"— es del plan 03-05.
- `getManualDocumentForEdit` lista **todas** las empresas con el manual activo, no sólo las que ya tienen una emisión de este documento: es lo que le permite al consultor ver a quién le falta emitir, sin que el editor necesite una segunda consulta para el catálogo de empresas.
- El script desechable de la tarea 3 importa el `sanitizeManualHtml` real por ruta relativa en vez de duplicar su lógica, para que el paso 2 (marcado descartado) pruebe el comportamiento real del sanitizador y no una aproximación que pudiera divergir.

## Deviations from Plan

None - plan executed exactly as written. La única adición no listada explícitamente en las tareas es la extracción de `isTemplateOutdated` como función aparte en `document-identity.ts` (en vez de una expresión booleana repetida) — está dentro del alcance declarado del plan (`document-identity.ts` está en `files_modified` de la frontmatter) y es exactamente lo que pide el propio plan para la tarea 2 ("`isOutdated` se calcula con la misma expresión que `buildDocumentIdentity` —importarla de ahí, no reescribirla—").

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Los contratos que consumen los planes 03-05 (emisión/publicación), 03-06 (editor del consultor) y 03-07 (visor del cliente) ya existen, están tipados y verificados contra la base real: `DocumentIdentity`, sus dos resolutores, `updateManualDocumentBody` y `getManualDocumentForEdit`.
- Ningún bloqueo. La base local queda exactamente como el plan 03-05 la espera: `company_documents` vacía, dos evidencias de `form_snapshot` intactas, `P-RFC-4.1-01` en `templateVersion = 1` con su cuerpo original, dos empresas con marca y dos activaciones.
- DOC-01, DOC-04 y DOC-07 avanzan con esta pieza de servidor; su demostración end-to-end por la interfaz (crear/editar un procedimiento desde el navegador, ver la insignia de plantilla desactualizada en pantalla) es de los planes 03-06/03-07, como marca la nota de precisión del plan sobre qué queda verificado como "forma de transacción" contra la base y qué queda pendiente de la UI real.

---
*Phase: 03-procedimientos-nativos*
*Completed: 2026-09-02*

## Self-Check: PASSED

Los cinco archivos creados/modificados existen en disco y los dos commits de tarea (`e75548e`, `d281a32`) están presentes en el historial de git. La base local quedó verificada tras la tarea 3: `P-RFC-4.1-01` restaurado a `tv=1`/`PROCEDIMIENTO`, `company_documents` en `0`, `evidences` con `form_snapshot` en `2`, y ningún script `_tmp-` en `git status --porcelain`.
