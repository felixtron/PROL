---
phase: 03-procedimientos-nativos
plan: 07
subsystem: ui
tags: [next-rsc, server-components, client-of-record, live-render]

# Dependency graph
requires:
  - phase: 03-04
    provides: "DocumentIdentity resuelta (logo en vivo, razón social DC-3, código/nombre con overrides), isTemplateOutdated compartida"
  - phase: 03-05
    provides: "getCompanyDocumentForClient, listCompanyDocumentsForClient — contrato de servidor ya verificado contra la base real, historial sin borradores"
  - phase: 03-06b
    provides: "Datos reales de emisión en la base (Acme v2 VIGENTE/v1 OBSOLETO con sourceTemplateVersion=4, Constructora Delta v1 VIGENTE) — sin esto no había nada que renderizar aquí"
provides:
  - "Vista del cliente completa: /dashboard/documents (lista maestra) y /dashboard/documents/[companyDocumentId] (visor con identidad, cuerpo congelado y control de cambios)"
  - "DocumentIdentityHeader y DocumentChangeLog: los dos componentes de presentación que renderizan DocumentIdentity y el historial de DOC-05"
  - "Entrada de navegación 'Documentos' y enlace 'Ver documento' desde la página de sección para los procedimientos nativos"
  - "Demostración server-verified de que el logo se lee en vivo (cambiarlo re-renderiza sin tocar company_documents)"
affects: [03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DocumentIdentityHeader/DocumentChangeLog no hacen ningún `??`: la identidad llega ya resuelta desde buildDocumentIdentity (patrón renderCertificate), consistente con el resto del módulo documental."
    - "El visor devuelve notFound() en vez de propagar el error de autorización: getCompanyDocumentForClient(id).catch(() => null) cubre 'no existe' y 'es de otra empresa' con el mismo código de estado, para no filtrar qué documentos existen."

key-files:
  created:
    - apps/web/components/document-identity-header.tsx
    - apps/web/components/document-change-log.tsx
    - apps/web/app/dashboard/documents/page.tsx
    - apps/web/app/dashboard/documents/[companyDocumentId]/page.tsx
  modified:
    - apps/web/app/dashboard/layout.tsx
    - apps/web/app/dashboard/manuals/[assignmentId]/sections/[sectionId]/page.tsx

key-decisions:
  - "El checkpoint de la tarea 3 sí se ejerció esta vez: el usuario entró como Acme Corp y como Constructora Delta y comparó identidad, control de cambios y aviso de versión atrasada en pantalla, respondiendo literalmente 'LOS VI BIEN AVANZA'."
  - "La única parte del checkpoint que el usuario no pidió ejercitar —el cambio de logo en vivo sin re-emitir— se cerró aparte, server-verified por HTTP: login real, tres GET sucesivos a la misma URL, logo cambiado y restaurado, con md5(content_html) idéntico en los tres."
  - "DOC-04 se cierra con evidencia declarada por partes en REQUIREMENTS.md (aprobación humana para el render por-empresa, server-verified para el mecanismo de lectura en vivo) en vez de una sola etiqueta 'Complete' que mezclara ambas cosas."
  - "El scroll horizontal de la tabla del procedimiento en viewport estrecho no se reclama como verificado: el mecanismo CSS existe (manual-content.css), pero nadie lo vio scrollear."

requirements-completed: [DOC-04, DOC-05, DOC-07]

# Metrics
duration: "~15min (tareas 1-2, agente anterior, commits a las 12:32/12:35) + ~30min (cierre de esta continuación: demostración del logo en vivo por HTTP, gates, documentación)"
completed: 2026-09-02
---

# Phase 3 Plan 7: Vista del cliente — identidad, historial y aviso de versión Summary

**`/dashboard/documents` y el visor por documento ponen en pantalla la identidad resuelta de cada empresa (logo en vivo, razón social, código), el cuerpo congelado al emitir y la tabla de control de cambios generada sin redacción manual — aprobado por el usuario entrando como las dos empresas, con el mecanismo de logo-en-vivo cerrado aparte por HTTP con hashes reales.**

## Performance

- **Duration:** ~15 min (tareas 1-2, ejecutadas por el agente anterior; commits `d48bc5c` a las 12:32 y `f1b5185` a las 12:35) + ~30 min de esta sesión de continuación (demostración del logo en vivo sobre HTTP, re-verificación de gates, documentación). La espera de aprobación humana del checkpoint no es cronometrable.
- **Completed:** 2026-09-02T19:40:00Z (aprox.)
- **Tasks:** 3/3 (tarea 3 es de verificación humana; sin commit de código propio)
- **Files modified:** 6 (4 creados, 2 modificados)

## Accomplishments

- `DocumentIdentityHeader` pinta, en el orden en que se lee un documento controlado, el logo en vivo de la empresa (`<img src={identity.companyLogo}>`, sin data-URL, con su `eslint-disable-next-line @next/next/no-img-element`), la razón social, el código documental, el nombre, versión/estatus/fecha/norma, y el aviso ámbar de plantilla desactualizada redactado para no sugerir que el documento del cliente caducó.
- `DocumentChangeLog` genera las cinco columnas de DOC-05 (versión, fecha, autor, descripción del cambio, estatus) en tiempo de render desde el historial de `CompanyDocument`, resalta la fila vigente y pinta `—` cuando `notes` viene vacío; con historial vacío no pinta nada.
- `/dashboard/documents` lista el expediente vigente de la empresa del usuario (`listCompanyDocumentsForClient`, ya filtrado por `status: VIGENTE`), con estado vacío honesto y destino según arquetipo (descarga para `FILE`, visor para el resto).
- `/dashboard/documents/[companyDocumentId]` compone identidad + cuerpo congelado (`ManualContent`, el único `dangerouslySetInnerHTML` de negocio del proyecto) + control de cambios; devuelve `notFound()` tanto para IDs inexistentes como para documentos de otra empresa (el `catch` sobre `requireAssignmentMemberAccess`), y redirige a la descarga cuando la fila es de tipo `FILE`.
- La entrada "Documentos" aparece en el sidebar y en el móvil dentro del mismo condicional `showDocuments` que ya usaba "Manuales", con el icono `FileCheck2` (ya en la allowlist, sin tocar `nav-icons.ts`).
- La página de sección (`manuals/[assignmentId]/sections/[sectionId]/page.tsx`) ramifica por `own.kind`: "Ver documento" hacia el visor para los nativos, "Descargar" sin cambios para los de archivo.
- **El checkpoint de la tarea 3 se ejerció de verdad esta vez**: el usuario entró como `carlos.mendoza@gmail.com` (Acme) y como `lucia.delgado@constructoradelta.test` (Constructora Delta) y comparó en pantalla identidad, control de cambios y aviso de versión atrasada, respondiendo literalmente **"LOS VI BIEN AVANZA"**.
- **El cambio de logo en vivo —lo único que el checkpoint ofrecía sin que el usuario lo pidiera— se demostró aparte, server-verified por HTTP**, con hashes reales antes/durante/después y el logo restaurado (ver sección dedicada abajo).
- `check-types` limpio, `lint` en exactamente `81 problems (0 errors, 81 warnings)` (exit 1, sano y esperado), `build` verde con `/dashboard/documents` y `/dashboard/documents/[companyDocumentId]` en la salida.

## Task Commits

1. **Tarea 1: cabecera de identidad y tabla de control de cambios** - `d48bc5c` (feat)
2. **Tarea 2: lista maestra, visor del documento y los dos enlaces** - `f1b5185` (feat)
3. **Tarea 3: criterios 1, 2 y 4 en pantalla (checkpoint)** - sin commit propio (verificación humana + demostración por HTTP; ningún archivo de producción cambió durante el cierre de esta tarea)

**Plan metadata:** ver commit de este SUMMARY, hecho por separado.

## Files Created/Modified

- `apps/web/components/document-identity-header.tsx` (68 líneas) - cabecera de identidad, logo en vivo.
- `apps/web/components/document-change-log.tsx` (85 líneas) - tabla de control de cambios de DOC-05.
- `apps/web/app/dashboard/documents/page.tsx` (115 líneas) - lista maestra del expediente vigente.
- `apps/web/app/dashboard/documents/[companyDocumentId]/page.tsx` (72 líneas) - visor del documento.
- `apps/web/app/dashboard/layout.tsx` (+5 líneas) - entrada de nav "Documentos".
- `apps/web/app/dashboard/manuals/[assignmentId]/sections/[sectionId]/page.tsx` (+33/-8 líneas) - enlace "Ver documento" para nativos.

## Checkpoint de la tarea 3 — resolución

El orquestador presentó el recorrido completo de la tarea 3 (Acme: nav, lista, visor con logo/razón social/código/cuerpo/aviso de versión/control de cambios/sin borradores/enlace desde la sección; Constructora Delta: el mismo procedimiento con su propia identidad y versión). **El usuario respondió "LOS VI BIEN AVANZA"**, tras entrar como las dos empresas y comparar ambas vistas.

Lo que el usuario **sí** presenció en pantalla, y por tanto lo que respalda a DOC-04 (en su parte de render por-empresa), DOC-05 y DOC-07:
- La cabecera de identidad de Acme (logo, "Acme Corporation, S.A. de C.V.", código `P-RFC-4.1-01`, "Versión 2 · Vigente") y de Constructora Delta (su propio logo, "Constructora Delta, S.A. de C.V.", mismo código, "Versión 1 · Vigente").
- La tabla de control de cambios de Acme, con sus filas de historial.
- El aviso ámbar de plantilla desactualizada en ambas empresas.
- El enlace "Ver documento" desde la página de sección.

Lo que el usuario **no** pidió ejercitar y por tanto no está respaldado por observación humana:
- El cambio de logo en vivo sin re-emitir (paso C del `how-to-verify`) — cerrado aparte, ver abajo.
- El scroll horizontal de la tabla del procedimiento en viewport estrecho — el mecanismo CSS existe (`manual-content.css`, ya usado por las tablas de sección), pero nadie lo vio scrollear de verdad en esta sesión. No se reclama como verificado.

También se deja constancia, sin comentario del usuario sobre ello (lo cual **no** se interpreta como autorización para tocarlo): el cuerpo congelado `v2` de Acme conserva el texto de QA de la sesión 03-06b ("Borrador Acme, guardado #1 — verificación 03-06b"). Es contenido publicado y congelado — parte del rastro de evidencia de esa sesión — y se deja exactamente como está.

## Demostración del logo en vivo (server-verified, no presenciado por el usuario en navegador)

**Método.** Igual que 03-06b, esta demostración se hizo invocando el sistema real por HTTP —no un script que imite su forma— con sesión real, contra el servidor de desarrollo ya corriendo. A diferencia de 03-06b (server actions), aquí basta con un `GET` normal a una página de servidor: no hace falta el header `Next-Action` ni el manifest por ruta.

1. **Login real** como el usuario de Acme: `POST /api/auth/sign-in/email` con `carlos.mendoza@gmail.com` / `password123` → `200`, cookie `better-auth.session_token` capturada.
2. **GET #1** (logo original) a `/dashboard/documents/cmtkf762g0008rj61t0gwreno` (la fila `v2 VIGENTE` de Acme). `<img src>` extraído del HTML servido, `md5` = `ae1dff5bdc020cffed92df17042fd76d`. Razón social confirmada en el `alt`: "Acme Corporation, S.A. de C.V.". `content_html` de esa fila en ese momento: `md5` = `2148bb78b88c5f17e178401ac625893d`.
3. **`UPDATE companies SET logo = '<svg rojo, texto ZZ>' WHERE slug = 'acme-corp'`** — un SVG data-URI visiblemente distinto (rectángulo `#dc2626` en vez de `#16a34a`, texto "ZZ" en vez de "AC"), aplicado por `psql` vía stdin (no `-c` con interpolación, que no funciona en esta versión de `psql` para `:'var'`). **No se tocó `company_documents` en ningún momento.**
4. **GET #2** (mismo URL, sin re-emitir nada): el `<img src>` servido cambió a `md5` = `5dbb5ecc0b307df94d44908edb6bb4d6` — el SVG nuevo, byte a byte. `content_html` de la misma fila: **sigue en `md5` = `2148bb78b88c5f17e178401ac625893d`**, idéntico al paso 2. El documento se re-renderizó; no se regeneró.
5. **`UPDATE companies SET logo = '<svg original>' WHERE slug = 'acme-corp'`** — revertido al valor exacto capturado en el paso 2.
6. **GET #3**: el `<img src>` servido volvió a `md5` = `ae1dff5bdc020cffed92df17042fd76d` (idéntico al paso 2, confirmado por `diff` byte a byte). `content_html`: **sigue en `md5` = `2148bb78b88c5f17e178401ac625893d`**, sin moverse en ningún momento de los tres `GET`.

**Lo que esto establece:** cambiar `Company.logo` re-renderiza el documento servido sin tocar `company_documents.content_html` — la ventaja arquitectónica central sobre generar `.docx` — confirmado con hashes reales, no descrito de memoria. **Lo que esto NO establece:** que un humano lo haya visto recargar en un navegador. Se declara así en `REQUIREMENTS.md` para DOC-04.

Como comprobación adicional (no pedida por el plan, pero barata dado que ya había sesión abierta): se repitió el mismo `GET` autenticado como Constructora Delta sobre su propia fila (`cmtkf6gq40005rj61ri9wx2k9`), confirmando su propio logo (azul, "CD"), su razón social ("Constructora Delta, S.A. de C.V."), "Versión 1 · Vigente", y el mismo aviso de plantilla desactualizada. Cero apariciones de `BORRADOR` en los cuatro HTML capturados (Acme ×3, Delta ×1).

## Requisitos de la fase 3 que quedan cerrados con este plan

| # | Criterio de la fase (ROADMAP) | Estado | Evidencia |
|---|---|---|---|
| 1 | Dos empresas ven el mismo procedimiento, cada una con su logo/razón social/código | Cerrado | Usuario, en pantalla (checkpoint) |
| 2 | Editar la plantilla no altera lo emitido; ambas ven versión más reciente | Cerrado (ya en 03-06b para el snapshot; el aviso en pantalla, en este plan) | Usuario, en pantalla + hashes de 03-06b |
| 3 | Guardar dos veces deja una versión; publicar degrada la anterior | Cerrado en 03-06b | HTTP directo, 03-06b |
| 4 | El historial muestra versión/fecha/autor/descripción/estatus | Cerrado | Usuario, en pantalla (checkpoint) |
| 5 | La sección muestra el documento vigente, no el borrador de mayor versión | Cerrado en 03-02 | Ver `03-02-SUMMARY.md` |
| 6 | Un `.docx` real se importa y sus tablas sobreviven | Cerrado en 03-06b | HTTP directo, 03-06b |
| 7 | El código de la fase queda desplegado en producción | **Pendiente** | 03-08 |

DOC-04, DOC-05 y DOC-07 pasan a `Complete` en `REQUIREMENTS.md`, cada uno con su tipo de evidencia declarado por separado (ver la tabla de trazabilidad). El único criterio de la fase que sigue abierto es el 7 (despliegue), que es exactamente el alcance de 03-08.

## Decisions Made

- El checkpoint de la tarea 3 se ejerció de verdad: el usuario entró como las dos empresas y comparó identidad, historial y aviso de versión en pantalla — a diferencia del checkpoint de 03-06, que se había aprobado sin ejercitarse.
- La parte del checkpoint que el usuario no pidió ejercitar (el logo en vivo) no se dio por hecha ni se dejó pendiente sin más: se cerró aparte, server-verified por HTTP, con el mismo estándar de rigor que 03-06b — login real, hashes reales, sin fabricar evidencia con un script que imitara la forma del resultado esperado.
- DOC-04 se registra con evidencia mixta, declarada por partes, en vez de una sola etiqueta que mezclara "el usuario lo vio" con "el ejecutor lo verificó por HTTP" — son afirmaciones distintas y el lector de `REQUIREMENTS.md` necesita saber cuál respalda cuál.
- El texto de QA congelado en el cuerpo `v2` de Acme ("Borrador Acme, guardado #1 — verificación 03-06b") se deja intacto: es contenido publicado y parte del rastro de evidencia, no un descuido a limpiar.

## Deviations from Plan

### Auto-fixed Issues

Ninguna en el sentido de las Reglas 1-3: el código de las tareas 1-2 pasó sus verificaciones automatizadas sin ajustes, y el cierre de la tarea 3 no tocó código de producción.

### Hallazgos operativos de esta sesión (no deviaciones de código)

**1. `psql -c` no interpola variables `:'var'` en esta instalación** — la sintaxis de sustitución de psql (`-v nombre=valor` + `:'nombre'` en la consulta) falló con `syntax error at or near ":"` incluso en el caso trivial `SELECT :'foo';`. Se resolvió escribiendo el `UPDATE` completo a un archivo y pasándolo por `stdin` (`docker exec -i prol-db psql ... < archivo.sql`), evitando la interpolación por completo. Documentado aquí para quien repita una operación similar.

**2. Un proceso `next build` huérfano tenía el lock de `.next/lock`** — la primera ejecución de `pnpm exec turbo run build` de esta sesión falló con "Another next build process is already running" contra un proceso `next build` (PID 61349) que ya estaba corriendo por una razón ajena a esta sesión (visible en `ps aux` antes de mi propia invocación). El proceso terminó solo y liberó el lock segundos después; la segunda ejecución del mismo comando pasó limpia. No se mató ningún proceso a mano; se esperó a que se liberara solo.

**3. `gsd-tools state` reconstruye la sección YAML de `STATE.md` completa en cada escritura** (`writeStateMd` → `syncStateFrontmatter` → `buildStateFrontmatter`), y (a) recalcula `completed_plans` contando `-SUMMARY.md` en disco — por eso mi edición manual a `completed_plans: 15` se revirtió a `14` hasta que este mismo archivo existiera en disco; y (b) `reconstructFrontmatter` envuelve en comillas dobles cualquier valor que contenga `:` pero **no escapa comillas dobles internas**, así que un texto con `"LOS VI BIEN AVANZA"` entre comillas producía YAML inválido tras la siguiente escritura del CLI. Se evitó usando comillas simples (`'LOS VI BIEN AVANZA'`) en el texto de `Last activity`/`Stopped at`, y se validó el resultado parseando el frontmatter con PyYAML. No se tocó el propio `gsd-tools.cjs` — es una herramienta compartida fuera del alcance de este plan.

**4. La herramienta `roadmap update-plan-progress` y `state advance-plan` no operan sobre el formato de este proyecto** (confirmado, tal como advertía la instrucción de esta continuación): `advance-plan` falla porque `STATE.md` usa `Plan: N of M in current phase` en vez de campos separados `Current Plan:`/`Total Plans in Phase:`; `roadmap update-plan-progress` reporta éxito pero no modifica `ROADMAP.md` (confirmado por `git diff` vacío tras invocarlo en 03-06 y no reintentado aquí). Ambos se cerraron a mano.

---

**Total deviations:** 0 de código (Reglas 1-3); 4 hallazgos operativos documentados, ninguno con impacto en el producto.
**Impact on plan:** Ninguno sobre el código entregado por las tareas 1-2. El impacto real es sobre el procedimiento de cierre de esta continuación, documentado arriba para que no se repita a ciegas.

## Issues Encountered

- **El working tree tiene cambios sin commitear ajenos a este plan** (`apps/web/app/dashboard/company/page.tsx`, `apps/web/app/dashboard/dc3/*`, `apps/web/components/dc3-*`, `apps/web/lib/actions/dc3.ts`, `apps/web/lib/dc3/*`, `apps/web/lib/queries/dc3.ts`, `packages/db/prisma/schema.prisma`, `packages/db/prisma/seed.ts`, `packages/db/package.json`, y dos rutas nuevas sin trackear bajo `dashboard/dc3/empresa/` y `seed-training-agent.ts`) — visibles ya en el primer `git status` de esta sesión, indicando trabajo concurrente de otra sesión sobre el mismo working tree (`branching_strategy: "none"`). **No se tocó, no se hizo stash, no se incluyó en ningún `git add`** de esta sesión: los commits de esta continuación (ninguno de código; sólo el de metadata al final) sólo añaden los archivos de documentación de este plan (`REQUIREMENTS.md`, `STATE.md`, `ROADMAP.md`, este `SUMMARY.md`). Se deja constancia aquí para que quien retome no lo confunda con una regresión de este plan.
- Ya conocido de sesiones previas: el wrapper local `rtk` reescribe `grep` en tuberías; se evitó pasándole patrones simples y confirmando conteos con `wc -l`/consultas SQL directas donde importaba precisión.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **La fase 3 tiene 6 de sus 7 criterios cerrados.** Sólo queda el 7 (despliegue a producción con el módulo apagado, arrastrando el arreglo del 401 `5e2352d` que sigue sin desplegar) — exactamente el alcance de `03-08-PLAN.md`.
- **Base de datos dejada intacta a propósito** para que 03-08 la use como referencia: `companies`=2, `evidences.form_snapshot` no nulo=2, `company_documents` con Acme en `v2 VIGENTE`/`v1 OBSOLETO` y Constructora Delta en `v1 VIGENTE`, `P-RFC-4.1-01.template_version=6`. El logo de Acme quedó **restaurado a su valor original** tras la demostración (confirmado por `md5` = `d147ae82cce4cee4fa4582cd4da36246`, igual que antes de esta sesión).
- **El servidor de desarrollo (`pnpm --filter @prol/web dev`, puerto 3000) se deja corriendo**, tal como pedía esta continuación.
- **Advertencia operativa para quien siga**: hay cambios sin commitear en el working tree que no pertenecen a esta fase (ver "Issues Encountered"). No bloquean 03-08 porque el despliegue canónico usa `git archive` sobre el commit desplegado, no el working tree — pero conviene que quien ejecute 03-08 lo sepa antes de tocar `git status` a ciegas.

---
*Phase: 03-procedimientos-nativos*
*Completed: 2026-09-02*

## Self-Check: PASSED

Los cuatro archivos de UI creados en las tareas 1-2 existen en disco (`document-identity-header.tsx`, `document-change-log.tsx`, `documents/page.tsx`, `documents/[companyDocumentId]/page.tsx`), y los dos commits de tarea (`d48bc5c`, `f1b5185`) están en el historial de git. `check-types` limpio, `lint` en 81 advertencias (0 errores, exit 1 esperado) y `build` verde se re-ejecutaron en esta sesión de cierre y confirmaron los mismos resultados. La demostración del logo en vivo se verificó con `md5` real en cada uno de los tres `GET` (no un resumen post-hoc): logo original `ae1dff5b...`, logo cambiado `5dbb5ecc...`, logo revertido `ae1dff5b...` de nuevo (`diff` byte a byte contra el original, sin diferencia), y `content_html` en `2148bb78b88c5f17e178401ac625893d` en los tres momentos, confirmado por consulta directa a `prol-db` después de cada `GET`. El logo de Acme en la base quedó confirmado en su valor original (`md5` `d147ae82cce4cee4fa4582cd4da36246`) al cierre de la sesión. La línea base (`companies`=2, `evidences.form_snapshot` no nulo=2, `company_documents` con la forma Acme v2 VIGENTE/v1 OBSOLETO + Delta v1 VIGENTE, `template_version`=6) se reconfirmó contra la base real antes de escribir este documento. El servidor de desarrollo sigue corriendo en el puerto 3000.
