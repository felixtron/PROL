# Phase 3: Procedimientos nativos — Research

**Researched:** 2026-09-02
**Domain:** Brownfield Next.js/Prisma feature work — HTML-native document authoring, versioning, multi-tenant personalization, and `.docx` import
**Confidence:** HIGH (this research is almost entirely code-reading against the actual repo, not ecosystem survey)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Todo lo de `03-CONTEXT.md` sección `<decisions>` está **cerrado**. Resumen operativo (ver el archivo completo para la redacción exacta y el razonamiento):

- La importación `.docx` se adelanta a esta fase (absorbe la fase 7). `mammoth` ya está instalado; `convertToHtml` (no `extractRawText`) es la función a usar, y preserva tablas.
- La fase cierra con un despliegue a producción con checkpoint (igual que la fase 2), arrastrando `5e2352d` (fix del 401), que hoy sigue sin desplegar. El módulo documental sigue apagado (`documents_enabled = false`) — no se enciende en esta fase.
- Modelo de datos 100% aditivo vía `db push` (no hay directorio de migraciones), salvo relajar `NOT NULL` en cuatro columnas de `CompanyDocument`.
- Enums nuevos: `ManualDocumentKind { FILE PROCEDIMIENTO REGISTRO }` y `CompanyDocumentStatus { BORRADOR VIGENTE OBSOLETO }`. `kind` va denormalizado también en `CompanyDocument` (igual que `Evidence.kind`).
- `ManualDocument` gana `kind`, `contentHtml String? @db.Text` (saneado en escritura), `templateVersion Int @default(1)`.
- `CompanyDocument` gana `kind`, `contentHtml String? @db.Text` (snapshot al emitir), `nameOverride String?`, `status CompanyDocumentStatus @default(VIGENTE)`, `sourceTemplateVersion Int?`, `publishedAt DateTime?`, `publishedById String?`; y `fileKey`/`fileName`/`fileSize`/`mimeType` pasan a nullable.
- `formSchema` NO se añade en esta fase (es de la fase 5).
- Bucle de edición: se edita en sitio sobre la versión más alta mientras `status = BORRADOR`; "Publicar" la pasa a `VIGENTE` y degrada la anterior a `OBSOLETO`; la siguiente edición abre un nuevo `BORRADOR` en `max+1`. Append-only se conserva para lo publicado.
- Emitir a una empresa crea `CompanyDocument` con `contentHtml` congelado y `sourceTemplateVersion` apuntando al `templateVersion` de origen de `ManualDocument`. Editar la plantilla después no cambia lo ya emitido.
- El logo se lee en vivo (vía `Company.logo`/tenant, no congelado); lo acreditativo (razón social, código, versión, estatus, fecha, `normaLabel`, tenant) se resuelve una vez en `DocumentIdentity`, siguiendo el patrón `renderCertificate(templateId, data)` — "sin nulls que la plantilla tenga que interpretar". Split puro/servidor: `document-identity.ts` (puro) y `resolve-identity.ts` (sólo servidor).
- La tabla de control de cambios (DOC-05: versión, fecha, autor, descripción, estatus) se genera en tiempo de render desde el historial de filas de `CompanyDocument`; nunca se redacta a mano. `notes` se reutiliza como "descripción del cambio".
- Editor: cuerpo en HTML saneado (no bloques, no WYSIWYG). Maqueta exacta: la de `section-content-editor.tsx` (textarea mono + toggle `Eye` de vista previa). Ruta: `app/tenant-admin/manuals/[id]/documents/[documentId]/`. Cliente: `app/dashboard/documents/` (lista maestra + `[companyDocumentId]`).
- Invariante del sanitizador: `sanitizeManualHtml` tiene allowlist cerrado; **todo** camino nuevo de escritura de HTML (cuerpo de documento, importación `.docx`) pasa por él ANTES de la base. Sin excepciones.
- Convenciones del repo que aplican: server actions en `lib/actions/*`; RSC queries en `lib/queries/*` con `cache()`; route handler sólo si hay que devolver `Response` (la importación `.docx` recibe `FormData` → es ruta, no acción); nada de despacho en `"use server"`; filtro de tenant fail-closed (`tenantId: user.tenantId ?? "__none__"`); incremento de versión con `FOR UPDATE` sobre `manual_documents` (no `company_documents`) dentro de `db.$transaction`, reutilizando el patrón de la fase 1 (`160bc5a`), no reinventándolo.

### Claude's Discretion

No hay una sección `## Claude's Discretion` explícita en `03-CONTEXT.md`. Lo que el contexto deja abierto y este research documenta como hallazgo (no como decisión del usuario) va marcado como tal más abajo — en particular: si el `templateVersion` de `ManualDocument` sube en cada guardado o sólo quando cambia `contentHtml`, y si la primera emisión pasa por `BORRADOR→publicar` o crea `VIGENTE` directo. Ver `## Open Questions`.

### Deferred Ideas (OUT OF SCOPE)

- PDF de procedimientos → fase 4. Esta fase se demuestra en pantalla.
- `Manual.version` sigue decorativo para las secciones (no se congela su narrativa). Brecha remanente declarada.
- Adjuntos dentro de un documento → no en esta entrega.
- Exportación masiva del juego documental → no (el limitador de 60/min por IP en `/api/*` la agotaría).
- Encender `documents_enabled` → decisión de producto, fuera de esta fase.
- Registros llenables (`formSchema`, `CompanyRecord`, bloques) → fase 5.
- Subida directa por URL firmada → fase 6.
- Los dos `EvidenceRequirementKind` nuevos y su cableado a evidencia → fase 5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| DOC-01 | Redactar un procedimiento en la plataforma, sin `.docx` | `section-content-editor.tsx` (patrón de editor a copiar), `createManualDocument`/`updateManualDocument` en `lib/actions/manual.ts` (extender con `kind`/`contentHtml`), `sanitizeManualHtml` (invariante de escritura) |
| DOC-02 | Importar `.docx` conservando tablas, saneado antes de la base | `mammoth.convertToHtml` (hallazgos de Context7 abajo), `apps/web/app/api/upload/extract-text/route.ts` (ruta gemela a copiar), `sanitize-manual-html.ts` (allowlist exacto que decide qué sobrevive) |
| DOC-03 | Emitir congela el cuerpo; editar la plantilla después no lo altera | `uploadCompanyDocument` en `lib/actions/manual.ts:860-915` (lock `FOR UPDATE` sobre `manual_documents` a reutilizar), `ManualDocument.contentHtml`/`templateVersion` vs `CompanyDocument.contentHtml`/`sourceTemplateVersion` |
| DOC-04 | Misma plantilla con logo/razón social/código por empresa | `certificate-templates/index.tsx` (`renderCertificate` — patrón exacto para `DocumentIdentity`), `dc3/readiness.ts:181` (`company.dc3LegalName ?? company.name` — fallback ya usado), `Company.logo` renderizado directo (`tenant-brand.tsx:21-23`, sin data-URL: eso es sólo para PDF) |
| DOC-05 | Historial con versión/fecha/autor/descripción/estatus | Columnas ya existentes en `CompanyDocument`: `version`, `createdAt`, `uploadedById`, `notes` (reutilizado), `status` (nuevo) — se genera en render, no se redacta |
| DOC-06 | Editar abre borrador; publicar crea versión | Bucle BORRADOR/VIGENTE/OBSOLETO — nueva acción de "publicar" a construir sobre el mismo lock pattern de `uploadCompanyDocument` |
| DOC-07 | Cliente ve que su versión quedó atrás | `sourceTemplateVersion` (CompanyDocument) vs `templateVersion` (ManualDocument) — comparación en `DocumentIdentity`/vista de documento |
| OPS-05 | Toda consulta de "vigente" filtra por estatus, no por versión máxima | **Ver tabla completa de call sites más abajo — es la sección central de este research** |

</phase_requirements>

## Summary

Esta fase es 90% lectura de código existente y 10% ecosistema. El repo ya tiene todos los patrones que hacen falta — sólo hay que encontrarlos y copiarlos: el editor de texto saneado (`section-content-editor.tsx`), el resolutor "sin nulls" (`certificate-templates/index.tsx`), el lock de versión con `FOR UPDATE` (`uploadCompanyDocument`), el modelo `fileKey`-nullable-con-guard (`Evidence`, ya lo hace exactamente así), y el sanitizador de HTML con allowlist cerrado. No hace falta ninguna librería nueva: `mammoth` (^1.12.0) y `sanitize-html` (^2.17.7) ya están en el lockfile y en uso.

El riesgo real de la fase no es técnico sino de **enumeración**: dos consultas concretas (`getAssignmentPanel` y `getSectionForCompany`, ambas en `apps/web/lib/queries/manual.ts`) hoy calculan "documento vigente" como `max(version)`, y con `BORRADOR` en juego eso empieza a devolver el borrador sin publicar a un cliente o a un consultor. Hay una tercera cosa nueva que el CONTEXT no menciona explícitamente pero que se deduce del propio modelo: `uploadCompanyDocument` (las subidas de archivo, kind `FILE`) tiene que empezar a degradar la versión anterior a `OBSOLETO` para que el invariante "como mucho un `VIGENTE` por (documento, empresa)" se sostenga también para archivos, no sólo para procedimientos nativos.

El límite honesto de la importación `.docx` es ahora preciso y verificable, no una intuición: `mammoth.convertToHtml` **sí** preserva tablas (filas, celdas, `colSpan`/`rowSpan`, distinción header/dato) porque el sanitizador ya permite exactamente esas etiquetas — pero por diseño de mammoth se pierden bordes/colores/fuentes de Word (documentado en su propio README), y las imágenes incrustadas se pierden por el sanitizador, no por mammoth: mammoth las embebe por defecto como `data:` URI, y el allowlist de esquemas del sanitizador (`http`, `https`, `mailto`) no incluye `data:`, así que el atributo `src` se cae y queda un `<img>` vacío. Además, el mapeo de estilos por defecto de mammoth convierte "Heading 1" de Word a `<h1>`, que el sanitizador tampoco permite (sólo `h2`-`h4`) — sin un `styleMap` explícito, el título del documento pierde su etiqueta semántica.

**Primary recommendation:** Copiar los patrones existentes al pie de la letra (no rediseñar), arreglar exactamente los dos call sites de "vigente" identificados abajo, sumar el arreglo de `uploadCompanyDocument`, y pasar un `styleMap` explícito a `mammoth.convertToHtml` que remapee los encabezados de Word a `h2`-`h4` y evite emitir imágenes en base64 que el sanitizador va a tirar de todos modos.

## OPS-05 — Enumeración completa de call sites de `CompanyDocument`

Esta es la salida más valiosa del research. Se identificaron **todos** los puntos del código (fuera de `.next/standalone`, que es build output) que tocan el modelo `CompanyDocument`. Para cada uno se determina si su semántica es "vigente" (necesita filtrar por `status`) o "cualquier versión" (debe quedarse como está).

| # | Archivo:línea | Función | Qué hace hoy | Semántica | Acción requerida |
|---|---|---|---|---|---|
| 1 | `apps/web/lib/queries/manual.ts:287-300` (dedup en 313-315) | `getAssignmentPanel` (staff: consultor/admin) | `findMany({ where: { companyId }, orderBy: [{documentId:"asc"},{version:"desc"}] })`, luego dedup manual quedándose con la primera fila (= mayor versión) por `documentId` | **VIGENTE** — alimenta el panel de "Documentos de la empresa" del consultor (`company-project-panel.tsx`), con enlace de descarga directo | Cambiar `where` a `{ companyId, status: "VIGENTE" }`. El dedup por `documentId` puede quedarse como red de seguridad, pero ya no debería hacer falta (a lo sumo un `VIGENTE` por par) |
| 2 | `apps/web/lib/queries/manual.ts:556-570` (dedup en 613-615) | `getSectionForCompany` (cliente) | Igual patrón: `findMany` + dedup por mayor versión | **VIGENTE** — es el call site que el propio CONTEXT nombra explícitamente (criterio 5); alimenta `app/dashboard/manuals/[assignmentId]/sections/[sectionId]/page.tsx`, el mapa `companyDocByDocumentId` y el enlace `/files/company-document/[id]` | Mismo cambio: `where: { ..., status: "VIGENTE" }` |
| 3 | `apps/web/app/files/company-document/[id]/route.ts:22` | `GET` (descarga) | `findUnique({ where: { id } })` — busca por el ID exacto de la fila pedida en la URL, no "la más alta" | **Cualquier versión** — es correcto que se pueda descargar una versión histórica por su propio id (igual que hoy); no toca la semántica de vigente | **No cambiar el `where`.** Sí necesita el guard de `fileKey` nulo (ver sección siguiente) |
| 4 | `apps/web/lib/actions/manual.ts:573-575` | `deleteManualDocument` | `count({ where: { documentId } })` — cuenta TODAS las versiones (cualquier estatus) para bloquear el borrado de un `ManualDocument` que ya tiene historial en alguna empresa | **Cualquier versión, a propósito** | **No cambiar.** Filtrar por `VIGENTE` aquí sería un bug nuevo: permitiría borrar un documento que sólo tiene versiones `OBSOLETO`/`BORRADOR`, perdiendo el historial de una empresa |
| 5 | `apps/web/lib/actions/manual.ts:887-908` | `uploadCompanyDocument` | `tx.companyDocument.findFirst({ where: { documentId, companyId }, orderBy: { version: "desc" } })` para calcular `(last?.version ?? 0) + 1`, dentro del `FOR UPDATE` sobre `manual_documents` | **Cualquier versión, a propósito** (necesita el máximo real, no el vigente) para no reciclar números de versión | **No cambiar el cálculo de versión.** Pero SÍ falta una pieza nueva: antes de `create`, si existe una fila `VIGENTE` para ese `(documentId, companyId)`, degradarla a `OBSOLETO` dentro de la misma transacción — hoy no existe el campo `status`, así que cada subida de archivo queda implícitamente "vigente para siempre" sin degradar la anterior. Sin este cambio, un documento `FILE` con dos subidas terminaría con dos filas `status: VIGENTE` (el default), rompiendo el invariante que sostiene los fixes #1 y #2 |
| 6 | `apps/web/app/tenant-admin/manuals/[id]/manual-documents.tsx:20,207-210` (vía `getManualForEdit`, `lib/queries/manual.ts:119`) | Catálogo admin | `_count: { select: { companyDocuments: true } }` — cuenta total de filas (todas las empresas, todas las versiones) sólo para mostrar "N versiones de empresa" | **Cualquier versión, a propósito** (es un contador informativo, no "cuántas empresas tienen la vigente") | **No cambiar** |

**Conclusión accionable:** sólo dos consultas de lectura cambian (#1 y #2, ambas a `status: "VIGENTE"`), y una acción de escritura gana una responsabilidad nueva (#5, degradar la `VIGENTE` anterior). Los otros tres call sites (#3, #4, #6) están bien como están — cambiarlos sería introducir el bug, no arreglarlo.

## `fileKey` nullable — lectores que asumen no-nulo

`CompanyDocument.fileKey/fileName/fileSize/mimeType` pasan de `String` a `String?`. TypeScript en modo `strict: true` (confirmado en `packages/typescript-config/base.json:16`) marcará como error de compilación cualquier sitio que pase estos campos donde se espera `string`. Grep de `.fileKey` en todo `apps/web` (excluyendo `.next`) da exactamente:

| Archivo:línea | Uso | Riesgo | Arreglo |
|---|---|---|---|
| `apps/web/app/files/company-document/[id]/route.ts:41` | `readPrivateFile(doc.fileKey)` — `readPrivateFile(fileKey: string): Promise<Buffer\|null>` no acepta `null` | **Error de compilación + 500 en runtime si no se arregla** | Guard antes: `if (!doc.fileKey) return new NextResponse("No encontrado", { status: 404 })`. Copiar literalmente el patrón ya existente en `apps/web/app/files/evidence/[id]/route.ts:39` (`if (!evidence?.fileKey \|\| evidence.deletedAt) { ... }`) — `Evidence.fileKey` ya es nullable hoy y esa ruta ya resuelve el mismo problema |
| `apps/web/components/company-project-panel.tsx:123` | `{own.fileName}` en JSX, dentro de una línea "Versión N · fileName · autor · fecha" | Sin riesgo de crash (JSX renderiza `null` como nada), pero **UX rota**: para un documento nativo (`fileName: null`) la línea queda "Versión 2 ·  · Juan · fecha" con un separador huérfano | Renderizar condicionalmente según `kind`: si `kind !== "FILE"`, mostrar "Versión N · autor · fecha" sin el segmento de archivo, y sin el botón "Subir versión" (`CompanyDocumentUpload`) — para nativos ese botón no tiene sentido, el flujo es editar/emitir en la nueva UI |
| `apps/web/lib/queries/manual.ts:295-296, 536-537, 567-568` | `select: { fileName: true, fileSize: true, ... }` en los tres `findMany` de `CompanyDocument` | Ninguno directo (select de un campo nullable no rompe nada), pero **falta agregar** `status`, `kind`, `nameOverride` a estos mismos selects para que los fixes de la tabla OPS-05 y el renderizado kind-aware tengan los datos | Añadir los campos nuevos al `select` en los tres sitios |

No se encontraron otros lectores runtime de `fileKey`/`fileName`/`fileSize`/`mimeType` de `CompanyDocument` (el resto de coincidencias de `.fileKey` en el repo pertenecen a `Evidence.fileKey` o `ManualDocument.baseFileKey`, que no cambian en esta fase).

**Precedente exacto a copiar:** `Evidence` ya tiene estos cuatro campos nullable desde su diseño original (`packages/db/schema.prisma:2761-2764`, comentario: *"Archivo entregado. Nulos cuando la evidencia es una captura hecha en la plataforma"*), y `apps/web/app/files/evidence/[id]/route.ts` ya resuelve el guard correctamente. Es el mismo problema, ya resuelto una vez en el mismo repo.

## Architecture Patterns

### Editor de cuerpo HTML — copiar `section-content-editor.tsx`

**Fuente:** `apps/web/app/tenant-admin/manuals/[id]/sections/[sectionId]/section-content-editor.tsx` (150 líneas)

Patrón exacto: `"use client"`, estado local (`title`, `code`, `contentHtml`, `preview`), `useTransition` + server action, textarea `font-mono` con `rows={22}`, botón toggle con icono `Eye` de lucide-react para alternar entre editar y `<ManualContent html={contentHtml} />` (vista previa aproximada — el saneado real ocurre al guardar). El aviso de ayuda ("Se admiten títulos, párrafos, listas, tablas...") va justo debajo del textarea.

Para el nuevo editor de documento (`app/tenant-admin/manuals/[id]/documents/[documentId]/`), el mismo componente se reutiliza casi literal, cambiando el server action de destino (`updateSection` → una nueva acción de documento) y el título del formulario. **No hay necesidad de escribir un editor nuevo desde cero.**

### "Sin nulls que la plantilla tenga que interpretar" — `DocumentIdentity`

**Fuente:** `apps/web/lib/certificate-templates/index.tsx`

El patrón es: una función pura `renderX(templateId, data: XRenderData)` donde `XRenderData` es una interfaz sin opcionales evitables — todo lo que la plantilla necesita ya viene resuelto (fallbacks aplicados, formatos de fecha ya calculados) para que el componente de presentación no tenga que preguntar `?? ` en ningún lado. Los dos únicos consumidores (ruta de PDF real y ruta de vista previa) llenan la misma interfaz desde fuentes distintas, garantizando que lo que ve el usuario en preview sea idéntico a lo emitido.

Para `DocumentIdentity`, el CONTEXT ya especifica el split exacto:
- **`document-identity.ts`** (puro, sin imports de servidor) — define la interfaz `DocumentIdentityData` (razón social, logo, código, nombre, versión, estatus, fecha, `normaLabel`, tenant) y quizás una función de formato puro.
- **`resolve-identity.ts`** (server-only) — hace las consultas a `db` (Company, Tenant, ManualDocument/CompanyDocument) y aplica los fallbacks:
  - Razón social: `company.dc3LegalName ?? company.name` — **fallback textualmente idéntico** al que ya usa el emisor DC-3 (`apps/web/lib/dc3/readiness.ts:181`: `const employerName = clean(company.dc3LegalName) ?? clean(company.name);`). Reutilizar la misma regla, no reinventarla.
  - Código: `codeOverride ?? code` (ya existe este patrón exacto en `company-project-panel.tsx:119` y `section/page.tsx:108`: `own?.codeOverride ?? doc.code`).
  - Nombre: `nameOverride ?? name` (mismo patrón, campo nuevo simétrico).
  - Logo: **se lee en vivo, no se congela.** Es sólo `company.logo` (`String | null`), pasado directo como `src` de una etiqueta `<img>` — no hace falta convertirlo a data URL. Esa conversión (`loadUploadAsDataUrl` en `apps/web/lib/certificate-assets.ts`) existe únicamente para `@react-pdf/renderer`, que no puede cargar URLs remotas de forma fiable; en HTML normal del navegador el patrón correcto es el que ya usa `apps/web/components/tenant-brand.tsx:21-23` (`<img src={logo} .../>` directo). No copiar el patrón de data-URL aquí — es de la fase 4 (PDF).

### Lock de versión con `FOR UPDATE` — reutilizar, no reinventar

**Fuente:** `apps/web/lib/actions/manual.ts:880-909` (`uploadCompanyDocument`), añadido en la fase 1 (`160bc5a`)

```typescript
await db.$transaction(async (tx) => {
  // Se bloquea `manual_documents` y no `company_documents` a propósito: el par
  // (documento, empresa) puede no tener ninguna fila todavía, y un FOR UPDATE
  // sobre cero filas no bloquea nada.
  await tx.$queryRaw`SELECT 1 FROM manual_documents WHERE id = ${input.documentId} FOR UPDATE`;

  const last = await tx.companyDocument.findFirst({
    where: { documentId: input.documentId, companyId: assignment.companyId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  await tx.companyDocument.create({
    data: { /* ..., version: (last?.version ?? 0) + 1, ... */ },
  });
});
```

La nueva acción "publicar" (BORRADOR → VIGENTE, degradar la anterior a OBSOLETO) debe envolverse en el **mismo** `$transaction` + `FOR UPDATE` sobre `manual_documents`, no crear su propio mecanismo de lock. La nueva acción "guardar borrador" (editar en sitio sin crear versión) es más simple — un `update` directo sobre la fila `BORRADOR` existente, sin necesidad de lock porque no está calculando un número de versión nuevo.

### Reordenamiento por flechas — `reorderSections`

**Fuente:** `apps/web/lib/actions/manual.ts:372-395`

Si el editor de documentos necesita reordenar algo (p. ej. una futura lista de documentos por sección — aunque no está claro que esta fase lo necesite), el patrón es: recibir `orderedIds: string[]`, validar contra el set real de IDs del padre, y aplicar posiciones `0..n` con un `$transaction` de updates. **No hay drag-and-drop en el repo** — es deliberado, no una limitación a resolver.

### Compensating rollback — `risk.ts`

**Fuente:** `apps/web/lib/actions/risk.ts:170-224` (`submitRiskMatrix`)

Patrón: mutación 1 (marcar `SUBMITTED`) → llamar a una operación que puede fallar (`submitEvidence`) → si falla, **revertir manualmente** la mutación 1 (`status: "DRAFT"` de nuevo) antes de devolver el error. No hay rollback automático de Prisma entre dos `$transaction` separadas, así que cualquier flujo de "emitir"/"publicar" de esta fase que dependa de un paso posterior que pueda fallar (p. ej., notificar) debe seguir este mismo patrón explícito si el efecto secundario es crítico, o simplemente aceptar que un fallo de notificación no debe revertir nada (ver `evidence.ts:178-183`, patrón de "aviso fuera de la transacción").

## Don't Hand-Roll

| Problema | No construir | Usar en su lugar | Por qué |
|---|---|---|---|
| Convertir `.docx` a HTML | Un parser de OOXML propio | `mammoth.convertToHtml` (ya en el lockfile, ^1.12.0) | Ya está resuelto, probado en producción por miles de proyectos, y ya se usa en el repo (`extractRawText`) para el mismo tipo de archivo |
| Sanear HTML | Un allowlist de regex propio | `sanitizeManualHtml` en `apps/web/lib/sanitize-manual-html.ts` | Ya existe, ya está probado contra XSS, y **es el único punto de verdad** — cualquier segundo sanitizador crearía dos allowlists que divergen con el tiempo |
| Resolver "razón social a mostrar" | Una nueva regla de fallback | `company.dc3LegalName ?? company.name` | Ya es la regla que usa el emisor DC-3; una segunda regla (aunque sea idéntica en texto) es una segunda fuente de verdad para el mismo dato |
| Bloqueo de concurrencia en versión | Un mutex/semáforo en aplicación | `SELECT ... FOR UPDATE` dentro de `$transaction` sobre `manual_documents` | Ya resuelto en fase 1; Postgres ya lo hace correctamente entre procesos/instancias, un mutex en memoria de Node no cubriría dos réplicas del servidor |
| Reordenar documentos/secciones | Drag-and-drop con una librería nueva | Flechas arriba/abajo + `reorderSections`-style action | Cero librerías de DnD en el repo; introducir una para esta fase sería la primera y única, inconsistente con el resto del producto |

**Key insight:** literalmente cada primitiva que esta fase necesita ya existe en el repo en una forma reutilizable. El trabajo de esta fase es reconectar primitivas, no inventarlas.

## Common Pitfalls

### Pitfall 1: "vigente" calculado como `max(version)` con `BORRADOR` en juego

**Qué sale mal:** en cuanto exista una fila `BORRADOR` con versión más alta que la `VIGENTE`, cualquier consulta que use `orderBy: { version: "desc" }` + tomar la primera empieza a devolver el borrador sin publicar como si fuera el documento oficial.
**Por qué pasa:** antes de esta fase, "vigente" y "versión más alta" eran sinónimos exactos (append-only sin estados). El nuevo estado `BORRADOR` rompe esa sinonimia.
**Cómo evitarlo:** ver la tabla completa de OPS-05 arriba — exactamente dos call sites (`getAssignmentPanel`, `getSectionForCompany`) necesitan el cambio a `where: { status: "VIGENTE" }`.
**Señales de alerta:** un cliente ve contenido que el consultor todavía no publicó; un consultor abre el panel de una empresa y ve "Descargar" apuntando a una fila sin `fileKey` (404 o crash).

### Pitfall 2: subir un archivo nuevo no degrada el `VIGENTE` anterior

**Qué sale mal:** `uploadCompanyDocument` sigue creando filas con el `status` por defecto (`VIGENTE`) sin tocar la fila anterior. Tras dos subidas de archivo para el mismo documento/empresa, hay dos filas `VIGENTE` simultáneas.
**Por qué pasa:** `uploadCompanyDocument` es código de la fase 1/pre-existente; nunca tuvo que pensar en "degradar" nada porque `status` no existía.
**Cómo evitarlo:** dentro de la misma transacción con lock, antes del `create`, un `updateMany({ where: { documentId, companyId, status: "VIGENTE" }, data: { status: "OBSOLETO" } })`.
**Señales de alerta:** una consulta `where: { status: "VIGENTE" }` devuelve más de una fila para el mismo `(documentId, companyId)`.

### Pitfall 3: los encabezados de Word se pierden al importar

**Qué sale mal:** el `styleMap` por defecto de mammoth convierte "Heading 1" de Word en `<h1>`; el allowlist del sanitizador sólo permite `h2`, `h3`, `h4`. Sin un `styleMap` propio, el título principal del documento importado llega a la base como texto plano sin etiqueta (el sanitizador descarta la etiqueta pero conserva el texto, por defecto `disallowedTagsMode: "discard"`).
**Por qué pasa:** nadie coordinó el mapeo de estilos de mammoth con el allowlist del sanitizador — son dos configuraciones independientes escritas en momentos distintos.
**Cómo evitarlo:** pasar un `styleMap` explícito a `convertToHtml` que remapee `Heading 1/2/3` → `h2/h3/h4` (ver Code Examples).
**Señales de alerta:** un documento importado se ve "plano", sin ningún encabezado destacado, aunque en Word tenía títulos con estilo.

### Pitfall 4: las imágenes de Word "desaparecen" sin explicación

**Qué sale mal:** mammoth embebe imágenes por defecto como `<img src="data:image/...;base64,...">`. El sanitizador sólo permite los esquemas `http`, `https`, `mailto` — `data:` no está en la lista, así que `sanitizeManualHtml` elimina el atributo `src` (comportamiento confirmado en la documentación oficial de `sanitize-html`: el tag sobrevive, el atributo con esquema no permitido se cae) y queda un `<img>` sin fuente, invisible.
**Por qño pasa:** dos defaults razonables por separado (mammoth embebe imágenes; el sanitizador no permite `data:`) que combinados producen una pérdida silenciosa.
**Cómo evitarlo:** dos opciones válidas — (a) sobrescribir `convertImage` en la llamada a `convertToHtml` para no embeber imágenes (evita hinchar el HTML con base64 que se va a tirar de todos modos), o (b) dejarlo pasar y aceptar el `<img>` vacío, avisando en la ayuda del importador. Dado que "Adjuntos dentro de un documento → no en esta entrega" ya es una decisión explícita del CONTEXT, la opción (a) es la más coherente: no tiene sentido transportar megabytes de base64 por la red y la base de datos para que el sanitizador los tire un instante después.
**Señales de alerta:** un `.docx` con fotos o diagramas se importa "bien" (sin error) pero el resultado no muestra ninguna imagen.

### Pitfall 5: `readPrivateFile` recibe `null` y TypeScript (o runtime) explota

Ver tabla de "fileKey nullable" arriba — es el mismo pitfall que #1 de la fase 2 (Evidence), ya resuelto una vez en `apps/web/app/files/evidence/[id]/route.ts`.

### Pitfall 6: no hay datos de manual/documento en el seed

**Qué sale mal:** `packages/db/prisma/seed.ts` no crea NINGÚN `Manual`, `ManualChapter`, `ManualSection`, `ManualDocument` ni `ManualAssignment` — sólo crea `Company` (Acme Corp) y datos de cursos/evaluaciones/talleres. Todo lo que existe hoy en el módulo documental de la base local fue creado a mano vía UI en fases anteriores.
**Por qué importa para esta fase:** los criterios de éxito 1-7 requieren un manual publicado, con al menos un documento de tipo `PROCEDIMIENTO`, enlazado a una sección, y activado (asignado) para **dos** empresas — nada de eso existe todavía ni en el seed ni, previsiblemente, en la base local salvo lo que quede de pruebas de evidencia de fases 1-2.
**Cómo evitarlo:** el plan necesita un paso explícito (seed o script de setup, o una secuencia de acciones manuales documentada) que cree: la segunda empresa (ver siguiente sección), un manual publicado con al menos una sección, un `ManualDocument` de `kind: PROCEDIMIENTO`, y dos `ManualAssignment` (uno por empresa) — antes de poder verificar cualquier criterio de esta fase.
**Nota:** el TODO ya registrado en `STATE.md` ("Falta una segunda empresa en el seed") sólo cubre la empresa; no cubre el manual/documento, que tampoco existe.

## Segunda empresa en el seed

`packages/db/prisma/seed.ts:1027-1036` crea sólo `Acme Corp`:

```typescript
const acmeCorp = await prisma.company.create({
  data: {
    tenantId: tenant.id,
    name: "Acme Corp",
    slug: "acme-corp",
    contactEmail: "rh@acmecorp.com",
    seatsLimit: 50,
    allowMemberInvitations: true,
  },
});
```

El modelo `Company` (`packages/db/prisma/schema.prisma:1573-1638`) sólo exige `tenantId`, `name` y `slug` (con `@@unique([tenantId, slug])`); todo lo demás (`logo`, `contactEmail`, `seatsLimit`, los campos `dc3*`) es opcional. Una segunda empresa mínima y válida es:

```typescript
const secondCompany = await prisma.company.create({
  data: {
    tenantId: tenant.id,
    name: "Nombre de la segunda empresa",
    slug: "segunda-empresa", // único dentro del tenant
  },
});
```

Va inmediatamente después de la creación de `acmeCorp` (línea ~1036), antes del bloque de logging final. No necesita miembros ni cursos asignados para servir al criterio 1 de esta fase (sólo necesita poder recibir un `ManualAssignment`), aunque si el plan quiere demostrar personalización con logos distintos, conviene darle un `logo` propio (o dejarlo `null` y usar el fallback del tenant, según cómo se resuelva `DocumentIdentity`).

## Code Examples

### `mammoth.convertToHtml` con `styleMap` para el importador

```typescript
// Fuente: patrón de apps/web/app/api/upload/extract-text/route.ts,
// combinado con opciones documentadas en Context7 (/mwilliamson/mammoth.js)
const mammoth = await import("mammoth");
const result = await mammoth.convertToHtml(
  { buffer },
  {
    styleMap: [
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h3:fresh",
      "p[style-name='Heading 3'] => h4:fresh",
      "p[style-name='Título 1'] => h2:fresh", // variantes en español de Word
      "p[style-name='Título 2'] => h3:fresh",
    ],
    // Evita embeber imágenes en base64 que el sanitizador va a descartar
    // de todos modos (allowedSchemes no incluye "data").
    convertImage: mammoth.images.imgElement(() => Promise.resolve({})),
  },
);
const rawHtml = result.value; // puede incluir <table>, <tr>, <td colspan="2">, etc.
const safeHtml = sanitizeManualHtml(rawHtml); // OBLIGATORIO antes de tocar la base
```

### Guard de `fileKey` nulo — copiado del patrón ya existente para `Evidence`

```typescript
// apps/web/app/files/evidence/[id]/route.ts:39 (patrón ya en producción)
if (!evidence?.fileKey || evidence.deletedAt) {
  return new NextResponse("No encontrado", { status: 404 });
}

// Aplicar exactamente igual en apps/web/app/files/company-document/[id]/route.ts,
// justo después del findUnique:
if (!doc.fileKey) {
  return new NextResponse("No encontrado", { status: 404 });
}
```

### Fix de OPS-05 en `getSectionForCompany` (y análogo en `getAssignmentPanel`)

```typescript
// apps/web/lib/queries/manual.ts:556 — ANTES
db.companyDocument.findMany({
  where: {
    companyId: assignment.companyId,
    document: { sections: { some: { sectionId } } },
  },
  orderBy: [{ documentId: "asc" }, { version: "desc" }],
  select: { id: true, documentId: true, version: true, codeOverride: true, fileName: true, fileSize: true },
});

// DESPUÉS
db.companyDocument.findMany({
  where: {
    companyId: assignment.companyId,
    status: "VIGENTE", // <- el cambio de OPS-05
    document: { sections: { some: { sectionId } } },
  },
  orderBy: [{ documentId: "asc" }, { version: "desc" }],
  select: {
    id: true, documentId: true, version: true, codeOverride: true,
    nameOverride: true, kind: true, fileName: true, fileSize: true, status: true,
  },
});
```

### Degradar el `VIGENTE` anterior en `uploadCompanyDocument`

```typescript
// Dentro del mismo db.$transaction, después del FOR UPDATE y antes del create:
await tx.companyDocument.updateMany({
  where: { documentId: input.documentId, companyId: assignment.companyId, status: "VIGENTE" },
  data: { status: "OBSOLETO" },
});
```

## State of the Art

No aplica un cuadro "enfoque viejo vs nuevo" del ecosistema — esto no es una migración de librería. El único cambio de "estado del arte" es interno al proyecto: pasar de "versión = vigente" (append-only puro, fases 1-2) a "estatus explícito, versión es sólo un contador" (esta fase). Es el mismo tipo de cambio que ya vivió `Evidence` cuando se le agregó `formSnapshot` tipado y versionado en la fase 1 — incluso puede citarse como precedente directo de "cómo el repo ya maneja introducir un campo discriminante sin romper lecturas existentes".

## Open Questions

1. **¿`ManualDocument.templateVersion` sube en cada guardado, o sólo cuando cambia `contentHtml` de verdad?**
   - Qué se sabe: el CONTEXT dice que `templateVersion` es lo que hace visible "hay una plantilla más reciente" comparándolo con `CompanyDocument.sourceTemplateVersion`. No especifica la política de incremento.
   - Qué no está claro: si guardar dos veces sin cambios reales debe o no incrementar el contador (paralelo al problema que `BORRADOR` resuelve para `CompanyDocument`, pero aquí no hay campo `status` en `ManualDocument` — el schema del CONTEXT no le agrega uno).
   - Recomendación: dado que `ManualDocument` no tiene `status`, lo más simple y consistente con "todo aditivo, sin sobre-ingeniería" es incrementar `templateVersion` sólo cuando el `contentHtml` guardado difiere del anterior (comparación de string), no en cada click de "Guardar". Confirmarlo con el usuario si el plan quiere desviarse.

2. **¿La primera emisión ("Emitir a una empresa") crea `CompanyDocument` directo en `VIGENTE`, o pasa por `BORRADOR → publicar` como cualquier edición posterior?**
   - Qué se sabe: el criterio de éxito 1 dice que tras emitir, la empresa ya lo ve — sin mencionar un paso de "publicar" intermedio. La sección "El bucle de edición (BORRADOR)" del CONTEXT describe explícitamente la edición de un documento **ya existente**, no la primera emisión.
   - Qué no está claro: si "Emitir" es un atajo que crea la versión 1 directo en `VIGENTE` (más simple, menos pasos para el caso feliz), o si por consistencia de código también crea version 1 en `BORRADOR` y el propio botón "Emitir" internamente llama a "publicar" acto seguido (mismo código, cero casos especiales).
   - Recomendación: la segunda opción (reusar el mismo path de publicación también para la primera emisión) es más barata de mantener — un solo camino de código para "crear versión válida" en vez de dos. Es una decisión de implementación, no de producto; el planner puede resolverla libremente.

3. **¿La sección "Documentos de la empresa" del panel de consultor (`company-project-panel.tsx`) debe mostrar documentos nativos (`PROCEDIMIENTO`) además de los `FILE`?**
   - Qué se sabe: hoy esa lista itera `assignment.manual.documents` (el catálogo completo del manual, sin filtrar por `kind`) y para cada uno busca su `CompanyDocument` correspondiente. Tras esta fase, ese catálogo va a incluir también documentos `PROCEDIMIENTO`.
   - Qué no está claro: si el consultor debe poder ver/enlazar desde ahí al editor nuevo (`/tenant-admin/manuals/[id]/documents/[documentId]/`), o si esa sección se queda deliberadamente FILE-only y los documentos nativos sólo se gestionan desde el catálogo del manual.
   - Recomendación: como mínimo, ocultar el botón `CompanyDocumentUpload` (subir archivo) para `kind !== "FILE"` — subir un archivo sobre un documento nativo no tiene sentido semántico. Mostrar o no un enlace de conveniencia al editor es una mejora de UX opcional, no un requisito de los 7 criterios de éxito.

## Sources

### Primary (HIGH confidence — lectura directa del código del repo)

- `packages/db/prisma/schema.prisma` — modelos `Company`, `CompanyDocument`, `ManualDocument`, `Evidence`, enums `ManualItemKind`, `EvidenceRequirementKind`, `EvidenceStatus`
- `apps/web/lib/queries/manual.ts` — `getAssignmentPanel`, `getSectionForCompany`, `getManualForEdit`, todos los `db.companyDocument.findMany`
- `apps/web/lib/actions/manual.ts` — `uploadCompanyDocument`, `deleteManualDocument`, `createManualDocument`, `updateSection`, `reorderSections`, `activateManualForCompany`
- `apps/web/lib/manual-access.ts` — los tres círculos de acceso (autoría/revisión/cliente) y todos los `requireX`
- `apps/web/lib/sanitize-manual-html.ts` — allowlist exacto de tags/atributos/esquemas
- `apps/web/app/files/company-document/[id]/route.ts`, `apps/web/app/files/evidence/[id]/route.ts` — comparación del guard de `fileKey` nulo
- `apps/web/app/dashboard/manuals/[assignmentId]/sections/[sectionId]/page.tsx`, `apps/web/components/company-project-panel.tsx` — los dos consumidores de las queries de OPS-05
- `apps/web/lib/certificate-templates/index.tsx`, `apps/web/lib/dc3/readiness.ts:181`, `apps/web/components/tenant-brand.tsx` — patrones para `DocumentIdentity`
- `apps/web/app/tenant-admin/manuals/[id]/sections/[sectionId]/section-content-editor.tsx` — maqueta del editor
- `apps/web/app/api/upload/extract-text/route.ts` — patrón de ruta para el import `.docx`
- `apps/web/lib/actions/risk.ts` — patrón de compensating rollback
- `packages/db/prisma/seed.ts` — confirmado: ninguna empresa/manual además de Acme Corp
- `apps/web/package.json`, `pnpm-lock.yaml` — versiones exactas de `mammoth` (^1.12.0) y `sanitize-html` (^2.17.7)
- `packages/typescript-config/base.json:16` — `strict: true` confirmado
- `git log` / `git show 5e2352d` — confirmado que el fix del 401 está en `main` pero no en producción (`55c020d`)

### Secondary (HIGH confidence — Context7, docs oficiales)

- Context7 `/mwilliamson/mammoth.js` — API de `convertToHtml`, `styleMap`, `convertImage`, tipos internos `TableRow`/`TableCell` (`colSpan`/`rowSpan`), y la afirmación textual del README: *"Table formatting like borders is ignored"* y *"generally ignores specific styling details like font or color"*
- Context7 `/apostrophecms/sanitize-html` — comportamiento confirmado de `allowedSchemes`: un esquema no permitido elimina el atributo, no el tag completo (ejemplo oficial: `<a href="javascript:...">` → `<a>`, no se borra el `<a>`)
- Context7 `/prisma/web` — confirmación de que Prisma sólo emite `ALTER TYPE ... ADD VALUE` al **añadir un valor a un enum ya existente**; crear un enum nuevo es `CREATE TYPE`, sin esa restricción de transacción. La versión instalada es Prisma 5.22 (no 8, que es de donde viene la cita textual), pero el comportamiento de "enum nuevo = CREATE TYPE simple" es invariante desde las primeras versiones de `prisma db push` — es SQL estándar de Postgres, no una feature versionada de Prisma

### Tertiary (LOW confidence / a validar en ejecución)

- Ninguna. Todo lo relevante para planear esta fase se pudo verificar contra código real o documentación oficial.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no hay librerías nuevas; versiones confirmadas en el lockfile
- Architecture: HIGH — todos los patrones citados con archivo:línea exacto, leídos directamente
- OPS-05 call sites: HIGH — enumeración exhaustiva vía grep de `.companyDocument.` en todo `apps/web` (excluyendo build output), cada uno leído y clasificado
- `.docx` / mammoth: HIGH — comportamiento de tablas, estilos y esquemas confirmado con la documentación oficial de mammoth y sanitize-html vía Context7, no sólo inferido
- `db push` + enums nuevos: MEDIUM-HIGH — el mecanismo general (`CREATE TYPE` para enum nuevo, sin el caveat de `ALTER TYPE ADD VALUE`) es SQL/Prisma estándar y de bajo riesgo, pero no se ejecutó un `db push` real contra un schema con estos cambios como parte de este research; recomendado como primer paso de verificación al ejecutar el plan
- Seed / segunda empresa: HIGH — leído directamente, campos mínimos del modelo `Company` confirmados

**Research date:** 2026-09-02
**Valid until:** mientras no cambien las dependencias (`mammoth`, `sanitize-html`) o el schema de `CompanyDocument`/`ManualDocument` fuera de lo aquí descrito — no hay fecha de caducidad natural, es research contra código propio, no contra un ecosistema externo cambiante
