---
phase: 03-procedimientos-nativos
plan: 05
subsystem: api
tags: [prisma, next-rsc, server-actions, versioning, sanitize-html, doc-05]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Esquema del documento nativo (kind/contentHtml/templateVersion en ManualDocument; kind/contentHtml/nameOverride/status/sourceTemplateVersion/publishedAt/publishedById en CompanyDocument) y la fixture P-RFC-4.1-01 / Acme Corp / Constructora Delta"
  - phase: 03-02
    provides: "El invariante VIGENTE-es-estatus (OPS-05) y el patrón de degradación dentro de la misma transacción con lock, que este plan reutiliza literalmente"
  - phase: 03-04
    provides: "DocumentIdentity + loadCompanyDocumentIdentity/loadTemplatePreviewIdentity, updateManualDocumentBody (política de templateVersion), getManualDocumentForEdit"
provides:
  - "issueCompanyDocument: emite un procedimiento a una empresa creando la fila directamente en VIGENTE, con contentHtml y sourceTemplateVersion congelados, degradando antes la VIGENTE anterior"
  - "startCompanyDocumentDraft: abre un BORRADOR idempotente copiando de la fila VIGENTE actual (no de la plantilla)"
  - "saveCompanyDocumentDraft: edita el borrador en sitio, saneado, sin versionar ni bloquear"
  - "publishCompanyDocument: degrada la VIGENTE anterior y promueve el borrador, en una sola transacción con FOR UPDATE"
  - "getCompanyDocumentForClient / getCompanyDocumentForEdit: identidad + cuerpo + historial de control de cambios (DOC-05), con y sin borradores respectivamente"
  - "listCompanyDocumentsForClient: lista maestra de /dashboard/documents, VIGENTE de los dos arquetipos"
affects: [03-06, 03-07, 03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Helper privado (no exportado) que resuelve fila -> activación -> autorización para que varias server actions o queries del mismo archivo compartan un único camino de autorización, sin duplicar la resolución en cada una."
    - "El bucle BORRADOR se implementa como: create con lock+cálculo de versión al abrir, update simple sin lock ni versión al guardar, transacción con lock que degrada-y-luego-promueve al publicar. Tres formas distintas de escritura para tres momentos distintos del ciclo, no una función genérica."
    - "La tabla de control de cambios se construye en la capa de consulta (buildHistoryEntry) a partir de columnas existentes, nunca redactada ni persistida aparte."

key-files:
  created: []
  modified:
    - apps/web/lib/actions/manual-document.ts
    - apps/web/lib/queries/manual-document.ts
    - apps/web/lib/documents/document-identity.ts

key-decisions:
  - "startCompanyDocumentDraft valida explícitamente row.status === \"VIGENTE\" antes de copiar (más allá del texto literal del plan): abrir un borrador copiando de una fila OBSOLETO o de una fila que ya es BORRADOR sería un estado sin sentido que el chequeo de idempotencia no cubre por sí solo."
  - "ISSUED_AT_FORMAT se exportó desde document-identity.ts (antes era un const de módulo sin exportar) para que el historial de DOC-05 formatee sus fechas con el mismo formateador que la identidad resuelta, en vez de crear uno nuevo — cumple literalmente la instrucción del plan de \"no redefinir ninguno\"."
  - "getCompanyDocumentForClient y getCompanyDocumentForEdit comparten resolveCompanyDocumentAssignment y buildHistoryEntry (privados, no exportados) para que la única diferencia real entre ambas — el filtro de estatus del historial y la puerta de autorización — quede visible en el diff en vez de enterrada en dos copias de la misma consulta."

requirements-completed: [DOC-03, DOC-05, DOC-06]

# Metrics
duration: ~25min
completed: 2026-09-02
---

# Phase 3 Plan 5: El ciclo de vida completo de la versión de empresa — emitir, borrador, publicar, historial Summary

**Cuatro server actions (`issueCompanyDocument`, `startCompanyDocumentDraft`, `saveCompanyDocumentDraft`, `publishCompanyDocument`) sobre un único helper de autorización, más tres consultas (`getCompanyDocumentForClient`, `getCompanyDocumentForEdit`, `listCompanyDocumentsForClient`) que generan el historial de control de cambios en tiempo de render — verificado con los diez pasos del ciclo completo contra la base real, incluida la re-emisión sobre un borrador abandonado.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-02T17:20:00Z
- **Tasks:** 3 completadas (la tarea 3 es de verificación pura contra la base real, sin cambios de código de producción)
- **Files modified:** 3

## Accomplishments

- `issueCompanyDocument` crea la fila directamente en `VIGENTE` (enmienda (b) del CONTEXT), congelando `contentHtml` y `sourceTemplateVersion` en el momento de emitir, degradando antes cualquier `VIGENTE` anterior — todo dentro de una única transacción con `FOR UPDATE` sobre `manual_documents`, calcada del patrón de la fase 1.
- `startCompanyDocumentDraft` es idempotente (dos llamadas seguidas devuelven el mismo borrador, no crean dos) y copia de la fila `VIGENTE` actual —no de la plantilla—, incluido `sourceTemplateVersion`: el borrador sigue basado en la misma plantilla que la empresa ya adoptó.
- `saveCompanyDocumentDraft` edita en sitio, sin `create`, sin `version`, sin lock — la ausencia del lock está documentada como deliberada en el código, no como un olvido — y sanea el cuerpo con `sanitizeManualHtml` antes de escribir.
- `publishCompanyDocument` degrada la `VIGENTE` anterior y promueve el borrador en el orden correcto (degradar primero, promover después) dentro de una sola transacción con lock; no toca `version`, que ya se reservó al abrir el borrador.
- `getCompanyDocumentForClient` (autoriza con `requireAssignmentMemberAccess`) y `getCompanyDocumentForEdit` (autoriza con `requireAssignmentManageAccess`) comparten un helper de resolución y un constructor de fila de historial; la única diferencia real es que el cliente excluye `BORRADOR` de su historial y el staff no.
- `listCompanyDocumentsForClient` filtra por `companyId` + `status: "VIGENTE"`, incluye los dos arquetipos (`PROCEDIMIENTO` y `FILE`) y calcula `isOutdated` reutilizando `isTemplateOutdated` de `document-identity.ts`.
- Los diez pasos del ciclo completo, demostrados contra la base real con un script desechable: emitir a dos empresas, editar la plantilla sin mover los snapshots ya emitidos, abrir/guardar un borrador repetidamente sin generar versiones de más, publicar degradando la anterior, abrir un segundo borrador, y re-emitir dejando ese segundo borrador abandonado conviviendo con la nueva versión vigente — con la consulta de "vigente" devolviendo la correcta en todo momento.

## Task Commits

1. **Tarea 1: emitir, abrir borrador, guardar y publicar** - `3c64395` (feat)
2. **Tarea 2: las dos consultas, con el historial de control de cambios** - `520fb45` (feat)
3. **Tarea 3: el bucle completo, demostrado contra la base** - sin commit propio (tarea de verificación pura contra la base real; el script desechable no se commitea, según especifica el plan)

_Nota: el commit de metadata de este SUMMARY se hace por separado._

## Files Created/Modified

- `apps/web/lib/actions/manual-document.ts` - `loadCompanyDocumentForWrite` (privado) + `issueCompanyDocument`, `startCompanyDocumentDraft`, `saveCompanyDocumentDraft`, `publishCompanyDocument`.
- `apps/web/lib/queries/manual-document.ts` - `resolveCompanyDocumentAssignment` + `buildHistoryEntry` (privados) + `getCompanyDocumentForClient`, `getCompanyDocumentForEdit`, `listCompanyDocumentsForClient`.
- `apps/web/lib/documents/document-identity.ts` - `ISSUED_AT_FORMAT` pasa de constante privada a exportada (ver "Deviations from Plan").

## Firmas exactas para los planes 03-06 y 03-07

### `apps/web/lib/actions/manual-document.ts`

```typescript
export async function issueCompanyDocument(input: {
  assignmentId: string;
  documentId: string;
  codeOverride?: string;
  nameOverride?: string;
  notes?: string;
}): Promise<
  | { success: true; companyDocumentId: string; version: number }
  | { success: false; error: string }
>;

export async function startCompanyDocumentDraft(input: {
  companyDocumentId: string;
}): Promise<
  | { success: true; draftId: string; version: number }
  | { success: false; error: string }
>;

export async function saveCompanyDocumentDraft(input: {
  companyDocumentId: string;
  contentHtml: string;
  codeOverride?: string;
  nameOverride?: string;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }>;

export async function publishCompanyDocument(input: {
  companyDocumentId: string;
}): Promise<
  | { success: true; version: number }
  | { success: false; error: string }
>;
```

Errores que devuelve `issueCompanyDocument` sin llegar a la transacción: "El documento no pertenece a este manual", "Este documento se sube como archivo, no se emite" (kind `FILE`), "El documento todavía no tiene cuerpo redactado" (`contentHtml` vacío). `startCompanyDocumentDraft` devuelve "Sólo se puede editar la versión vigente" si la fila de origen no está en `VIGENTE` (ver "Decisions Made"). `saveCompanyDocumentDraft` devuelve "Sólo se puede editar un borrador" fuera de `BORRADOR`. `publishCompanyDocument` devuelve "Sólo se puede publicar un borrador" y "No se puede publicar un documento sin contenido".

### `apps/web/lib/queries/manual-document.ts`

```typescript
export const getCompanyDocumentForClient: (companyDocumentId: string) => Promise<{
  identity: DocumentIdentity;
  contentHtml: string;
  assignmentId: string;
  history: {
    id: string; version: number; status: CompanyDocumentStatus;
    statusLabel: string; statusClass: string;
    date: string; author: string; change: string; isCurrent: boolean;
  }[];
} | null>;

// Misma forma que getCompanyDocumentForClient, pero con TODO el historial
// (borradores incluidos) y autorización de staff.
export const getCompanyDocumentForEdit: (companyDocumentId: string) => Promise<{
  identity: DocumentIdentity;
  contentHtml: string;
  assignmentId: string;
  history: /* misma forma que arriba */ unknown[];
} | null>;

export const listCompanyDocumentsForClient: () => Promise<{
  id: string; kind: ManualDocumentKind; version: number;
  code: string; name: string; updatedAt: Date; manualTitle: string;
  assignmentId: string | null; isOutdated: boolean; fileName: string | null;
}[]>;
```

`history[].isCurrent` es `status === "VIGENTE"` — no depende de cuál `companyDocumentId` se pidió, así que sigue siendo correcto si algún día se navega a una fila histórica por su propio id.

## Advertencia de precisión sobre la tarea 3

Las cuatro acciones son `"use server"` y no se pueden invocar por `curl`. Lo que demuestra el script desechable de la tarea 3 (`packages/db/prisma/_tmp-doc-lifecycle.ts`, borrado al terminar) es que la **forma exacta** de las cuatro transacciones —mismo `FOR UPDATE`, mismo orden de `updateMany`+`create`/`update`, mismos campos— produce el resultado correcto contra la base real. **No se invocó ninguna de las cuatro server actions.** El plan 03-06 es quien las ejercita de verdad por la interfaz, con un humano delante, incluido el criterio 3 firmado en pantalla.

## Los diez pasos — estado observado de `company_documents`

Documento `P-RFC-4.1-01`, empresas Acme Corp y Constructora Delta. Invariante (`0 VIGENTE duplicadas por (documento, empresa)`) y versiones consecutivas comprobados **después de cada paso**, no sólo al final.

| # | Operación | Estado observado |
|---|---|---|
| 1 | Emitir a Acme | 1 fila: `v1 VIGENTE`, `sourceTemplateVersion=1`, `contentHtml` idéntico al de la plantilla |
| 2 | Emitir a Delta | 2 filas VIGENTE totales para el documento (una por empresa); Delta en `v1` |
| — | Snapshot de los dos `contentHtml` guardado ANTES de tocar la plantilla | — |
| 3 | Editar la plantilla (`templateVersion` 1→2) | Los dos `contentHtml` ya emitidos, comparados carácter a carácter antes/después: **idénticos** (criterio 2) |
| 4 | Abrir borrador en Acme | Acme: `v1 VIGENTE` + `v2 BORRADOR`; Delta sigue en 1 fila, intacta |
| 5 | Abrir borrador otra vez en Acme | Misma fila devuelta (`reused=true`); Acme sigue en 2 filas — idempotente |
| 6 | Guardar el borrador | Sigue `v2 BORRADOR`; `contentHtml` con el texto nuevo aplicado |
| 7 | Guardar el borrador otra vez | Acme sigue en 2 filas — criterio 3, primera mitad |
| 8 | Publicar | `v1 OBSOLETO`, `v2 VIGENTE` con `publishedAt` y `publishedById` — criterio 3, segunda mitad |
| 9 | Abrir borrador de nuevo | `v3 BORRADOR`, sin reciclar el `2` |
| 10 | Re-emitir a Acme desde la plantilla v2 | `v4 VIGENTE` (`sourceTemplateVersion=2`); `v2` → `OBSOLETO`; **`v3 BORRADOR` sin tocar** |

**Control tras el paso 10:** con `v3 BORRADOR` (versión 3) conviviendo con `v4 VIGENTE` (versión 4), la consulta `where: { status: "VIGENTE" }, orderBy: { version: "desc" }` devolvió **v4** — el borrador abandonado de versión menor no se coló.

**Historial final de Acme (DOC-05), cuatro filas con sus cinco columnas:**

| Versión | Estatus | Fecha | Autor | Descripción del cambio |
|---|---|---|---|---|
| v4 | VIGENTE | 2026-09-02T17:18:06.156Z | Admin PROL | Re-emisión tras revisión de plantilla |
| v3 | BORRADOR | 2026-09-02T17:18:06.152Z | Admin PROL | — |
| v2 | OBSOLETO | 2026-09-02T17:18:06.146Z | Admin PROL | — |
| v1 | OBSOLETO | 2026-09-02T17:18:06.086Z | Admin PROL | Emisión inicial de piloto |

Dos filas llevan una descripción de cambio real (`notes`), demostrando que la columna se reutiliza como "descripción del cambio"; las otras dos muestran `—`, que es el comportamiento esperado cuando no se proporcionó nota.

## Limpieza confirmada

- `company_documents`: `0` filas tras el `deleteMany` del script (sólo dentro del script desechable — la acción de producción sigue siendo append-only, confirmado por `grep -nE '\.delete\(|deleteMany' apps/web/lib/actions/manual-document.ts` → sin resultados).
- `P-RFC-4.1-01` restaurado a `template_version=1`, `kind=PROCEDIMIENTO`, `contentHtml` original.
- `evidences` con `form_snapshot` no nulo: `2` (banco de regresión de la fase 1, intacto).
- `packages/db/prisma/_tmp-doc-lifecycle.ts`: borrado; `git status --porcelain` no menciona ningún `_tmp-`.

## Asimetría deliberada del historial

`getCompanyDocumentForClient` filtra `status: { in: ["VIGENTE", "OBSOLETO"] }`; `getCompanyDocumentForEdit` no filtra por estatus (todo el historial, `BORRADOR` incluido). Es la misma clase de fuga que OPS-05 cerró para la página de sección: un borrador es trabajo del consultor todavía sin publicar, y enseñárselo al cliente sería mostrarle un procedimiento como si ya lo hubiera adoptado. El docstring de ambas funciones lo dice explícitamente para que nadie las "unifique" seis meses después.

## Decisions Made

- `startCompanyDocumentDraft` exige `row.status === "VIGENTE"` para abrir un borrador nuevo, más allá de lo que el texto del plan detalla explícitamente para esta acción (sí lo detalla para `saveCompanyDocumentDraft`/`publishCompanyDocument`). Sin este chequeo, llamar a la acción con el id de una fila `OBSOLETO` copiaría contenido histórico como si fuera la base de un nuevo borrador — un estado sin sentido que el chequeo de idempotencia (que sólo mira si YA existe un `BORRADOR`) no cubre por sí solo. Rule 2 (correctitud): sin este guard, dos rutas distintas (abrir borrador desde la vigente vs. desde una fila vieja) producirían el mismo borrador con distinto significado.
- `ISSUED_AT_FORMAT` se exportó desde `document-identity.ts` (antes privado del módulo) para que el historial de DOC-05 no defina un segundo formateador de fecha. Es el único archivo fuera de los dos declarados en el frontmatter del plan que este plan tocó — necesario para cumplir literalmente la instrucción de la tarea 2 ("la fecha, del mismo formateador. No se redefine ninguna aquí").
- `getCompanyDocumentForClient` y `getCompanyDocumentForEdit` comparten `resolveCompanyDocumentAssignment` y `buildHistoryEntry` (privados) en vez de duplicar la consulta dos veces: la única diferencia real entre ambas —el filtro de estatus del historial y la puerta de autorización— queda como la única línea que difiere en el diff.
- `saveCompanyDocumentDraft` gana un `revalidatePath` de la página del editor (no exigido explícitamente por el texto del plan para esta acción, pero consistente con `updateManualDocumentBody` del plan 03-04): sin él, el consultor no vería su propio guardado reflejado al volver a la página del documento.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `startCompanyDocumentDraft` valida `status === "VIGENTE"` antes de copiar**
- **Found during:** Tarea 1
- **Issue:** El plan describe la idempotencia (no crear un segundo borrador) pero no especifica qué pasa si `companyDocumentId` no apunta a la fila vigente actual (por ejemplo, una fila `OBSOLETO` pasada por error o por un id cacheado).
- **Fix:** Se añadió `if (row.status !== "VIGENTE") return { success: false, error: "Sólo se puede editar la versión vigente" }` antes del `$transaction`.
- **Files modified:** `apps/web/lib/actions/manual-document.ts`
- **Verification:** Cubierto por lectura de código; no ejercitado por el script de la tarea 3 (que siempre llama con la fila vigente correcta), como sí lo hará el plan 03-06 si la UI permite un id equivocado.
- **Committed in:** `3c64395` (parte del commit de tarea 1)

**2. [Rule 3 - Blocking/consistencia] `ISSUED_AT_FORMAT` exportado desde `document-identity.ts`**
- **Found during:** Tarea 2
- **Issue:** El plan exige que el historial de DOC-05 use "el mismo formateador" de fecha que `DocumentIdentity`, pero ese formateador era un `const` de módulo sin exportar — no había forma de reutilizarlo sin definir uno nuevo o exportarlo.
- **Fix:** Se le añadió `export` (sin cambiar su configuración) y se documentó en su comentario por qué se exporta.
- **Files modified:** `apps/web/lib/documents/document-identity.ts` (fuera del `files_modified` declarado en el frontmatter del plan, que sólo listaba las acciones y las consultas)
- **Verification:** `check-types` limpio, `lint` en 81 advertencias; `grep` confirma que `manual-document.ts` (queries) no redefine ninguna etiqueta ni formateador propio.
- **Committed in:** `520fb45` (parte del commit de tarea 2)

---

**Total deviations:** 2 auto-fixed (1 correctitud, 1 consistencia/blocking menor)
**Impact on plan:** Ambas son adiciones pequeñas y coherentes con el resto del plan; ninguna cambia el alcance de las cuatro acciones ni de las tres consultas. La segunda toca un archivo no listado en el frontmatter, documentado aquí para que quede explícito.

## Issues Encountered

- El wrapper local `rtk` (ajeno al proyecto) reescribe invocaciones de `grep` incluso dentro de un pipe, devolviendo salida con formato propio en vez de coincidencias reales — el mismo problema ya registrado en `STATE.md` desde el plan 02-04. Se resolvió anteponiendo `command grep` en todas las verificaciones de este plan. No es un problema del código de PROL.
- El patrón de verificación `sed -n '/export async function saveCompanyDocumentDraft/,/^}/p'` que sugiere el propio plan corta antes de tiempo: la firma de la función ocupa varias líneas y termina con `}): Promise<...> {`, cuya `}` inicial en columna 0 coincide con el patrón `^}` del `sed`, cortando el rango antes del cuerpo real de la función. Se confirmó por lectura directa que `sanitizeManualHtml` sí se invoca dentro de `saveCompanyDocumentDraft`. Es una limitación del comando de verificación sugerido, no del código.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Las cuatro acciones y las tres consultas que el plan 03-06 cablea a botones y el 03-07 pinta en pantalla ya existen, están tipadas, y su lógica de transacción está verificada contra la base real con los diez pasos del ciclo completo.
- Ningún bloqueo. La base local queda exactamente como el plan 03-06 la espera: `company_documents` vacía, dos evidencias de `form_snapshot` intactas, `P-RFC-4.1-01` en `templateVersion=1` con su cuerpo original, dos empresas con marca y dos activaciones.
- Pendiente explícito para el plan 03-06: ejercitar las cuatro acciones por la interfaz de verdad (no por script), en particular el criterio 3 (guardar dos veces deja una versión, publicar degrada la anterior) delante de un humano — este plan sólo demostró la forma de la transacción, como se advierte arriba.
- El guard añadido a `startCompanyDocumentDraft` (Deviation 1) no se ejercitó en la tarea 3 porque el script siempre llamó con la fila vigente correcta; si el plan 03-06 conecta el botón "Editar" a un id que no sea necesariamente el vigente, ese guard es lo que evita un borrador sin sentido — vale la pena tenerlo presente al cablear la UI.

---
*Phase: 03-procedimientos-nativos*
*Completed: 2026-09-02*

## Self-Check: PASSED

Los tres archivos modificados existen en disco con los cambios descritos, y los dos commits de tarea (`3c64395`, `520fb45`) están presentes en el historial de git. `company_documents` está en `0` filas y `evidences` con `form_snapshot` en `2`, confirmado contra la base real tras la limpieza del script de la tarea 3. `check-types` limpio, `lint` en 81 advertencias (0 errores), `build` verde, confirmados con los tres comandos ejecutados tras la tarea 3.
