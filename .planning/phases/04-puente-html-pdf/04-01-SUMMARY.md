---
phase: 04-puente-html-pdf
plan: 01
subsystem: documents-pdf
tags: [react-pdf, htmlparser2, domhandler, pdf-parse, next-route-handler, better-auth]

# Dependency graph
requires:
  - phase: 03-procedimientos-nativos
    provides: "DocumentIdentity/buildDocumentIdentity, loadCompanyDocumentIdentity, getCompanyDocumentForClient, sanitizeManualHtml, loadUploadAsDataUrl, manual-access guards"
provides:
  - "html-to-pdf-nodes.tsx: mapeador HTML saneado -> primitivas react-pdf (bloques + inline, sin tablas)"
  - "document-pdf.tsx: armazón DocumentPdf/documentPdfFileName (banda fija, pie numerado, sello, identidad primera página)"
  - "GET /api/documents/company/[companyDocumentId]/pdf y GET /api/documents/template/[documentId]/pdf"
  - "loadTemplatePreviewIdentity con companyId opcional (placeholder 'Empresa de ejemplo')"
  - "verify-document-pdf.mjs: arnés HTTP + pdf-parse reutilizable"
  - "VEREDICTO A medido para el fixed-header de tablas: 04-02 lo aplica sin repetir el spike"
affects: [04-puente-html-pdf-02, 04-puente-html-pdf-03]

# Tech tracking
tech-stack:
  added: [htmlparser2 (directa, ya resuelta transitivamente por sanitize-html), domhandler (directa)]
  patterns:
    - "Dos modos de recorrido HTML (mapBlock/mapInline) para no anidar <View> dentro de <Text> en react-pdf"
    - "<View fixed> anidado DENTRO del contenedor propio de una tabla repite el encabezado sólo en sus páginas (confirmado por spike, no sólo por reporte de comunidad)"
    - "Handlers finos de ruta sobre un único render puro (DocumentPdf), mismo patrón que renderCertificate"
    - "Placeholder de entidad ('Empresa de ejemplo') para vista previa sin empresa, mismo truco que el diploma con 'Nombre del Alumno'"

key-files:
  created:
    - apps/web/scripts/spike-pdf-tables.mjs
    - apps/web/lib/documents/pdf/document-pdf.tsx
    - apps/web/lib/documents/pdf/html-to-pdf-nodes.tsx
    - apps/web/app/api/documents/company/[companyDocumentId]/pdf/route.tsx
    - apps/web/app/api/documents/template/[documentId]/pdf/route.tsx
    - apps/web/scripts/verify-document-pdf.mjs
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml
    - apps/web/lib/documents/resolve-identity.ts

key-decisions:
  - "Spike midió VEREDICTO A: <View fixed> anidado en el contenedor de la tabla repite la cabecera sólo en páginas con fila. 04-02 usa esta técnica tal cual, sin fallback."
  - "FILA-GIGANTE: VISIBLE — una fila wrap={false} más alta que la página se mueve entera a la siguiente, no desaparece. El escape de longitud que 04-02 implemente es mejora cosmética, no imprescindible para no perder datos."
  - "loadTemplatePreviewIdentity gana companyId opcional (antes exigido, sin llamantes reales): sin empresa devuelve 'Empresa de ejemplo' + tenantId del manual, para que la vista previa de plantilla no necesite elegir empresa."
  - "Sin bitácora de descargas en las rutas de documento nativo (a diferencia del DC-3): un procedimiento no acredita a ninguna persona."

requirements-completed: [PDF-01]

# Metrics
duration: ~30min
completed: 2026-09-04
---

# Phase 04 Plan 01: Puente HTML→PDF (armazón + spike de tablas) Summary

**Spike midió (no asumió) el comportamiento de react-pdf con tablas multipágina (VEREDICTO A), y las dos rutas de descarga PDF (plantilla y documento de empresa) devuelven un PDF real con encabezado ISO, pie numerado y sello por estatus, verificado con 16 comprobaciones HTTP contra la base real.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-04T14:41:00Z (aprox., primer commit 08:41:16 -06:00)
- **Completed:** 2026-09-04T14:57:00Z (aprox., último commit de tarea 08:56:44 -06:00)
- **Tasks:** 3
- **Files modified:** 9 (6 creados, 3 modificados)

## Accomplishments

- **Veredicto medido del spike de tablas — copiado literal:**
  ```
  VEREDICTO: A
  Técnica confirmada: <View fixed> ANIDADO dentro del contenedor propio de la
  tabla repite la cabecera sólo en las páginas que la tabla ocupa. El plan
  04-02 usa esta técnica tal cual, sin fallback.
  FILA-GIGANTE: VISIBLE
  La fila gigante con wrap={false} se movió entera a una página (posiblemente
  dejando espacio en blanco antes), pero el texto no desapareció. El escape
  de longitud (wrap: true para filas anormalmente largas) es una mejora
  cosmética, no imprescindible para no perder datos.
  ```
  **Técnica que 04-02 debe usar, nombrada explícitamente:** anidar el `<View fixed>` de la cabecera de tabla DENTRO del `<View>` contenedor propio de esa tabla (no como hijo directo de `<Page>`). El escape de fila gigante (umbral de longitud → `wrap: true`) es deseable pero no crítico para no perder datos, según lo medido.
- Un procedimiento nativo se descarga como PDF real desde una URL, con el mismo patrón de ruta que el DC-3, autorizado por el mismo camino que autoriza verlo en pantalla.
- Todas las páginas llevan la banda de identidad (logo/inicial, código, nombre, versión) y el pie `código · vN — Página X de Y`; la primera página abre con el bloque de identidad completo.
- Un documento BORRADOR (vista previa de plantilla) sale sellado en todas sus páginas; uno VIGENTE (Acme) no lleva sello en ninguna.
- La vista previa de una plantilla se genera sin pedir empresa, con el marcador "Empresa de ejemplo".
- 401 sin sesión, 403 entre empresas, 404 para id inexistente, 409 para `kind = FILE` — los cuatro códigos verificados contra el servidor real.

## Task Commits

Each task was committed atomically:

1. **Tarea 1: dependencias y spike medido de tablas** - `4265a12` (chore)
2. **Tarea 2: armazón del PDF y mapeador de bloques** - `6c2da28` (feat)
3. **Tarea 3: las dos rutas de descarga y el arnés de verificación** - `d2d18e9` (feat)

**Plan metadata:** (este commit)

## Files Created/Modified

- `apps/web/scripts/spike-pdf-tables.mjs` - Mide (no opina) el comportamiento de `<View fixed>` en tablas react-pdf multipágina y de una fila `wrap={false}` más alta que una página; imprime veredicto A/B/C y VISIBLE/DESAPARECIDA
- `apps/web/lib/documents/pdf/html-to-pdf-nodes.tsx` - Mapeador `htmlToPdfNodes(contentHtml)`: `htmlparser2.parseDocument` + recorrido bloque/inline separado; h2-h4, p, ul/ol/li, hr, blockquote, negrita/cursiva/subrayado/tachado/small/sub/sup/code/br/a; degrada a texto plano con warning cualquier etiqueta sin mapeo (tablas, imágenes, div/span/section, pre — 04-02)
- `apps/web/lib/documents/pdf/document-pdf.tsx` - `DocumentPdf`/`documentPdfFileName`: banda fija (logo o inicial + código/nombre + versión), pie numerado `pageNumber`/`totalPages`, sello `fixed` sólo BORRADOR/OBSOLETO, bloque de identidad completo en la primera página (sin el aviso de plantilla desactualizada)
- `apps/web/app/api/documents/company/[companyDocumentId]/pdf/route.tsx` - Descarga autorizada vía `getCompanyDocumentForClient`; 409 para `kind = FILE`, 401/403 mapeados, sin bitácora de impresión
- `apps/web/app/api/documents/template/[documentId]/pdf/route.tsx` - Vista previa autorizada con `requireManualAdmin` + `assertTenantScope`, sin empresa
- `apps/web/scripts/verify-document-pdf.mjs` - Arnés HTTP + `pdf-parse` v2: login real, 16 comprobaciones (200/401/403/404/409, banda, pie, sello, identidad), reutilizable por 04-02/04-03
- `apps/web/lib/documents/resolve-identity.ts` (modificado) - `loadTemplatePreviewIdentity` gana `companyId?: string | null` y devuelve `tenantId`; sin empresa sustituye por "Empresa de ejemplo"
- `apps/web/package.json`, `pnpm-lock.yaml` (modificados) - `htmlparser2` y `domhandler` promovidas a directas, misma versión ya resuelta transitivamente (`htmlparser2@12.0.0` → `domhandler@6.0.1`)

## Decisions Made

- **Técnica de cabecera de tabla confirmada por medición, no por reporte de comunidad**: `<View fixed>` anidado en el contenedor propio de la tabla. 04-02 la aplica sin volver a discutirla.
- **Escala de la fila gigante**: `wrap={false}` en una fila más alta que la página la mueve entera (posible página casi en blanco antes), no la hace desaparecer. El plan 04-02 puede tratar el escape de longitud como mejora cosmética.
- **`loadTemplatePreviewIdentity` con `companyId` opcional** en vez de una segunda función o una ruta parametrizada: cero llamantes previos (confirmado por grep antes de tocarla), así que ampliar la firma es seguro.
- **Sin bitácora de descargas** para los PDF de documento nativo, a diferencia del DC-3: decisión ya cerrada en `04-CONTEXT.md` (un procedimiento no acredita a ninguna persona).
- **Origin explícito en el arnés de login**: Better Auth rechaza con `403 MISSING_OR_NULL_ORIGIN` una petición de login sin cabecera `Origin`; un cliente HTTP puro (Node `fetch`, sin contexto de navegador) no la manda por defecto, así que `verify-document-pdf.mjs` la declara explícitamente igual al `--base-url` contra el que prueba.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `renderToBuffer` no es una función al importar el `default` de `@react-pdf/renderer`**
- **Found during:** Tarea 1 (spike de tablas)
- **Issue:** `import ReactPDF from "@react-pdf/renderer"; const { renderToBuffer } = ReactPDF` fallaba: el export `default` del paquete no incluye `renderToBuffer` (sólo los named exports lo tienen).
- **Fix:** Import con named exports directos: `import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer"`.
- **Files modified:** `apps/web/scripts/spike-pdf-tables.mjs`
- **Verification:** El spike corre y produce veredicto.
- **Committed in:** `4265a12` (parte del commit de tarea 1)

**2. [Rule 1 - Bug] Login del arnés de verificación fallaba con 403 `MISSING_OR_NULL_ORIGIN`**
- **Found during:** Tarea 3 (verificación end-to-end)
- **Issue:** Better Auth exige una cabecera `Origin` no nula en peticiones que mutan estado (login); Node `fetch` sin contexto de navegador no la manda, así que `login()` fallaba con 403 antes de llegar a autenticar.
- **Fix:** `login()` declara explícitamente `Origin: args.baseUrl` en la petición.
- **Files modified:** `apps/web/scripts/verify-document-pdf.mjs`
- **Verification:** Las 16 comprobaciones del arnés pasan contra el servidor de desarrollo real.
- **Committed in:** `d2d18e9` (parte del commit de tarea 3)

**3. [Rule 3 - Blocking] Variable `markers` sin usar rompía la línea base de lint (82 en vez de 81)**
- **Found during:** Tarea 1, verificación de calidad
- **Issue:** El spike declaraba un array `markers` que nunca se leía; `@typescript-eslint/no-unused-vars` lo marcó, subiendo el conteo de warnings de 81 a 82 y rompiendo la puerta de calidad (`--max-warnings 0` sale con exit 1 en 81 exactos, pero el conteo debe ser el mismo).
- **Fix:** Se eliminó la variable no usada.
- **Files modified:** `apps/web/scripts/spike-pdf-tables.mjs`
- **Verification:** `pnpm exec turbo run lint --force` vuelve a reportar exactamente 81 problemas.
- **Committed in:** `4265a12` (parte del commit de tarea 1)

---

**Total deviations:** 3 auto-fixed (2 bloqueantes, 1 bug)
**Impact on plan:** Los tres eran necesarios para que el spike y el arnés funcionaran; ninguno cambia el alcance ni la arquitectura acordada en `04-CONTEXT.md`.

## Issues Encountered

- El limitador de `/api/auth/sign-in/email` (5 peticiones/min) se agotó durante las pruebas manuales de diagnóstico del problema de `Origin` (varias llamadas `curl` + intentos del script). Se resolvió esperando la ventana de un minuto antes de correr la verificación completa — no requirió cambios de código, sólo espaciar las peticiones. Ninguna sesión real de usuario se vio afectada (base local, sin tráfico concurrente).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El plan 04-02 puede aplicar directamente la técnica del `<View fixed>` anidado para el encabezado de tabla, sin repetir el spike ni discutir el fallback (VEREDICTO A la descarta).
- `html-to-pdf-nodes.tsx` y `document-pdf.tsx` quedan con la forma exacta que 04-02 y 04-03 esperan consumir (`MappedBody`, `DocumentPdfProps`, `documentPdfFileName`) — no hay que renegociar contratos.
- `verify-document-pdf.mjs` queda listo para que 04-02/04-03 le agreguen sus propias comprobaciones (tablas con bordes, filas sin partir, logo real de una empresa) sin reescribir el login ni la lectura de páginas.
- Pendiente de fases posteriores (no bloqueante para 04-02): tablas, imágenes, `div/span/section`, `pre` y las clases decorativas de `manual-content.css` siguen cayendo al `default` (texto plano + warning) hasta que 04-02 les dé mapeo propio.
- `git status` limpio al terminar: ningún archivo de otra sesión se arrastró.

---
*Phase: 04-puente-html-pdf*
*Completed: 2026-09-04*

## Self-Check: PASSED

Todos los archivos creados existen en disco (7/7) y los tres commits de tarea existen en el historial de git (`4265a12`, `6c2da28`, `d2d18e9`). Ninguno faltante.
