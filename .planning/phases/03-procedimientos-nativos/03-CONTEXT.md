# Phase 3: Procedimientos nativos — Context

**Gathered:** 2026-09-02
**Status:** Ready for planning
**Source:** Plan aprobado (`~/.claude/plans/ayudame-a-planificar-como-delegated-diffie.md`)
+ dos decisiones tomadas con el usuario el 2026-09-02.

<domain>
## Phase Boundary

**Dentro:** que un procedimiento —texto y tablas, sin campos llenables— se
redacte o se importe dentro de la plataforma, se emita a cada empresa con su
marca y su código, y se versione con historial visible. Es el arquetipo
`P-RFC-4.1-01` del piloto: lo que la consultora escribe y el cliente **adopta**.

**Fuera, y nombrado para que nadie lo improvise:**

| Fuera | Dónde vive |
|---|---|
| Exportación a PDF | Fase 4 — esta fase se demuestra en pantalla |
| Registros llenables (`formSchema`, `CompanyRecord`, bloques) | Fase 5 |
| Subida directa por URL firmada | Fase 6 |
| Los dos `EvidenceRequirementKind` nuevos y el cableado a evidencia | Fase 5 |

**La fase 7 ya no existe.** Su contenido —importación `.docx`, DOC-02— está
dentro de esta fase por decisión del usuario. Ver `<decisions>`.
</domain>

<decisions>
## Implementation Decisions

Todo lo de esta sección está **cerrado**. No son sugerencias.

### Decisiones tomadas el 2026-09-02 (cambian el roadmap)

**1. La importación `.docx` se adelanta desde la fase 7, que queda absorbida.**
`mammoth` ya está instalado y en uso (`api/upload/extract-text/route.ts` llama a
`extractRawText`); la misma dependencia expone `convertToHtml`, que **preserva
tablas**. El motivo del adelanto no es de coste sino de secuencia: dejarla al
final significaba que entre la fase 3 y aquélla la única vía para cargar el
catálogo (~60 documentos ya maquetados) era escribir HTML a mano.
DOC-02 pasa a ser el criterio 6 de esta fase, sin rebajarse.

**2. La fase cierra con un despliegue a producción con checkpoint**, igual que
hizo la fase 2. Arrastra además el arreglo del 401 (`5e2352d`), que hoy **sigue
sin desplegar**: producción está en `55c020d` y devuelve 403 sin sesión.
El módulo sigue apagado (`documents_enabled = false` en los tres tenants); no se
enciende en esta fase.

### Modelo de datos — todo aditivo

`db push` sin directorio de migraciones. Cambios aditivos, salvo relajar
`NOT NULL` en cuatro columnas, que `db push` aplica sin pérdida ni backfill.

**Enums nuevos:**
- `ManualDocumentKind { FILE PROCEDIMIENTO REGISTRO }`
- `CompanyDocumentStatus { BORRADOR VIGENTE OBSOLETO }`

**`kind` tiene tres valores, no `FILE|NATIVE`.** Con dos, cada lector tendría que
preguntar después `formSchema != null` para saber cuál de los dos arquetipos
nativos es: un estado ternario codificado como booleano más campo opcional. La
UX ramifica en tres y el precedente del repo es enum explícito (`ManualItemKind`,
`EvaluationKind`). Va **denormalizado también en `CompanyDocument`** —igual que
`Evidence.kind` ya lo está— porque un documento puede convertirse de `FILE` a
`PROCEDIMIENTO` tras importar el Word, y la v1 con `fileKey` no debe intentar
renderizarse como nativa.

**`ManualDocument`** `+ kind` · `+ contentHtml String? @db.Text` (saneado en
escritura) · `+ templateVersion Int @default(1)`.

**`CompanyDocument`** `+ kind` · `+ contentHtml String? @db.Text` (snapshot al
emitir) · `+ nameOverride String?` (simétrico al `codeOverride` que ya existe) ·
`+ status CompanyDocumentStatus @default(VIGENTE)` · `+ sourceTemplateVersion Int?` ·
`+ publishedAt DateTime?` / `+ publishedById String?` · y `fileKey` / `fileName` /
`fileSize` / `mimeType` pasan a **nullable**.

**`formSchema` NO se añade en esta fase.** Es de los registros (fase 5), y `db push`
aditivo es barato: no hay razón para adelantar columnas que nadie va a leer.

### El bucle de edición (`BORRADOR`)

Sin esto, cada guardado crea una versión y se llega a la 47. Se edita **en sitio**
sobre la versión más alta mientras `status = BORRADOR`. "Publicar" la pasa a
`VIGENTE` y degrada la anterior a `OBSOLETO`. La siguiente edición abre un nuevo
`BORRADOR` en `max+1`. **Append-only se conserva para lo publicado.**

### Congelado en la emisión

Emitir a una empresa crea `CompanyDocument` con `contentHtml` **congelado en ese
momento** y `sourceTemplateVersion` apuntando al `templateVersion` de origen.
Editar la plantilla después no cambia lo que la empresa adoptó. Eso convierte el
`Manual.version` decorativo en algo visible: *"Tu versión: 2 (basada en plantilla
v3). Hay una más reciente: v5"*, y el consultor ve qué empresas van atrasadas
(DOC-07).

### Personalización en tiempo de render

**El logo se lee en vivo; lo acreditativo se congela.** Es la convención que ya
sigue el DC-3 ("son marca, no dato acreditativo"). Cambiar el logo de una empresa
**re-renderiza todos sus documentos sin regenerar nada** — la ventaja principal
sobre generar `.docx` con plantillas.

Se resuelve **una vez** en `DocumentIdentity` y se entrega ya resuelta, siguiendo
el patrón `renderCertificate(templateId, data)` de `certificate-templates/index.tsx`
("sin nulls que la plantilla tenga que interpretar"). Campos: razón social
(`Company.dc3LegalName ?? Company.name`, el mismo fallback que ya aplica el emisor
DC-3), logo, código (`codeOverride ?? code`), nombre (`nameOverride ?? name`),
versión, estatus, fecha, `Manual.normaLabel`, tenant.

Split puro/servidor según la convención del repo: `document-identity.ts` (puro,
importable desde cliente) y `resolve-identity.ts` (sólo servidor).

### La tabla de control de cambios no se redacta a mano

Se genera en tiempo de render desde el historial de filas de `CompanyDocument`.
El consultor nunca la mantiene. Las cinco columnas de DOC-05 —versión, fecha,
autor, descripción del cambio, estatus— salen de columnas que ya existen:
`version`, `createdAt`, `uploadedById`, y **`notes` reutilizado como "descripción
del cambio"** (ya es `@db.Text` y el flujo de subida ya lo usa para eso).

### Editor

**Cuerpo en HTML saneado, no modelo de bloques.** Es lo que ya se guarda, sanea,
renderiza y estiliza; permite pegar desde documentos ya maquetados; y
`mammoth.convertToHtml` lo produce sin trabajo extra. Modelar el cuerpo como
bloques exigiría un WYSIWYG que el repo no tiene (cero tiptap/prosemirror/slate/
lexical) y **perdería el flujo de pegado**.

**Maqueta: la de `section-content-editor.tsx`** (150 líneas) — textarea mono,
toggle `Eye` a vista previa, misma línea de ayuda. Ruta:
`app/tenant-admin/manuals/[id]/documents/[documentId]/`.

**Cliente:** `app/dashboard/documents/` (lista maestra + `[companyDocumentId]`).

### El invariante del sanitizador

`sanitizeManualHtml` tiene un allowlist **cerrado** (~30 etiquetas, incluidas
`table/thead/tbody/tfoot/tr/th/td/caption` con `colspan`/`rowspan`, ya estilizadas
por `manual-content.css` con scroll horizontal propio). Hoy sólo se aplica a
cuerpos de sección. **Cada camino nuevo de escritura de HTML —cuerpo de documento,
importación `.docx`— tiene que pasar por él ANTES de la base.** El código nuevo no
puede ser la excepción al invariante. `manual-content.tsx` sigue siendo el único
`dangerouslySetInnerHTML` del proyecto.

### Enmienda del 2026-09-02: tres preguntas que dejó abiertas la investigación

Resueltas para que el planificador no las improvise ni las deje a criterio del
ejecutor. Ninguna cambia el alcance.

**a) `ManualDocument.templateVersion` sube sólo cuando el contenido cambia de
verdad**, no en cada guardado. Es un número que el cliente ve ("basada en plantilla
v3") y que alimenta la insignia de DOC-07; si subiera con cada pulsación de guardar,
la insignia de "hay una versión más reciente" se dispararía por cambios que no
existen y dejaría de significar nada.

**b) "Emitir" crea la fila directamente en `VIGENTE`**, sin pasar por `BORRADOR`.
El bucle de borrador existe para que editar no genere basura de versiones; emitir
no es editar, es adoptar una plantilla ya terminada. Un borrador vacío recién
emitido sería un estado que nadie pidió y que además rompería el criterio 5 desde
el primer minuto.

**c) El panel del consultor sí lista los documentos nativos**, con el botón de
subida oculto para los `kind` distintos de `FILE`. Esconderlos sería peor: el
consultor perdería la vista de qué tiene emitida cada empresa justo cuando esta
fase existe para dársela.

### Enmienda del 2026-09-02: un hueco que el contexto no vio

La investigación encontró algo que este documento no recogía y que el modelo exige:
**`uploadCompanyDocument` tiene que degradar a `OBSOLETO` la fila `VIGENTE` anterior**
dentro de la transacción que ya tiene. Sin eso, el invariante "como mucho una
`VIGENTE` por (documento, empresa)" se rompe para los documentos de tipo `FILE`
—los que se siguen subiendo como archivo— incluso después de arreglar las dos
consultas de OPS-05. No es opcional: es parte del criterio 5.

### Convenciones del repo que aplican aquí

- Server actions en `lib/actions/*`; capa de consulta RSC en `lib/queries/*` con
  `cache()` de React; route handlers **sólo** cuando hace falta devolver `Response`.
  La importación `.docx` recibe un `File` de un `FormData` → es ruta, no acción.
- **Nada de despacho, correo ni planificación en ficheros `"use server"`**: toda
  exportación async ahí es un RPC público.
- Filtro de tenant fail-closed: `tenantId: user.tenantId ?? "__none__"`.
- Incremento de versión con lock de fila:
  `` await tx.$queryRaw`SELECT 1 FROM <tabla> WHERE id = ${id} FOR UPDATE` `` dentro
  de `db.$transaction`. Para `CompanyDocument` se bloquea **`manual_documents`**, no
  `company_documents` — el par (documento, empresa) puede no tener ninguna fila
  todavía, y un `FOR UPDATE` sobre cero filas no bloquea nada. Ya implementado en
  la fase 1 (`160bc5a`); reutilizarlo, no reinventarlo.
</decisions>

<specifics>
## Riesgos concretos, ya identificados contra el código

**1. Deriva semántica de `CompanyDocument` — el bug silencioso más probable de la
fase (OPS-05).** Hoy `max(version)` significa "vigente" y **ya se usa**:
`app/dashboard/manuals/[assignmentId]/sections/[sectionId]/page.tsx` construye
`companyDocByDocumentId` con la de mayor versión asumiendo "documento vigente".
Con versiones `BORRADOR`, la más alta puede estar sin publicar, y esa pantalla
—que hoy funciona— empezaría a mostrar el borrador. **Hay que enumerar los puntos
de llamada y pasarlos todos a `status = VIGENTE` ordenado por versión desc.**
Es el criterio 5 de la fase.

**2. `fileKey` pasa a nullable y todos los lectores actuales lo asumen no-nulo.**
`/files/company-document/[id]` se lo pasa directo a `readPrivateFile`; la página
de sección enlaza sin condición. **Grep de `fileKey` antes de tocar la columna.**

**3. `db push` y valores de enum.** Añadir valores a un enum existente en Postgres
puede requerir `ALTER TYPE ... ADD VALUE` fuera de transacción. Tener el SQL manual
a mano. (Los dos enums de esta fase son nuevos, así que probablemente no aplique —
pero conviene comprobarlo en vez de suponerlo.)

**4. Límite honesto de la importación `.docx`.** `convertToHtml` preserva tablas,
pero el sanitizador tiene allowlist cerrado: lo que Word meta fuera de él se cae.
El criterio es que **las tablas sobrevivan**, no que el documento salga idéntico.
Decirlo en la ayuda del importador en vez de dejar que se descubra.

## Estado del entorno que afecta a la verificación

- **El seed crea una sola empresa (Acme Corp), y el criterio 1 exige dos.**
  Pendiente arrastrado desde la fase 1. Hay que crear la segunda —en el seed, para
  que sea reproducible— antes de poder verificar esta fase.
- Base local en `localhost:5435`, con 14 modelos materializados y sembrada.
- Producción: `55c020d`, módulo documental apagado, backend de archivos en R2.
- La fase 1 dejó dos filas de `Evidence` en la base local (`1|f` y `2|t`) como
  banco de pruebas de `formSnapshot`. **No borrarlas.**
- **Los ejecutores en paralelo se pisan el índice de git** (`branching_strategy:
  "none"`). En la fase 1 dos agentes sobre el mismo working tree se absorbieron
  archivos entre el `add` y el `commit`. La fase 2 lo resolvió con **un plan por
  ola** y funcionó. Mantener esa disciplina.
</specifics>

<deferred>
## Deferred Ideas

- **PDF de procedimientos** → fase 4. Esta fase se demuestra en pantalla.
- **`Manual.version` sigue decorativo para las secciones.** Los documentos reciben
  arreglo real (snapshot + insignia de versión más reciente); las secciones no —
  un cliente puede ver cómo le cambia la narrativa a mitad de auditoría.
  **Brecha remanente declarada, no olvidada.**
- **Adjuntos dentro de un documento** → no en esta entrega. Una sección declara
  varios requisitos; un adjunto es un requisito `FILE` aparte.
- **Exportación masiva del juego documental** → no. El limitador de 60/min por IP
  en `/api/*` lo agotaría desde un NAT corporativo. Si hace falta, colgarla de
  `/files/*`.
- **Encender `documents_enabled`** → decisión de producto, fuera de esta fase.
</deferred>

---

*Phase: 03-procedimientos-nativos*
*Context sembrado el 2026-09-02 desde el plan aprobado + decisiones del usuario*
