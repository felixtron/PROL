# Phase 4: Puente HTML→PDF - Context

**Gathered:** 2026-09-03
**Status:** Ready for planning

<domain>
## Phase Boundary

**Dentro:** que un documento nativo (`kind = PROCEDIMIENTO`) ya emitido o
en plantilla se descargue como PDF apto para auditoría — encabezado ISO,
pie numerado, tablas con bordes y sin filas partidas entre páginas.

El "puente" es literal y su superficie es finita: `@react-pdf/renderer`
**no consume HTML**, así que la fase construye un mapeador del allowlist
cerrado de `sanitizeManualHtml` (~30 etiquetas) a primitivas de react-pdf.
No se introduce un motor de maquetación nuevo, ni Chromium, ni ninguna
dependencia de renderizado adicional.

**Fuera, y nombrado para que nadie lo improvise:**

| Fuera | Dónde vive |
|---|---|
| PDF de registros llenables desde snapshot (PDF-03) | Fase 5 |
| `rowspan` real | Fuera del milestone (PROJECT.md) |
| Imágenes remotas `https://` en el PDF | Fuera del milestone (SSRF + latencia) |
| Exportación masiva del juego documental | Fuera del milestone (limitador 60/min en `/api/*`) |
| Encender `documents_enabled` | Decisión de producto |

**Instrucción explícita del usuario al cerrar la discusión (2026-09-03):**
«ya no le des más vueltas, hazlo más sencillo esta fase para cerrarle y
avanza». El planificador debe leerla como una restricción, no como un
comentario: ante dos caminos que cumplen los cuatro criterios, se toma el
de menos piezas. Nada de configurabilidad, plantillas alternativas ni
opciones de exportación.

</domain>

<decisions>
## Implementation Decisions

### Encabezado, pie y sellos — discutido y cerrado con el usuario

- **Banda fija en todas las páginas + bloque completo en la primera.**
  La banda repetida (`fixed` de react-pdf) lleva logo, código, nombre y
  versión. La primera página abre además con el bloque completo de
  identidad: razón social, estatus, fecha y norma. Una hoja suelta
  fotocopiada sigue sabiendo de qué empresa y qué versión es.
- **Pie: «`<código>` · v`<versión>` — Página X de Y».** La redundancia con
  la banda superior es deliberada: un número de página solo no dice a qué
  documento pertenece. `render={({ pageNumber, totalPages }) => …}` con
  `fixed`.
- **Marca de agua diagonal para BORRADOR y OBSOLETO**, en cada página.
  Precedente directo en el repo: `CertificateRenderData.watermark`, el
  sello del diploma para hojas que no acreditan nada — reutilizar ese
  patrón, no inventar otro. VIGENTE no lleva sello.
- **El aviso de DOC-07 NO viaja al PDF.** El PDF es el artefacto que se
  archiva: lo que dice tiene que seguir siendo cierto dentro de un año, y
  «hay una versión más reciente» es estado vivo de la plataforma que
  envejece mal impreso. En pantalla se sigue viendo igual, sin cambios.

### Entrega de la descarga — cerrada por precedente tras la instrucción de simplificar

El área estaba seleccionada para discutirse; el usuario cortó la
discusión pidiendo simplicidad. Se cierra copiando la convención que el
repo ya tiene, sin preguntar más:

- **Route handler `GET`, no server action** — devuelve `Response`, que es
  el criterio del repo para elegir ruta (ver `03-CONTEXT.md`). Copia
  exacta de `app/api/dc3/[id]/pdf/route.tsx`: `renderToStream(pdf)` →
  `new NextResponse(stream as unknown as ReadableStream, …)`.
- **Cabeceras idénticas al DC-3 y al diploma:**
  `Content-Type: application/pdf` +
  `Content-Disposition: inline; filename="<código>-v<versión>.pdf"`.
  `inline` abre en el visor del navegador; el usuario guarda desde ahí.
- **Autorización reutilizada, nunca reinventada.** La ruta del documento
  de empresa se apoya en el mismo camino que ya autoriza leerlo
  (`getCompanyDocumentForClient` → `requireAssignmentMemberAccess`); la
  de plantilla, en `requireManualAdmin`. Si alguien no puede ver el
  documento en pantalla, tampoco puede sacar su PDF.
- **Sin bitácora de descargas.** El DC-3 la lleva porque carga CURP del
  trabajador y RFC del patrón y es requisito de ese módulo; un
  procedimiento no acredita a ninguna persona. Añadirla sería una tabla y
  un flujo que nadie pidió.

### La vista previa ES el PDF (criterio 4)

El criterio 4 —«la vista previa dentro del editor coincide con el archivo
descargado»— se cumple **por construcción, no por aproximación**: el
toggle `Eye` de `document-body-editor.tsx` deja de pintar `ManualContent`
(HTML + `manual-content.css`) y pasa a incrustar la misma ruta de PDF de
la plantilla. Un mismo render, un mismo byte stream.

Es además la opción más simple: mantener una maqueta HTML que "se parezca"
al PDF es trabajo permanente y una promesa que se rompe sola.

### Fidelidad del mapeo — reglas, no configuración

Un renderer, un juego de estilos, sin variantes:

- **Las tablas son el corazón de la fase.** Bordes visibles en todas las
  celdas y `wrap={false}` en cada fila, que es lo que hace cierto el
  criterio 2 («ninguna fila se parte entre páginas»). El encabezado de
  tabla (`<thead>`) se repite si la tabla cruza páginas.
- **Las clases decorativas de `manual-content.css`** (`manual-card`,
  `manual-callout`, `manual-doc`, `manual-preview`…) se degradan a bloques
  legibles con su jerarquía intacta, no se replican pixel a pixel. El
  criterio es que el auditor lea la estructura, no que el PDF sea una
  captura de la pantalla.
- **`rowspan`:** la celda se renderiza en su propia fila y se registra un
  aviso (ya declarado fuera de alcance en PROJECT.md/REQUIREMENTS.md).
- **Imágenes remotas `https://`:** marcador de posición, no se descargan.
  El logo de la empresa sí se incrusta, vía `loadUploadAsDataUrl`, que ya
  existe y ya alimenta `<Image>` de react-pdf en el DC-3.
- Cualquier etiqueta del allowlist que no tenga mapeo explícito cae a
  texto plano antes que a una excepción: un PDF pobre es recuperable, un
  500 en la descarga no.

### El criterio 3 sale del diseño, no de código extra

«Cambiar el logo de la empresa cambia el PDF sin regenerar ni volver a
emitir nada» se cumple porque **el PDF se genera por petición y el logo se
lee en vivo** — la decisión ya tomada en la fase 3 y demostrada allí con
hashes antes/durante/después. No hay artefacto persistido, no hay caché
que invalidar, no hay columna nueva. Verificarlo es repetir el
procedimiento de `03-07-SUMMARY.md` §"Demostración del logo en vivo",
esta vez sobre el PDF.

### Claude's Discretion

El usuario cortó la discusión aquí; estas quedan a criterio de la
planificación, resolviéndolas por precedente del DC-3 y el diploma:

- Tamaño de página, orientación y márgenes; tipografía y escala.
- Qué hace la banda cuando la empresa no tiene logo (hay empresas sin uno:
  `DocumentIdentity.companyLogo` es el único opcional).
- Nombre largo del documento: recorte o salto de línea en la banda.
- Si la tabla de control de cambios (DOC-05) se incluye al final del PDF.
  El área que la cubría no se discutió; por defecto **no se incluye** —
  menos piezas, y la fase no la pide en ningún criterio.
- Si la ruta de plantilla y la de empresa son dos handlers finos sobre un
  mismo módulo de render (preferido) o una sola ruta parametrizada.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`@react-pdf/renderer` ^4.3.2** (`apps/web/package.json`) — ya en
  producción para DC-3, diplomas y resultados de evaluación. No hay que
  elegir motor ni añadir dependencia; **no hay Chromium ni headless
  browser en el repo, y no se introduce uno.**
- **`app/api/dc3/[id]/pdf/route.tsx`** — la plantilla exacta a copiar:
  autorización → carga de datos → logos a data URL → `renderToStream` →
  `NextResponse` con `inline; filename=…`.
- **`lib/certificate-assets.ts` → `loadUploadAsDataUrl`** — convierte una
  URL `/uploads/...` en data URL para `<Image>`; devuelve `null` ante
  cualquier fallo para que la plantilla caiga a su placeholder en vez de
  romper la emisión. Es justo lo que necesita el logo de la banda.
- **`lib/documents/document-identity.ts` → `DocumentIdentity`** — módulo
  puro, ya resuelve razón social (`dc3LegalName ?? name`), logo en vivo,
  código (`codeOverride ?? code`), nombre (`nameOverride ?? name`),
  versión, estatus, norma y fecha (`ISSUED_AT_FORMAT`), **sin nulls que
  la plantilla tenga que interpretar**. El encabezado del PDF ya tiene su
  fuente de datos; no se construye otra.
- **`lib/certificate-templates/index.tsx` → `renderCertificate(id, data)`**
  — el patrón de "datos ya resueltos entran, `ReactElement<DocumentProps>`
  sale". El renderer del documento debe tener esa misma forma.
- **`CertificateRenderData.watermark`** — sello diagonal ya implementado
  para hojas que no acreditan nada. Es el precedente del sello
  BORRADOR/OBSOLETO.
- **`lib/sanitize-manual-html.ts`** — el allowlist es el **contrato de
  entrada del mapeador**: 30 etiquetas, `colspan`/`rowspan` en `th`/`td`,
  `class` filtrada contra `ALLOWED_CLASSES` (20 clases). La lista de
  casos a cubrir no hay que descubrirla, está escrita ahí.

### Established Patterns

- **Sanear al escribir, nunca al leer.** El HTML que llega al mapeador ya
  pasó por `sanitizeManualHtml`. El renderer de PDF **no vuelve a sanear
  ni relaja el allowlist**; si necesita algo que el allowlist no deja
  pasar, la respuesta es que ese algo no existe en la base.
- Route handlers sólo cuando hay que devolver `Response`; server actions
  en `lib/actions/*`; consultas RSC en `lib/queries/*` con `cache()`.
- Filtro de tenant fail-closed: `tenantId: user.tenantId ?? "__none__"`.
- `manual-content.tsx` sigue siendo el único `dangerouslySetInnerHTML` del
  proyecto. El camino del PDF **no añade otro**: parsea, no inyecta.

### Integration Points

- `app/dashboard/documents/[companyDocumentId]/page.tsx` — visor del
  cliente; ahí va el botón de descarga, junto a `DocumentIdentityHeader`.
- `app/tenant-admin/manuals/[id]/documents/[documentId]/document-body-editor.tsx`
  — el toggle `Eye` (línea ~240) pasa de `ManualContent` a incrustar el
  PDF de la plantilla. Es el cambio que hace cierto el criterio 4.
- `app/api/documents/.../pdf/route.tsx` — rutas nuevas, hermanas de las de
  DC-3 y diploma.

</code_context>

<specifics>
## Riesgos concretos, contra el código

1. **react-pdf no hereda estilos como CSS.** Cada primitiva se estiliza
   explícitamente; anidamiento profundo de `<div>`/`<span>` del HTML pegado
   puede producir árboles hondos. Aplanar lo que no aporte estructura.
2. **`wrap={false}` en una fila más alta que la página la deja en blanco.**
   Es el modo de fallo clásico de la regla del criterio 2. Hace falta una
   salida para filas desmesuradas — que se parta antes que desaparecer.
3. **El logo puede no ser un `/uploads/...`.** `loadUploadAsDataUrl`
   devuelve `null` para cualquier otra forma y la banda debe seguir
   saliendo. El tier público de archivos **no** migró a R2, así que la
   ruta de disco sigue siendo la correcta aquí.
4. **`kind = FILE` no tiene cuerpo que renderizar** (`contentHtml` es
   nullable desde la fase 3). La ruta debe responder algo honesto, no
   intentar renderizar `null` — el visor ya redirige esas filas a
   `/files/company-document/[id]`.
5. **La banda `fixed` de react-pdf se repinta en cada página**: cuidado con
   meter ahí trabajo caro (resolver el logo una vez, fuera del render).

## Estado del entorno que afecta a la verificación

- Base local en `localhost:5435`, sembrada. `P-RFC-4.1-01` existe emitido a
  **Acme Corp** y **Constructora Delta**, ambas con logo y razón social
  distintas — es exactamente el banco de pruebas del criterio 3, ya montado
  por la fase 3.
- Producción corre la imagen `9bf55ee` con `documents_enabled = true` sólo
  en `ibiza-online`. **Esta fase no toca producción salvo que se planifique
  un despliegue explícito** con el plan de riesgo/alcance/rollback/
  verificación que exige PROJECT.md.
- Deuda heredada y aún abierta desde 03-08: **descargar un PDF real en
  producción** nunca se ejercitó. Si esta fase termina en despliegue, es la
  ocasión natural de saldarla — pero no se da por saldada sin el clic.
- Sin pruebas automatizadas. La puerta sigue siendo typecheck +
  `eslint --max-warnings 0` + build, manteniendo la línea base de **81
  advertencias**, más comprobación manual.
- Los ejecutores en paralelo se pisan el índice de git
  (`branching_strategy: "none"`). **Un plan por ola**, como en las fases 2,
  3 y 3.1.

</specifics>

<deferred>
## Deferred Ideas

- **PDF de registros llenables desde el snapshot (PDF-03)** → fase 5. Esta
  fase construye el puente; la fase 5 le pasa por encima los valores
  congelados del registro.
- **Bitácora de descargas del PDF** → no en esta entrega. Sólo tendría
  sentido si un procedimiento pasara a acreditar algo de una persona.
- **Tabla de control de cambios dentro del PDF** → por defecto no. Si el
  auditor la pide en papel, es un añadido de una sección, no un rediseño.
- **Exportación masiva del juego documental** → sigue fuera: el limitador
  de 60 peticiones/minuto por IP de `/api/*` la reventaría desde un NAT
  corporativo sin mensaje útil.
- **`rowspan` fiel e imágenes remotas** → fuera del milestone, ya
  declarados en PROJECT.md y REQUIREMENTS.md.

</deferred>

---

*Phase: 04-puente-html-pdf*
*Context gathered: 2026-09-03*
