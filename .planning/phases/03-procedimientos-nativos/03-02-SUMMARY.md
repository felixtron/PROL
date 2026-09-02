---
phase: 03-procedimientos-nativos
plan: 02
subsystem: database
tags: [prisma, postgres, next-rsc, server-actions, ops-05, versioning]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Enums ManualDocumentKind/CompanyDocumentStatus, columnas nativas y de estatus en CompanyDocument/ManualDocument, fixture reproducible (P-RFC-4.1-01, Acme Corp, Constructora Delta)"
provides:
  - "getAssignmentPanel y getSectionForCompany filtran por status: \"VIGENTE\" en vez de calcular vigente como max(version)"
  - "uploadCompanyDocument degrada la VIGENTE anterior a OBSOLETO dentro de su transacción con lock existente, sosteniendo el invariante también para documentos kind FILE"
  - "company-project-panel.tsx renderiza de forma consciente del kind: nombre con nameOverride, segmento de fileName sólo para FILE, botón de subida oculto para nativos, etiqueta de tipo+versión en su lugar"
  - "Documentación explícita de los tres call sites intocables de CompanyDocument (deleteManualDocument, cálculo de versión máxima, _count del catálogo) para que ningún plan posterior los toque"
affects: [03-03, 03-04, 03-05, 03-06, 03-07, 03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "\"Vigente\" es un estatus consultado (where: { status: \"VIGENTE\" }), no una versión deducida (orderBy version desc + primera fila). El dedup manual por documentId se conserva como red de seguridad barata, no como mecanismo primario."
    - "Degradación de estado dentro de la misma transacción con lock que calcula el número de versión siguiente: updateMany a OBSOLETO ANTES del create, nunca en una transacción separada."

key-files:
  created: []
  modified:
    - apps/web/lib/queries/manual.ts
    - apps/web/lib/actions/manual.ts
    - apps/web/components/company-project-panel.tsx

key-decisions:
  - "El comentario explicativo del where de getSectionForCompany se escribió en clave de cliente (\"esta es la página que el cliente ve directamente\"), no copiando literalmente el texto del where de getAssignmentPanel (que habla del consultor) — son audiencias distintas y el comentario debe describir la audiencia real de cada consulta."
  - "La etiqueta de tipo+versión en company-project-panel.tsx para kind !== \"FILE\" es texto plano (\"Procedimiento · v2\"), sin enlace: el visor del cliente para esos documentos no existe todavía (llega en 03-07), y el plan es explícito en no inventar una ruta."
  - "kind: \"FILE\" y status: \"VIGENTE\" se hicieron explícitos en el create de uploadCompanyDocument en vez de dejarlos al @default del esquema, para que la fila no dependa silenciosamente de un default que un día podría cambiar."

requirements-completed: [OPS-05]

# Metrics
duration: ~20min
completed: 2026-09-02
---

# Phase 3 Plan 2: OPS-05 — "vigente" es un estatus, no la versión más alta Summary

**Las dos consultas que calculaban "documento vigente" como `max(version)` ahora filtran por `status: "VIGENTE"`, y `uploadCompanyDocument` degrada la fila vigente anterior a `OBSOLETO` dentro de su transacción con lock — cerrando el bug silencioso más probable de la fase antes de que `BORRADOR` tuviera oportunidad de dispararlo.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-02T16:29:00Z
- **Tasks:** 3 completadas (la tarea 3 es de verificación pura, sin cambios de código)
- **Files modified:** 3

## Accomplishments

- `getAssignmentPanel` (panel del consultor) y `getSectionForCompany` (página de sección del cliente) filtran por `status: "VIGENTE"` en vez de asumir que la versión más alta es la vigente; sus `select` ahora traen `kind`, `status` y `nameOverride`.
- `uploadCompanyDocument` degrada la `VIGENTE` anterior a `OBSOLETO` con un `updateMany` dentro de la misma transacción y bajo el mismo `FOR UPDATE` sobre `manual_documents` que ya calculaba la versión siguiente — el invariante "como mucho una VIGENTE por (documento, empresa)" ahora se sostiene también para documentos `kind: FILE`, no sólo para los nativos.
- `company-project-panel.tsx` deja de asumir `fileName` no-nulo: construye la línea de estado con un array filtrado en vez de ternarios anidados, resuelve el nombre con `nameOverride ?? name`, oculta el botón de subida para `kind !== "FILE"` y sigue listando los documentos nativos (enmienda c del CONTEXT).
- Demostrado contra el servidor real y la base real: una fila `VIGENTE` v1 y una `BORRADOR` v2 → las dos pantallas muestran v1; invirtiendo los estatus, las dos pantallas cambian a v2 (control negativo que descarta que la consulta simplemente no devuelva nada); dos "subidas" con la forma exacta de la transacción de `uploadCompanyDocument` dejan versiones consecutivas y una sola `VIGENTE`; el invariante global sobre toda la tabla da 0.

## Task Commits

1. **Tarea 1: "vigente" es un estatus en las dos consultas que lo significan** - `678c70f` (feat)
2. **Tarea 2: subir un archivo degrada la versión anterior** - `6359397` (fix)
3. **Tarea 3: criterio 5 demostrado — el borrador con versión más alta no se ve** - sin commit propio (tarea de verificación pura contra servidor/base reales; los scripts desechables no se commitean, según especifica el plan)

_Nota: el commit de metadata de este SUMMARY se hace por separado._

## Files Created/Modified

- `apps/web/lib/queries/manual.ts` - `getAssignmentPanel` y `getSectionForCompany` filtran por `status: "VIGENTE"`; selects con `kind`/`status`/`nameOverride`; comentarios del dedup reescritos como red de seguridad, no como semántica primaria.
- `apps/web/lib/actions/manual.ts` - `uploadCompanyDocument` degrada la `VIGENTE` anterior con `updateMany` antes del `create`; `create` fija `kind: "FILE"` y `status: "VIGENTE"` explícitos.
- `apps/web/components/company-project-panel.tsx` - Nombre resuelto con `nameOverride ?? name`; línea de versión construida con array filtrado + `.join(" · ")`; descarga sólo para `kind === "FILE"`; etiqueta de tipo+versión para nativos; botón de subida condicionado a `!own || own.kind === "FILE"`.

## La tabla de los seis puntos de llamada de `CompanyDocument` — qué se hizo en cada uno

| # | Archivo:línea | Función | Semántica | Qué se hizo |
|---|---|---|---|---|
| 1 | `lib/queries/manual.ts` (`getAssignmentPanel`) | Panel del consultor | **VIGENTE** | `where` ganó `status: "VIGENTE"`; select ganó `kind`/`status`/`nameOverride`. Verificado con la fixture v1/v2. |
| 2 | `lib/queries/manual.ts` (`getSectionForCompany`) | Página de sección del cliente | **VIGENTE** | Mismo cambio, con el `where` que ya trae el join por sección. Verificado con la fixture v1/v2 y su control negativo. |
| 3 | `app/files/company-document/[id]/route.ts` | Descarga por id exacto | Cualquier versión | **No tocado** — ya resuelto en 03-01 (guard de `fileKey` nulo). Es correcto poder descargar una versión histórica por su propio id. |
| 4 | `lib/actions/manual.ts` (`deleteManualDocument`) | Bloqueo de borrado | Cualquier versión, a propósito | **No tocado.** Verificado en el diff: no aparece ninguna línea modificada en esta función. Filtrar por VIGENTE permitiría borrar un `ManualDocument` con historial `OBSOLETO`/`BORRADOR`, perdiéndolo. |
| 5 | `lib/actions/manual.ts` (`uploadCompanyDocument`) | Cálculo de versión máxima | Cualquier versión, a propósito | El `findFirst({ orderBy: { version: "desc" } })` **no cambió** — sigue sin filtro de `status`. Ganó una responsabilidad nueva: el `updateMany` que degrada la `VIGENTE` anterior, y el `create` ahora fija `kind`/`status` explícitos. |
| 6 | `lib/queries/manual.ts` (`getManualForEdit`, `_count.companyDocuments`) | Catálogo admin | Cualquier versión, a propósito | **No tocado.** Es un contador informativo ("N versiones de empresa"), no "cuántas empresas tienen la vigente". |

## Evidencia del criterio 5 contra el servidor y la base reales

**Fixture (script desechable `packages/db/prisma/_tmp-ops05.ts`, borrado al final):** sobre `P-RFC-4.1-01` / Acme Corp — v1 `status: VIGENTE`, `kind: PROCEDIMIENTO`, `contentHtml` con `MARCA-VIGENTE-V1`; v2 `status: BORRADOR`, `kind: PROCEDIMIENTO`, `contentHtml` con `MARCA-BORRADOR-V2`.

**Nota metodológica importante:** el grep literal `grep -c 'Versión 1'` que especifica el plan da `0` sobre el HTML crudo de la página de sección del cliente, no porque la vigente no se muestre, sino porque React SSR inserta comentarios de hidratación entre el texto estático y el valor interpolado (`Versión <!-- -->1<!-- --> de tu empresa`). Se verificó quitando esos comentarios (`sed 's/<!-- -->//g'`) antes de contar; el panel del consultor no tiene este problema porque su línea se arma con un `.join(" · ")` en una sola cadena antes de llegar al JSX. Ruta real usada para el consultor: `/tenant-admin/projects/[assignmentId]` (coincide con lo asumido por el plan).

| Comprobación | Cliente (`/dashboard/manuals/.../sections/...`) | Consultor (`/tenant-admin/projects/...`) |
|---|---|---|
| Estado real (v1 VIGENTE, v2 BORRADOR) — "Versión 1" | 1 (tras limpiar comentarios de hidratación) | 1 |
| Estado real — "Versión 2" | 0 | 0 |
| Enlace de descarga apunta al id de v1 | Sí (`/files/company-document/<id-de-v1>`) | — (el consultor no navega a descarga cuando `kind !== FILE`; para este fixture nativo se muestra la etiqueta "Procedimiento · v1") |
| Control negativo: estatus invertidos (v1 OBSOLETO, v2 VIGENTE) — "Versión 2" | 1 | 1 |
| Control negativo — "Versión 1" | 0 | 0 |

El control negativo descarta que "sale la v1" sea casualidad de una consulta rota que no devuelve nada: al invertir los estatus, las dos pantallas cambiaron de foco exactamente al estatus, no a la versión. Los estatus se devolvieron a su estado original antes de continuar.

## Degradación de `uploadCompanyDocument` — verificada por forma de transacción, no por la acción

**Advertencia explícita:** el camino completo de `uploadCompanyDocument` pasa por una server action, que no se invoca por `curl`. Lo que se verificó aquí es que la **forma exacta** de la transacción (mismo `FOR UPDATE`, mismo orden de operaciones, mismos campos) produce el resultado correcto, reproducida en un script desechable (`packages/db/prisma/_tmp-upload-twice.ts`, borrado al final) — igual que hizo el plan 01-02 con la carrera de versión. El plan 03-06 es el que ejercita esto de verdad por la interfaz, invocando la acción real desde una subida real.

Resultado de dos "subidas" consecutivas sobre el mismo documento/empresa:

```
version=1 status=OBSOLETO
version=2 status=VIGENTE
```

Versiones consecutivas, sin huecos, y exactamente una `VIGENTE` (la última).

## Invariante global

```sql
select count(*) from (
  select document_id, company_id from company_documents
  where status='VIGENTE' group by 1,2 having count(*)>1
) x;
```

Resultado: `0` sobre toda la tabla `company_documents`, no sólo sobre el fixture de esta tarea.

## Limpieza confirmada

- `company_documents`: `0` filas tras borrar el fixture y las dos filas de la prueba de subida.
- `evidences` con `form_snapshot` no nulo: `2` (intactas, banco de regresión de la fase 1).
- `packages/db/prisma/_tmp-ops05.ts` y `_tmp-upload-twice.ts`: borrados; `git status --porcelain` no menciona ningún `_tmp-`.
- Servidor `next dev` de la tarea 3 detenido (`pkill -f 'next dev'`).

## Decisions Made

- El comentario del `where` de `getSectionForCompany` se redactó en clave de cliente ("esta es la página que el cliente ve directamente"), distinto textualmente del de `getAssignmentPanel` ("este panel enlaza a la descarga... al consultor"): son audiencias distintas y cada comentario describe la suya, en vez de copiar el mismo texto en los dos sitios.
- La etiqueta de tipo+versión para documentos nativos en el panel del consultor es texto plano sin enlace (`Procedimiento · v2`): el visor del cliente para esos documentos todavía no existe (llega en 03-07), y el plan es explícito en no inventar una ruta que no existe.
- `kind: "FILE"` y `status: "VIGENTE"` se hicieron explícitos en el `create` de `uploadCompanyDocument` en vez de depender del `@default` del esquema — la fila no debe depender silenciosamente de un valor por defecto que un día podría cambiar.

## Deviations from Plan

None - plan executed exactly as written. La única desviación es metodológica, no de alcance: el grep literal de "Versión 1"/"Versión 2" que sugiere el plan necesitó limpiar los comentarios de hidratación de React SSR antes de contar en la página de sección del cliente (documentado arriba, en "Evidencia del criterio 5"). No cambió ningún criterio de éxito ni requirió tocar código de producción.

## Issues Encountered

- El wrapper local `rtk` (ajeno al proyecto) reescribe invocaciones de `grep`/comandos de shell; se usó `rtk proxy` delante de `pnpm exec`/`tsx` cuando hizo falta, igual que en el plan 03-01. No es un problema del código de PROL.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Los seis puntos de llamada de `CompanyDocument` quedan documentados con su dictamen (cambia / no cambia y por qué) en este SUMMARY, para que ningún plan posterior "termine el trabajo" aplicando el filtro `VIGENTE` donde no debe (en particular, el cálculo de versión máxima de `uploadCompanyDocument` y el contador de `deleteManualDocument`).
- OPS-05 queda completo: las dos consultas de lectura y la acción de escritura sostienen el invariante "como mucho una VIGENTE por (documento, empresa)" de punta a punta, verificado con datos reales y un control negativo.
- La UI del panel del consultor ya está preparada para el kind de documento (nombre con `nameOverride`, sin botón de subida para nativos, etiqueta de tipo+versión) — el plan 03-07 sólo necesita añadir el enlace real al visor del cliente donde hoy hay una etiqueta de texto.
- Ningún bloqueo. La base local queda exactamente como el plan 03-03 la espera: `company_documents` vacía, dos evidencias de `form_snapshot` intactas, dos empresas con marca, un manual publicado con un documento `PROCEDIMIENTO` y dos activaciones.

---
*Phase: 03-procedimientos-nativos*
*Completed: 2026-09-02*

## Self-Check: PASSED

Los tres archivos modificados existen en disco con los cambios descritos, y los dos commits de tarea (`678c70f`, `6359397`) están presentes en el historial de git. `company_documents` está en 0 filas y `evidences` con `form_snapshot` en 2, confirmado contra la base real tras la limpieza.
