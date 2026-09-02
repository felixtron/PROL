---
phase: 03-procedimientos-nativos
plan: 06
subsystem: ui
tags: [next-rsc, server-actions, client-components, docx-import, tailwind]

# Dependency graph
requires:
  - phase: 03-04
    provides: "DocumentIdentity, updateManualDocumentBody, getManualDocumentForEdit, DOCUMENT_STATUS_LABEL/CLASS, DOCUMENT_KIND_LABEL"
  - phase: 03-05
    provides: "issueCompanyDocument, startCompanyDocumentDraft, saveCompanyDocumentDraft, publishCompanyDocument, getCompanyDocumentForEdit — todas verificadas contra la base real por script, pendientes de ejercitarse por la interfaz"
  - phase: 03-03
    provides: "POST /api/upload/document-body (.docx → HTML saneado, con droppedImages/warnings)"
provides:
  - "DocumentBodyEditor: un solo editor de cuerpo HTML, parametrizado por target (plantilla / borrador de empresa), con importador de .docx, mensaje de guardado que distingue 'sin cambios' de 'pasa a la versión N', y botón Publicar para el destino de empresa"
  - "/tenant-admin/manuals/[id]/documents/[documentId]/: página del documento con editor, importador y panel de empresas"
  - "DocumentCompaniesPanel: una fila por empresa con estado de emisión, acciones emitir/editar/continuar-borrador/re-emitir"
  - "/tenant-admin/manuals/[id]/documents/[documentId]/companies/[assignmentId]/: editor del borrador de una empresa con historial de control de cambios"
  - "Catálogo del manual: enlace 'Redactar' por fila y selector de arquetipo (Archivo/Procedimiento) al crear"
affects: [03-07, 03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prop discriminada `target: {kind:'template'}|{kind:'company', version, initialNotes}` para que un único componente de cliente decida, con un switch, cuál de dos server actions estáticamente importadas invocar — sin pasar funciones por props."
    - "El botón Publicar vive dentro del mismo DocumentBodyEditor (no en un componente aparte bajo companies/[assignmentId]/) porque reutiliza el target.version y el confirm() ya resueltos por el editor; un componente separado habría duplicado ese estado para un solo botón. Aceptado por el usuario en el checkpoint de la tarea 3 como desviación del layout literal del plan."

key-files:
  created:
    - apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/document-body-editor.tsx
    - apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/page.tsx
    - apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/document-companies-panel.tsx
    - apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/companies/[assignmentId]/page.tsx
  modified:
    - apps/web/app/tenant-admin/manuals/[id]/manual-documents.tsx
    - apps/web/lib/queries/manual.ts

key-decisions:
  - "Publicar se cableó dentro de document-body-editor.tsx junto a 'Guardar borrador', no en un archivo aparte bajo companies/[assignmentId]/ como sugería la lectura literal del plan — puesto a la vista del usuario en el checkpoint y no objetado."
  - "La evidencia de base de datos pedida para cerrar la tarea 3 no aparece: se documenta tal cual, sin reescribir el resultado esperado (ver 'Hallazgo central de esta ejecución')."
  - "DOC-01, DOC-02, DOC-03 y DOC-06 NO se marcan Complete en REQUIREMENTS.md pese a la instrucción de cierre recibida, porque la evidencia de base que se pidió capturar contradice la premisa de esa instrucción."
  - "[03-06b] El usuario confirmó llanamente que aprobó el checkpoint sin ejercitarlo. La brecha se cerró invocando las cinco server actions reales por HTTP directo (Next-Action + cookie de sesión real), no repitiendo el checkpoint humano ni fabricando filas con un script que imite su forma — ver 'Cierre de la brecha (03-06b)'."
  - "[03-06b] DOC-01, DOC-02, DOC-03 y DOC-06 pasan a Complete en REQUIREMENTS.md: los ocho pasos del recorrido (editar, sin-cambios, editar de nuevo, importar .docx con tabla combinada, emitir a dos empresas, editar plantilla sin mover lo congelado, borrador único e idempotente, publicar con degradación) se verificaron contra la base real, con el invariante de una sola VIGENTE reverificado en tres puntos de control."

requirements-completed: [DOC-01, DOC-02, DOC-03, DOC-06]

# Metrics
duration: ~40min (incluye tareas 1-2 y el cierre de la tarea 3; la espera de aprobación humana no es cronometrable)
completed: 2026-09-02
---

# Phase 3 Plan 6: UI del consultor — editor, importador y emisión por empresa Summary

**Editor de cuerpo único (`DocumentBodyEditor`) parametrizado por destino, importador `.docx` con vista previa antes de guardar, y panel de empresas con el ciclo emitir/editar/publicar cableado a botones reales — con un hallazgo central: la base de datos no contiene ningún rastro de que el ciclo se haya ejercitado, pese a que el checkpoint fue aprobado.**

## Performance

- **Duration:** ~40 min de trabajo activo (tareas 1 y 2, ~20 min entre las 11:41 local de los dos commits de código; cierre de la tarea 3, ~20 min de esta sesión de continuación). La espera de aprobación humana del checkpoint no es cronometrable.
- **Completed:** 2026-09-02T18:05:00Z (aprox.)
- **Tasks:** 3/3 (tarea 3 es de verificación humana, sin cambios de código propios)
- **Files modified:** 6 (4 creados, 2 modificados)

## Accomplishments

- `DocumentBodyEditor` es un único componente de cliente, calcado de la maqueta `section-content-editor.tsx`, con una prop discriminada `target` que decide entre `updateManualDocumentBody` (plantilla) y `saveCompanyDocumentDraft`/`publishCompanyDocument` (borrador de empresa) — los tres imports son estáticos, sin paso de acciones por props.
- El mensaje de guardado distingue explícitamente "Sin cambios: el contenido es el mismo que ya estaba guardado" de "Guardado. La plantilla pasa a la versión N" — la política de versión de `updateManualDocumentBody` (03-04) ahora es visible en pantalla, no sólo en el contrato de servidor.
- El importador de `.docx` sube a `/api/upload/document-body`, vuelca el HTML en el textarea sin guardarlo y cambia a vista previa automáticamente, pide confirmación si el textarea ya tenía contenido, y avisa cuántas imágenes se descartaron — exactamente el flujo que especifica el plan.
- La página del documento (`/tenant-admin/manuals/[id]/documents/[documentId]/`) valida que el documento pertenece al manual de la URL (`data.manual.id !== id` → `notFound()`), muestra arquetipo y versión de plantilla, y avisa cuando un documento `FILE` sin cuerpo está a punto de convertirse en `PROCEDIMIENTO` al guardar.
- El catálogo del manual (`manual-documents.tsx`) enlaza "Redactar" en cada fila —incluidas las de tipo `FILE`, que es el camino de conversión—, y el alta ofrece únicamente los arquetipos Archivo y Procedimiento (`REGISTRO` no aparece; confirmado por grep, 0 coincidencias).
- `DocumentCompaniesPanel` pinta, por empresa, el estado de emisión (sin emitir / vigente con su plantilla de origen / desactualizada / con borrador) usando `DOCUMENT_STATUS_LABEL`/`DOCUMENT_STATUS_CLASS` del módulo puro, y ofrece Emitir, Editar, Continuar borrador y Re-emitir según corresponda, con el botón Emitir apagado (`disabled`, con `title`) cuando el documento no tiene cuerpo.
- `companies/[assignmentId]/page.tsx` resuelve el borrador vigente de ese par (documento, empresa) y **redirige** de vuelta a la página del documento si no hay borrador — no lo crea por sorpresa. Muestra el historial completo de control de cambios (versión, fecha, autor, descripción, estatus), el mismo que verá el cliente en 03-07.
- El botón **Publicar** vive dentro de `DocumentBodyEditor` en vez de en un componente aparte, con `confirm()` describiendo exactamente el efecto ("La versión N pasa a vigente y la N-1 queda obsoleta"). Esta desviación del layout literal del plan se puso a la vista del usuario en el checkpoint y no fue objetada — ver "Decisions Made".
- `check-types` limpio, `lint` en exactamente `81 problems (0 errors, 81 warnings)` (sale con exit 1, comportamiento sano y esperado), `build` verde con las dos rutas nuevas listadas (`documents/[documentId]` y `documents/[documentId]/companies/[assignmentId]`).

## Task Commits

1. **Tarea 1: editor de cuerpo, importador y página del documento** - `39d82b4` (feat)
2. **Tarea 2: panel de empresas y editor del borrador por empresa** - `11c8b35` (feat)
3. **Tarea 3: criterios 3 y 6 en pantalla (checkpoint)** - sin commit propio (verificación humana pura; ningún archivo de producción cambió durante el cierre de esta tarea)

**Plan metadata:** ver commit de este SUMMARY, hecho por separado.

## Files Created/Modified

- `apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/document-body-editor.tsx` (314 líneas) - editor único parametrizado por `target`.
- `apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/page.tsx` (109 líneas) - página del documento: cabecera, editor, panel de empresas.
- `apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/document-companies-panel.tsx` (293 líneas) - panel de empresas con las acciones del ciclo de vida.
- `apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/companies/[assignmentId]/page.tsx` (129 líneas) - editor del borrador de una empresa, con historial.
- `apps/web/app/tenant-admin/manuals/[id]/manual-documents.tsx` (321 líneas tras el cambio) - enlace "Redactar", selector de arquetipo, columna de arquetipo/versión.
- `apps/web/lib/queries/manual.ts` - `getManualForEdit` añade `kind`/`templateVersion` al select del catálogo (6 líneas, único cambio de este archivo; `_count.companyDocuments` sigue sin filtrar).

## Checkpoint de la tarea 3 — resolución

El orquestador presentó al usuario el recorrido completo (A: redactar y guardar dos veces; B: importar un `.docx`; C: emitir a Acme Corp y Constructora Delta; D: el bucle de borrador — guardar dos veces, publicar, comprobar que Delta no se mueve). **El usuario respondió "aprobado".**

También se le puso delante la desviación de diseño encontrada durante la tarea 2: el botón **Publicar** vive dentro de `document-body-editor.tsx` junto a "Guardar borrador", no en un archivo aparte bajo `companies/[assignmentId]/` como una lectura literal del plan podría sugerir. No fue objetada. La razón técnica: `Publicar` reutiliza el `target.version` y el `confirm()` que el propio editor ya resuelve para el borrador de empresa; separarlo en otro componente cliente habría exigido duplicar ese estado (versión actual, mensaje de confirmación) para un único botón.

## Hallazgo central de esta ejecución: la base de datos no muestra el recorrido aprobado

El plan pide, textualmente, capturar la evidencia de base tras la aprobación y **"si no coincide con lo que describe el checkpoint, decirlo con todas sus letras en vez de redactar el resultado esperado"**. Esto es lo que se encontró:

```
$ docker exec prol-db psql -U prol -d prol -Atc \
  "select c.slug||' v'||d.version||' '||d.status from company_documents d \
   join companies c on c.id=d.company_id order by c.slug, d.version;"
(sin filas)

$ docker exec prol-db psql -U prol -d prol -Atc "select count(*) from company_documents;"
0

$ docker exec prol-db psql -U prol -d prol -Atc \
  "select id, code, name, kind, template_version from manual_documents where code like 'P-RFC%';"
cmtkadnwq000d12kpez4bm5vl|P-RFC-4.1-01|Procedimiento de control de documentos|PROCEDIMIENTO|1
```

**Lo esperado según el checkpoint** era: Acme Corp en `v1 OBSOLETO` + `v2 VIGENTE`, Constructora Delta en `v1 VIGENTE`, y `P-RFC-4.1-01` en `template_version = 2` (subida en el paso A2). **Lo que hay en la base es exactamente el punto de partida que dejó el plan 03-05**: `company_documents` vacía, plantilla en `template_version = 1` con su `contentHtml` original (verificado leyendo los primeros 300 caracteres: es el texto "Objetivo / Establecer el método..." de la fixture, no un párrafo editado).

**Se descartó que fuera un reseteo de la base**, no un simple vacío coincidental:
- El contenedor `prol-db` lleva corriendo sin reinicios desde `2026-09-01T18:55:26Z` (`RestartCount: 0`), con un volumen Docker persistente (`prol_prol_pgdata`), no un tmpfs.
- Las dos empresas siguen con sus fechas de creación originales y separadas por casi un día completo (`Acme Corp: 2026-09-01 18:56:47`, `Constructora Delta: 2026-09-02 16:04:14`) — un `tenant.deleteMany()` de un reseed las habría recreado a ambas en el mismo instante, y no lo están.
- Las dos filas de `evidences` con `form_snapshot` no nulo (el banco de regresión de la fase 1) siguen siendo exactamente 2, y hay exactamente 2 `companies` — coherente con que nadie tocó `tenant.deleteMany()`.

Es decir: **la base es genuina y no fue reseteada; simplemente no contiene ningún rastro de los pasos A–D del checkpoint.** No se puede saber desde aquí si el usuario probó el flujo en una sesión que luego no persistió por algún motivo, o si aprobó tras revisar el código y la interfaz sin completar los 16 pasos uno por uno. Lo que sí se puede afirmar con evidencia: ni el guardado de la plantilla (A2), ni la importación (B), ni la emisión a ninguna empresa (C), ni el ciclo de borrador (D) dejaron una fila o un cambio de versión en esta base de datos local.

**Esto no es un juicio sobre si la interfaz funciona** — las cuatro server actions ya están verificadas contra la base real por el plan 03-05 con la forma exacta de sus transacciones, y las comprobaciones automatizadas de las tareas 1 y 2 (grep de wiring, `check-types`, `lint`, `build`) pasan limpias. Es, específicamente, que **la evidencia funcional de extremo a extremo que el criterio 3 y el criterio 6 de este plan piden — alguien viendo el ciclo completo en pantalla y la base reflejándolo — no quedó registrada**, y por eso no se redacta como si lo estuviera.

### Invariante de "una sola VIGENTE" (verificación)

Con `company_documents` en 0 filas, el invariante se sostiene trivialmente (no hay pares `(document_id, company_id)` con ninguna fila, así que tampoco puede haber dos `VIGENTE`). Esto **no es una demostración positiva** del invariante bajo carga real — esa demostración es la que el plan 03-05 ya hizo por script (diez pasos) y la que este plan debía repetir por interfaz sin conseguirlo.

### Fixture de regresión de la fase 1 (confirmado intacto)

- `companies`: **2** filas (Acme Corp, Constructora Delta) — correcto.
- `evidences` con `form_snapshot` no nulo: **2** filas — correcto, banco de pruebas de la fase 1 sin tocar.

## Cierre de la brecha (03-06b): recorrido real por HTTP contra las server actions

**Contexto.** El checkpoint de la tarea 3 se aprobó ("aprobado") sin haberse ejercitado — el propio usuario lo confirmó llanamente después de que este SUMMARY documentara que la base no mostraba rastro alguno del recorrido. Esta sección registra la sesión de continuación (03-06b) que cierra esa brecha: **no** repitiendo el checkpoint humano (el usuario no clicó nada), sino invocando las cinco server actions reales — las mismas que invocaría el navegador — directamente por HTTP, con sesión real, sobre el servidor de desarrollo ya corriendo. Es una verificación de extremo a extremo distinta a un recorrido por navegador, y esa distinción se deja explícita aquí porque importará a quien lea esto después.

**Método.** Las cinco acciones (`updateManualDocumentBody`, `issueCompanyDocument`, `startCompanyDocumentDraft`, `saveCompanyDocumentDraft`, `publishCompanyDocument`, todas en `lib/actions/manual-document.ts`) se invocaron con `POST` a la URL de la página que las registra, cabecera `Next-Action: <id>`, `Content-Type: text/plain;charset=UTF-8`, `Origin: http://localhost:3000`, cuerpo = array JSON de argumentos, y la cookie `better-auth.session_token` obtenida de `POST /api/auth/sign-in/email` con `admin@prol.prosuite.pro` (ADMIN, tenant Academia Digital MX, `documentsEnabled=true`). Los IDs de acción del groundwork inicial (leídos de `.next/server/server-reference-manifest.json`) dieron **404 "Server action not found"** (`x-nextjs-action-not-found: 1`) contra el proceso `next dev` real — ese manifest no correspondía al proceso vivo (Turbopack, dev). Los IDs correctos se encontraron en el manifest específico de la ruta, `.next/dev/server/app/tenant-admin/manuals/[id]/documents/[documentId]/page/server-reference-manifest.json`, que sí refleja el servidor en ejecución. Se documenta como hallazgo operativo para quien repita esto: el manifest global de `.next/server/` no es fiable en modo dev con Turbopack; hay que leer el manifest por ruta.

**Recorrido paso a paso (valores reales, no esperados):**

1. **Guardar (primera llamada real).** Se reconstruyó el argumento a partir de una lectura por `psql -Atc` del `content_html` ya guardado; esa lectura añadió un salto de línea final que el valor en base no tenía (artefacto de cómo se capturó el dato, no del sanitizador). Resultado real: `{"success":true,"changed":true,"templateVersion":2,"kind":"PROCEDIMIENTO"}`. No fue la edición deliberada buscada, pero es una invocación real y se documenta tal cual — ver "Hallazgo metodológico" abajo.
2. **Reenviar el mismo contenido** (ahora sí, capturado literal tras el paso 1): `{"success":true,"changed":false,"templateVersion":2,"kind":"PROCEDIMIENTO"}`. `template_version` en la base: **2**, sin moverse. Política de "sin cambios" confirmada contra la acción real.
3. **Edición deliberada** (un párrafo real añadido bajo "Alcance"): `{"success":true,"changed":true,"templateVersion":3,"kind":"PROCEDIMIENTO"}`. Verificado: `content_html LIKE '%Verificación 03-06b%'` → `t`.
4. **Importar el `.docx` de prueba** vía `POST /api/upload/document-body` (multipart real, archivo genuino en el scratchpad). La respuesta trajo una tabla con una celda combinada real (`colspan="2"`, fila "1 — Emisión inicial (celda combinada)"). Ese HTML se guardó con `updateManualDocumentBody`: `{"success":true,"changed":true,"templateVersion":4,"kind":"PROCEDIMIENTO"}`. Confirmado por consulta directa: `content_html` en `manual_documents` contiene la tabla completa con `colspan="2"`.
5. **Emitir a las dos empresas** (`issueCompanyDocument`, una llamada real por empresa): Acme → `{"success":true,"companyDocumentId":"cmtkf6glu0002rj61d2chg6g3","version":1}`; Constructora Delta → `{"success":true,"companyDocumentId":"cmtkf6gq40005rj61ri9wx2k9","version":1}`. Consulta real:
   ```
   acme-corp           | v1 | VIGENTE | sourceTemplateVersion=4 | matches_current_template=t
   constructora-delta  | v1 | VIGENTE | sourceTemplateVersion=4 | matches_current_template=t
   ```
6. **Editar la plantilla otra vez** (párrafo real añadido): `{"success":true,"changed":true,"templateVersion":5,"kind":"PROCEDIMIENTO"}`. Releídas las dos filas de empresa:
   ```
   acme-corp           | v1 | VIGENTE | sourceTemplateVersion=4 | matches_current_template=f | md5=fe1dd6d29b4a0c7140c96e70cc6f961e
   constructora-delta  | v1 | VIGENTE | sourceTemplateVersion=4 | matches_current_template=f | md5=fe1dd6d29b4a0c7140c96e70cc6f961e
   ```
   `matches_current_template=f` es lo correcto (la plantilla ya cambió); los dos `md5` son idénticos entre sí **y** a los del paso 5 — ninguna de las dos filas cambió un byte tras la edición. **DOC-03 verificado contra la acción real, no contra una réplica de su forma.**
7. **Bucle de borrador en Acme.** `startCompanyDocumentDraft` sobre la fila `v1 VIGENTE` de Acme → `{"success":true,"draftId":"cmtkf762g0008rj61t0gwreno","version":2}`. Repetida la misma llamada: **misma respuesta exacta** (idempotente, no crea `v3`). `saveCompanyDocumentDraft` invocada dos veces con contenido distinto cada vez → `{"success":true}` ambas veces. Consulta tras las dos:
   ```
   cmtkf6glu0002rj61d2chg6g3 | v1 | VIGENTE
   cmtkf762g0008rj61t0gwreno | v2 | BORRADOR
   ```
   Sigue existiendo **una sola** fila `BORRADOR`, y su `content_html` contiene tanto "guardado #1" como "guardado #2" — las dos ediciones se acumularon en sitio, sin crear versión nueva.
8. **Publicar.** `publishCompanyDocument` sobre el borrador de Acme → `{"success":true,"version":2}`. Estado final real de `company_documents`:
   ```
   acme-corp           | cmtkf6glu0002rj61d2chg6g3 | v1 | OBSOLETO | sourceTemplateVersion=4
   acme-corp           | cmtkf762g0008rj61t0gwreno | v2 | VIGENTE  | sourceTemplateVersion=4
   constructora-delta  | cmtkf6gq40005rj61ri9wx2k9 | v1 | VIGENTE  | sourceTemplateVersion=4
   ```
   Constructora Delta: misma fila, mismo estatus, sin tocar.

**Invariante ("como mucho una VIGENTE por documento+empresa").** Reverificado después del paso 5, del paso 6 y del paso 8 con `GROUP BY document_id, company_id HAVING COUNT(*) FILTER (WHERE status='VIGENTE') > 1` (equivalente): **cero infracciones en los tres puntos de control**, no sólo al final.

### Lo que este recorrido SÍ establece

- Las cinco server actions y `POST /api/upload/document-body` funcionan de extremo a extremo invocadas de verdad — misma ruta HTTP, misma cookie de sesión, mismo header `Next-Action` que usaría el navegador ejecutando el código ya escrito de `document-body-editor.tsx` / `document-companies-panel.tsx` — no una réplica de su forma.
- Los ocho criterios de negocio de DOC-01/02/03/06 (la versión sube con un cambio real, se queda igual sin cambios, la tabla con celda combinada sobrevive el saneado, el cuerpo se congela al emitir y no se mueve cuando la plantilla cambia después, el borrador es único e idempotente, guardar dos veces no versiona, publicar promueve y degrada en el orden correcto, la empresa que no se toca no se mueve) se sostienen contra la base real.
- El invariante de una sola `VIGENTE` por (documento, empresa) se sostuvo en cada punto de control, no sólo trivialmente por ausencia de filas como en el cierre original.

### Lo que este recorrido NO establece

- **No es una verificación de la interfaz visual.** No se hizo clic en ningún botón, no se vio ningún `confirm()`, no se comprobó que el mensaje en pantalla ("Guardado. La plantilla pasa a la versión N") aparezca de verdad — sólo que la acción de servidor que ese botón invoca produce el resultado correcto cuando se invoca exactamente como la invocaría el navegador.
- No se ejercitó el importador de `.docx` en su forma de interfaz (vista previa antes de guardar, aviso de imágenes descartadas en pantalla) — sólo la llamada real a `/api/upload/document-body` y el guardado real subsecuente.
- **DOC-04, DOC-05 y DOC-07 siguen sin interfaz de cliente** — eso sigue siendo alcance de 03-07. Este recorrido generó los datos reales que 03-07 necesita para demostrar esos tres criterios cuando se construya, pero no construyó ni tocó esa vista.
- Ninguna de las cinco acciones toma `FormData`, así que el caso de invocación multipart de la guía no aplicó a ellas (sólo a la subida del `.docx`, que sí es multipart real).

### Hallazgo metodológico (no un bug de producto)

Al reconstruir el argumento de la primera llamada a partir de una lectura por `psql -Atc` del `content_html` guardado, el texto capturado traía un salto de línea final que el valor real en base no tenía. La primera llamada, pensada como "reenviar exactamente lo mismo" para probar la ruta antes de arriesgar una edición real, en realidad sí contaba como cambio y subió `template_version` de 1 a 2 antes de la edición deliberada del paso 3. Se documenta en vez de descartarse: confirma que la comparación de `updateManualDocumentBody` es sensible a bytes, no a "se ve igual" — coherente con su propio comentario en el código ("comparar el saneado con el guardado, no el crudo con el guardado"). No es un bug de la acción: es mi primer intento de reproducir "sin cambios" el que no lo era. El paso 2 sí lo hizo bien y confirmó la política.

### Gates re-verificados tras el recorrido

```
pnpm exec turbo run check-types   → 8/8 cacheados, limpio
pnpm exec turbo run lint          → ✖ 81 problems (0 errors, 81 warnings), exit 1 (mismo resultado que en el cierre original)
pnpm exec turbo run build         → verde, cacheado, mismas rutas
```
Ningún archivo de código de producción cambió en esta sesión — todo el recorrido fue HTTP contra el servidor de desarrollo ya corriendo — por eso los tres gates salen de caché con el mismo resultado que en el cierre original de este plan.

### Fixture de regresión de la fase 1 (reconfirmado tras el recorrido)

```
companies:                                    2 filas
evidences con form_snapshot no nulo:          2 filas
prol-db StartedAt / RestartCount:             2026-09-01T18:55:26Z / 0
```
Idénticos a los que documentó el cierre original de este plan — este recorrido sólo agregó tres filas a `company_documents` y subió `template_version` de 1 a 5; no tocó nada del banco de regresión de la fase 1.

### Estado final real de la base (2026-09-02, tras 03-06b) — se deja tal cual, no se revierte

```
manual_documents: P-RFC-4.1-01, template_version=5

company_documents:
  acme-corp           | v1 | OBSOLETO | sourceTemplateVersion=4
  acme-corp           | v2 | VIGENTE  | sourceTemplateVersion=4  (contenido del borrador publicado)
  constructora-delta  | v1 | VIGENTE  | sourceTemplateVersion=4  (idéntico byte a byte al v1 obsoleto de Acme)
```

Estas filas son la evidencia de este cierre y los datos que 03-07 necesita para demostrar sus propios criterios — se dejan en la base a propósito, no se limpian.

## Verificación cruzada

```
pnpm exec turbo run check-types   →  8/8 tareas, limpio
pnpm exec turbo run lint          →  ✖ 81 problems (0 errors, 81 warnings), exit 1 (sano, esperado)
pnpm exec turbo run build         →  verde; /tenant-admin/manuals/[id]/documents/[documentId]
                                      y .../companies/[assignmentId] aparecen en la salida
```

`dangerouslySetInnerHTML`: la búsqueda ahora devuelve **2** coincidencias, no 1 — `components/manual-content.tsx` (la de siempre) y `components/tenant-theme.tsx:47` (inyección de `--primary-color`/`--accent-color` del tenant como `<style>`). La segunda es **preexistente**, del commit `d138d05` ("Branding: aplicar primaryColor/accentColor del tenant en CSS"), anterior a toda la fase 3 — no la introdujo este plan ni ninguno de los anteriores de esta fase. El grep de verificación del plan (`una sola coincidencia`) ya estaba desactualizado antes de que empezara esta fase; se documenta aquí para que nadie lo lea como una regresión de este plan.

## Decisions Made

- El botón **Publicar** se dejó dentro de `document-body-editor.tsx` (junto a "Guardar borrador") en vez de moverlo a un archivo aparte bajo `companies/[assignmentId]/`: reutiliza `target.version` y el `confirm()` que el editor ya resuelve; un componente separado habría duplicado ese estado para un solo botón. Puesto a la vista del usuario en el checkpoint, no objetado.
- **No se marcan DOC-01, DOC-02, DOC-03 ni DOC-06 como `Complete` en `REQUIREMENTS.md`**, pese a que las instrucciones de cierre de esta continuación lo autorizaban ("la UI existe y el usuario la ejerció... cerrables"). La premisa de esa autorización —que el usuario ejerció el flujo— queda contradicha por la base de datos vacía documentada arriba. Cerrar el requisito exige poder decir qué evidencia lo cierra; aquí la evidencia pedida no existe, así que se mantienen `Pending` con una nota que registra exactamente este hallazgo, en el mismo estilo de "advertencia de precisión" que ya usan las entradas de DOC-03/05/06 desde el plan 03-05.
- No se fabricó evidencia ejecutando un script que invocara las server actions directamente para dejar la base "como se esperaba". Habría sido indistinguible, en el historial, de una verificación real por interfaz — y el punto entero de la tarea 3 es que no lo sea.

## Deviations from Plan

### Auto-fixed Issues

Ninguna en el sentido de las Reglas 1-3 (ningún bug, funcionalidad crítica faltante ni bloqueo encontrado en el código de las tareas 1-2; ambas pasaron sus verificaciones automatizadas sin ajustes).

### Cierre de documentación distinto al instruido

**1. [Fidelidad a la evidencia] Los requisitos DOC-01/02/03/06 no se cierran pese a la instrucción de la continuación**
- **Found during:** Cierre de la tarea 3 (captura de evidencia de base de datos)
- **Issue:** Las instrucciones de esta continuación asumían que "el usuario ejerció el flujo" y autorizaban cerrar cuatro requisitos sobre esa base. La consulta a la base real contradice la premisa (ver "Hallazgo central" arriba).
- **Fix:** Se documenta el hallazgo íntegro y se deja `REQUIREMENTS.md` en `Pending` para los cuatro, con la nota exacta de por qué.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** Consulta repetida contra `prol-db` (contenedor sin reinicios, volumen persistente); ver sección de hallazgo.
- **Committed in:** commit de metadata de este plan (ver más abajo)

---

**Total deviations:** 1 (de fidelidad documental, no de código)
**Impact on plan:** El código de las tareas 1 y 2 se entrega sin cambios respecto al plan. El impacto real es sobre el estado de `REQUIREMENTS.md` y sobre la preparación del plan 03-07, documentado en "Next Phase Readiness".

## Issues Encountered

- **La evidencia de base de datos que el checkpoint dice haber producido no existe.** Ver "Hallazgo central de esta ejecución" arriba — es el hallazgo principal de este cierre, no un detalle menor.
- El wrapper local `rtk` (ajeno al proyecto) sigue reescribiendo `grep` dentro de tuberías con formato propio; ya documentado en `STATE.md` desde plan 02-04. Se evitó pasándole patrones simples y confirmando con `wc -l`/consultas SQL directas en vez de depender de la salida de `grep` para conteos críticos.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **El código de la UI del consultor está completo, revisado y aprobado por el usuario.** Nada de la tarea 3 requiere reabrir tareas 1 o 2.
- ~~**Bloqueo real para el plan 03-07**: ese plan pinta la vista del cliente (identidad, historial, aviso de versión atrasada) y, según el propio plan 03-06, esperaba heredar una base con Acme en `v2 VIGENTE`/`v1 OBSOLETO` y Delta en `v1 VIGENTE`. Esa base **no existe**: `company_documents` sigue vacía y `P-RFC-4.1-01` sigue en `template_version = 1`.~~ **RESUELTO en 03-06b**: la base ya tiene exactamente esa forma — Acme en `v2 VIGENTE`/`v1 OBSOLETO`, Constructora Delta en `v1 VIGENTE`, `P-RFC-4.1-01` en `template_version=5` con una tabla importada de un `.docx` real —, generada invocando las cinco server actions reales por HTTP (no por navegador, no por script que imite su forma; ver "Cierre de la brecha (03-06b)" arriba). 03-07 puede construir su vista del cliente sobre datos reales.
- Registrado como blocker en `STATE.md` y resuelto ahí mismo (ver más abajo).
- El servidor de desarrollo (`pnpm --filter @prol/web dev`, puerto 3000) se deja **corriendo** para el plan 03-07, tal como pide esta continuación y la de 03-06b.

---
*Phase: 03-procedimientos-nativos*
*Completed: 2026-09-02*

## Self-Check: PASSED

Los cinco archivos de UI de las tareas 1-2 existen en disco con las líneas reportadas; los dos commits de tarea (`39d82b4`, `11c8b35`) están en el historial de git. `check-types` limpio, `lint` en 81 advertencias (0 errores, exit 1 esperado), `build` verde, confirmados en esta sesión. La consulta a `company_documents` se repitió tres veces con métodos distintos (consulta con join, `count(*)`, verificación de esquema con `\d`) y las tres coinciden en 0 filas — no es un error de sintaxis de la consulta. `companies` en 2 filas y `evidences.form_snapshot` no nulo en 2 filas, confirmados contra la base real.

## Self-Check (03-06b): PASSED

Cada uno de los ocho pasos del recorrido HTTP se verificó con una consulta SQL directa contra `prol-db` inmediatamente después de la llamada, no al final del recorrido — los valores citados en "Cierre de la brecha (03-06b)" son las respuestas JSON reales de las server actions y las filas reales de `company_documents`/`manual_documents` en el momento de cada paso, no un resumen post-hoc. Reconfirmado al cierre de esta sesión: `company_documents` tiene exactamente 3 filas con la forma descrita, `manual_documents.template_version=5` para `P-RFC-4.1-01`, el invariante de una sola `VIGENTE` por (documento, empresa) no tiene infracciones, y el banco de regresión de la fase 1 (`companies`=2, `evidences.form_snapshot` no nulo=2, `prol-db` sin reinicios) sigue intacto. `check-types`, `lint` (81 advertencias, 0 errores) y `build` se re-ejecutaron tras el recorrido y salieron idénticos al cierre original — coherente con que ningún archivo de código de producción cambió en esta sesión. El servidor de desarrollo sigue corriendo en el puerto 3000.
