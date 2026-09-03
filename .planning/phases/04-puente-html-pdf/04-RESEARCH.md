# Phase 4: Puente HTML→PDF - Research

**Researched:** 2026-09-03
**Domain:** Server-side PDF generation from sanitized HTML (react-pdf), Next.js route handlers
**Confidence:** MEDIUM-HIGH (stack and architecture HIGH; the one open mechanical risk — table header repetition across page breaks — is MEDIUM, community-verified, not officially documented)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Alcance del puente**
- El puente es literal: `@react-pdf/renderer` no consume HTML, así que la fase construye un mapeador del allowlist cerrado de `sanitizeManualHtml` (~30 etiquetas, en realidad 36 tags contadas en el archivo real) a primitivas de react-pdf. No se introduce un motor de maquetación nuevo, ni Chromium, ni ninguna dependencia de renderizado adicional.
- Fuera de esta fase: PDF de registros llenables desde snapshot (PDF-03, fase 5); `rowspan` real (fuera del milestone); imágenes remotas `https://` en el PDF (fuera del milestone, SSRF + latencia); exportación masiva (limitador 60/min); encender `documents_enabled` (decisión de producto).
- Instrucción explícita del usuario (2026-09-03): «ya no le des más vueltas, hazlo más sencillo esta fase para cerrarle y avanza». Ante dos caminos que cumplen los cuatro criterios, se toma el de menos piezas. Nada de configurabilidad, plantillas alternativas ni opciones de exportación.

**Encabezado, pie y sellos**
- Banda fija en todas las páginas (logo, código, nombre, versión) + bloque completo de identidad en la primera página (razón social, estatus, fecha, norma).
- Pie: «`<código>` · v`<versión>` — Página X de Y», con `render={({ pageNumber, totalPages }) => …}` y `fixed`.
- Marca de agua diagonal para BORRADOR y OBSOLETO en cada página, reutilizando el patrón de `CertificateRenderData.watermark`. VIGENTE no lleva sello.
- El aviso de DOC-07 ("hay una versión más reciente") NO viaja al PDF — es estado vivo de la plataforma, envejece mal impreso.

**Entrega de la descarga**
- Route handler `GET`, no server action — copia exacta del patrón de `app/api/dc3/[id]/pdf/route.tsx`: `renderToStream(pdf)` → `new NextResponse(stream as unknown as ReadableStream, …)`.
- Cabeceras idénticas al DC-3/diploma: `Content-Type: application/pdf` + `Content-Disposition: inline; filename="<código>-v<versión>.pdf"`.
- Autorización reutilizada, nunca reinventada: la ruta de documento de empresa se apoya en `getCompanyDocumentForClient` → `requireAssignmentMemberAccess`; la de plantilla, en `requireManualAdmin`.
- Sin bitácora de descargas (a diferencia del DC-3, que sí la lleva por acreditar a una persona).

**La vista previa ES el PDF (criterio 4)**
- Se cumple por construcción: el toggle `Eye` de `document-body-editor.tsx` deja de pintar `ManualContent` y pasa a incrustar la misma ruta de PDF. Un mismo render, un mismo byte stream — no una maqueta HTML que "se parezca".

**Fidelidad del mapeo — reglas, no configuración**
- Las tablas son el corazón de la fase: bordes visibles en todas las celdas y `wrap={false}` en cada fila (criterio 2). El `<thead>` se repite si la tabla cruza páginas.
- Las clases decorativas de `manual-content.css` (`manual-card`, `manual-callout`, `manual-doc`, `manual-preview`…) se degradan a bloques legibles con jerarquía intacta, no se replican pixel a pixel.
- `rowspan`: la celda se renderiza en su propia fila + aviso (ya fuera de alcance en PROJECT.md/REQUIREMENTS.md).
- Imágenes remotas `https://`: marcador de posición, no se descargan. El logo de empresa sí se incrusta vía `loadUploadAsDataUrl`.
- Cualquier etiqueta del allowlist sin mapeo explícito cae a texto plano antes que a una excepción: un PDF pobre es recuperable, un 500 en la descarga no.

**Criterio 3 (logo en vivo)**
- Se cumple porque el PDF se genera por petición y el logo se lee en vivo — decisión ya tomada y demostrada en fase 3 (hashes antes/durante/después). No hay artefacto persistido ni caché que invalidar.

### Claude's Discretion
- Tamaño de página, orientación y márgenes; tipografía y escala.
- Qué hace la banda cuando la empresa no tiene logo (`DocumentIdentity.companyLogo` es el único opcional).
- Nombre largo del documento: recorte o salto de línea en la banda.
- Si la tabla de control de cambios (DOC-05) se incluye al final del PDF — por defecto **no** se incluye.
- Si la ruta de plantilla y la de empresa son dos handlers finos sobre un mismo módulo de render (preferido) o una sola ruta parametrizada.

### Deferred Ideas (OUT OF SCOPE)
- PDF de registros llenables desde snapshot (PDF-03) → fase 5.
- Bitácora de descargas del PDF → no en esta entrega.
- Tabla de control de cambios dentro del PDF → por defecto no.
- Exportación masiva del juego documental → sigue fuera (limitador 60/min).
- `rowspan` fiel e imágenes remotas → fuera del milestone.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| PDF-01 | Todo documento nativo se descarga en PDF con encabezado ISO y pie numerado | Confirmed `fixed` + `render={({pageNumber,totalPages})=>...}` pattern already proven in this repo (`app/api/evaluations/results/[assignmentId]/pdf/route.tsx:1141-1150`). Header band pattern from `document-identity.ts` / `DocumentIdentityHeader`. See "Architecture Patterns" and "Code Examples". |
| PDF-02 | Las tablas salen con bordes y ninguna fila se parte entre páginas | `wrap={false}` on row `View` is verified by react-pdf's own test suite to prevent mid-row splitting (see "Code Examples"). Header-repeat-on-break verified via community reports in `diegomura/react-pdf#2390` (see "Common Pitfalls" §1 and "State of the Art"). Full-grid borders require per-cell border props (no `border-collapse` primitive) — see "Common Pitfalls" §2. |
| PDF-04 | Cambiar el logo de una empresa actualiza sus PDFs sin regenerar nada | Already the established pattern: `loadUploadAsDataUrl` reads `Company.logo` live on every `GET`, proven end-to-end in `03-07-SUMMARY.md`. The PDF route repeats the exact same call — no new mechanism needed. |
</phase_requirements>

## Summary

`@react-pdf/renderer` (^4.3.2) is already in production for DC-3, diplomas, and evaluation-result reports — three independent, hand-rolled templates in `apps/web/lib/dc3/template.tsx`, `apps/web/lib/certificate-templates/*`, and `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx`. None of them consume a table library or a headless browser; all build `<View>`/`<Text>` trees by hand and use `StyleSheet.create`. This phase's only genuinely new piece of infrastructure is an **HTML→react-pdf mapper**: a small recursive function that walks the DOM tree of already-sanitized HTML (the output of `sanitizeManualHtml`, ~36 allowed tags) and emits the corresponding react-pdf primitives (`Text`, `View`, `Image`, table grid).

The sanitizer's own dependency chain (`sanitize-html` → `htmlparser2@12`) already resolves `htmlparser2`, `domhandler`, and `domutils` inside the pnpm lockfile as transitive dependencies — none of them are Chromium-adjacent or a layout engine; they are pure, small SAX/DOM parsers. Promoting `htmlparser2` (+ `domhandler` for TypeScript types) to a direct dependency of `apps/web` is the lowest-risk way to get a real DOM tree to walk, and does not violate the phase's "no new rendering engine" constraint — it parses markup, it doesn't render anything.

The one real open risk, already flagged in `STATE.md`, is whether a table's `<thead>` can repeat only on the pages the table itself spans (not the whole document). This is **not officially documented** by react-pdf, but it is empirically confirmed by multiple independent users in `diegomura/react-pdf#2390`: wrapping the header `<View fixed>` **inside** the table's own wrapping container (not on the `<Page>` itself) causes it to reprint only where that container's content continues onto a new page — exactly the scoped behavior this phase needs. A one-hour spike reproducing this against a real multi-page procedure (as already noted in `STATE.md`) is the right first task, with the fallback (a persistent code-column instead of full header) ready if it doesn't hold.

A second, non-obvious finding from reading the actual phase-3 code: `lib/documents/resolve-identity.ts` already contains `loadTemplatePreviewIdentity(documentId, companyId)`, written ahead of time in phase 3 for exactly this phase — but it is **unused anywhere in the codebase today**, and it requires a `companyId` that the plain "plantilla" editor route (`app/tenant-admin/manuals/[id]/documents/[documentId]/page.tsx`, `target.kind === "template"`) does not have. The direct precedent for resolving this is `app/api/certificates/preview/route.tsx`, which previews a diploma with no real student by substituting a fixed placeholder string (`"Nombre del Alumno"`) rather than borrowing a real entity's data — the same trick applies here.

**Primary recommendation:** Hand-roll the mapper and the table grid exactly like the existing DC-3/evaluation templates do (no third-party react-pdf table library), add `htmlparser2` + `domhandler` as direct `apps/web` dependencies to get a real DOM tree, and spike the `fixed`-inside-wrapping-container technique for table headers as the very first task before committing to the row-splitting strategy.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `@react-pdf/renderer` | `^4.3.2` (already in `apps/web/package.json`) | PDF document tree, layout, `renderToStream` | Already the only PDF engine in the repo (DC-3, diplomas, evaluation reports). No new engine, per explicit phase constraint. |
| `htmlparser2` | `^12.0.0` (already resolved transitively via `sanitize-html`'s dependency, present in `pnpm-lock.yaml`) | Parse the already-sanitized HTML string into a walkable DOM tree (`parseDocument`) | Pure SAX/DOM parser, no browser, no layout engine — consistent with "no dependencia de renderizado adicional." Promoting an already-resolved transitive dependency to direct is the lowest-risk way to add DOM parsing. |
| `domhandler` | `^5.0.3` / `^6.0.1` (already resolved transitively) | TypeScript types for the parsed nodes (`Element`, `Text`, `Document`) returned by `htmlparser2.parseDocument` | Ships with `htmlparser2`'s own DOM handler; needed as a **direct** dependency under pnpm's strict resolution if importing its types directly (e.g. `import type { Element } from "domhandler"`). |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `domutils` | `^3.2.2` (transitively resolved) | Convenience tree-walking helpers (`textContent`, `findAll`) | Optional — the mapper can walk `node.children` recursively by hand (same complexity as `domutils` for this narrow allowlist); only add if the recursive walker gets unwieldy. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled table grid (`View`/`Text` with explicit borders) | `@ag-media/react-pdf-table` or `@propra/react-pdf-table` (community table libraries for react-pdf, one recommended by the react-pdf maintainer himself in `#2390`) | Adds a new dependency for something the repo already does by hand three times (DC-3, evaluation report, certificate). Contradicts "hazlo más sencillo… menos piezas." Not recommended — hand-roll, matching existing precedent. |
| `htmlparser2` (SAX/DOM parser) | `cheerio`, `jsdom`, `node-html-parser` | None of these are already resolved in the lockfile; `jsdom` in particular is a full DOM implementation, heavier than needed and arguably closer to "motor de renderizado" than a parser. `htmlparser2` is the leanest option and is already vetted (it's what `sanitize-html` itself uses to sanitize on write). |
| Full HTML→PDF via a headless browser (Puppeteer/Playwright print-to-PDF) | — | **Explicitly forbidden by CONTEXT.md**: "no hay Chromium ni headless browser en el repo, y no se introduce uno." Not considered further. |

**Installation:**
```bash
pnpm --filter @prol/web add htmlparser2 domhandler
```
(`@react-pdf/renderer` is already installed — no change needed.)

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── lib/
│   └── documents/
│       ├── document-identity.ts          # existing (phase 3) — reused as-is
│       ├── resolve-identity.ts           # existing (phase 3) — loadCompanyDocumentIdentity reused;
│       │                                 #   loadTemplatePreviewIdentity needs its companyId
│       │                                 #   requirement resolved (see Open Questions)
│       └── pdf/
│           ├── html-to-pdf-nodes.ts      # NEW — recursive mapper: sanitized HTML string ->
│           │                             #   htmlparser2.parseDocument -> array of react-pdf nodes
│           └── document-pdf.tsx          # NEW — the Document/Page shell: header band, footer
│                                         #   (pageNumber/totalPages), watermark, wraps the
│                                         #   mapped body. ONE renderer, no variants (locked decision).
├── app/api/documents/
│   ├── template/[documentId]/pdf/route.tsx   # NEW — requireManualAdmin, loadTemplatePreviewIdentity
│   └── company/[companyDocumentId]/pdf/route.tsx  # NEW — getCompanyDocumentForClient (already
│                                                   #   wraps requireAssignmentMemberAccess)
```
This mirrors the existing split between `app/api/dc3/[id]/pdf/route.tsx` (real, authorized) and `app/api/certificates/preview/route.tsx` (preview, placeholder data) — two thin route handlers over one shared render module (`renderCertificate` there, `document-pdf.tsx` here), which is also explicitly the option CONTEXT.md marks as "preferido" under Claude's Discretion.

### Pattern 1: Route handler, exact copy of the DC-3 shape
**What:** `GET` route handler that authorizes, loads data, resolves the logo to a data URL live, builds the PDF element, `renderToStream`, returns `NextResponse`.
**When to use:** Both new PDF routes (template and company).
**Example:**
```tsx
// Source: apps/web/app/api/dc3/[id]/pdf/route.tsx (existing, verified pattern in this repo)
import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { loadUploadAsDataUrl } from "@/lib/certificate-assets";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyDocumentId: string }> }
) {
  const { companyDocumentId } = await params;
  const data = await getCompanyDocumentForClient(companyDocumentId).catch(() => null);
  if (!data) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (data.identity.kind === "FILE") {
    return NextResponse.json(
      { error: "Este documento no tiene cuerpo nativo que exportar" },
      { status: 409 }
    );
  }

  const companyLogoDataUrl = await loadUploadAsDataUrl(data.identity.companyLogo);
  const pdf = DocumentPdf({ identity: data.identity, contentHtml: data.contentHtml, companyLogoDataUrl });
  const stream = await renderToStream(pdf);

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.identity.code}-v${data.identity.version}.pdf"`,
    },
  });
}
```

### Pattern 2: Fixed header + numbered footer (PDF-01)
**What:** `<View fixed>` for the running band; `<Text render={...} fixed>` for `Página X de Y`.
**When to use:** Every page of the document, verified pattern already proven in this exact repo.
**Example:**
```tsx
// Source: apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx:1141-1150
// (already shipped, real code in this repo — not a hypothetical)
<View style={styles.footer} fixed>
  <Text>{`${identity.code} · v${identity.version}`}</Text>
  <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
</View>
```

### Pattern 3: Unbreakable table row (PDF-02, criterion 2)
**What:** `wrap={false}` on the row `<View>` prevents react-pdf from splitting its content across the page boundary — verified by react-pdf's own unit test suite (`packages/layout/tests/node/shouldBreak.test.ts`): a `View` with `wrap: false` taller than the remaining page height is moved whole to the next page instead of split.
**When to use:** Every `<tr>` mapped from the sanitized HTML.
**Example:**
```tsx
// Source: @react-pdf/renderer test suite (packages/layout/tests/node/shouldBreak.test.ts) +
// already-shipped usage in apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx:1018
<View key={row.id} style={styles.tableRow} wrap={false}>
  {/* cells */}
</View>
```
**Risk to plan for explicitly:** a row genuinely taller than one full page (huge cell content) will still be pushed to a mostly-blank next page rather than disappear — but there is no automatic "split it after all" fallback in react-pdf for `wrap={false}` content. The mapper needs an escape hatch (e.g. detect abnormally long cell text and fall back to `wrap: true` for that one row) so a pathological row degrades to "split ugly" instead of silently vanishing. This is exactly risk #2 already named in `04-CONTEXT.md`.

### Pattern 4: Repeating table header only across the table's own pages (PDF-02, criterion 2)
**What:** Nest the header `<View fixed>` **inside** the table's own outer `<View>`, not as a direct child of `<Page>`. Multiple independent users confirm this scopes the repeat to only the pages the table spans, unlike putting `fixed` at the page level (which would print the header on every page of the whole document, even pages with no table).
**When to use:** Any `<table>` from the sanitized HTML that has a `<thead>`.
**Example:**
```tsx
// Source: github.com/diegomura/react-pdf issue #2390, comment by t-gomez (2023-09-13),
// confirmed reproducible by original reporter jimmcslim and by Andres6936 in #2099
<View style={styles.table}>
  <View style={styles.tableHeaderRow} fixed>
    <Text style={styles.th}>Columna 1</Text>
    <Text style={styles.th}>Columna 2</Text>
  </View>
  {rows.map((row) => (
    <View key={row.id} style={styles.tableRow} wrap={false}>
      <Text style={styles.td}>{row.cell1}</Text>
      <Text style={styles.td}>{row.cell2}</Text>
    </View>
  ))}
</View>
```
**Confidence: MEDIUM.** Not in official react-pdf docs — verified only via community GitHub reports (multiple independent confirmations, no contradicting reports found). Treat the one-hour spike named in `STATE.md` as mandatory before committing to this as the sole mechanism; the CONTEXT.md-mandated fallback (repeating just the document code in a corner, or accepting a single un-repeated header) should be scripted as a fast pivot if the spike shows the header leaking onto non-table pages or not reprinting at all.

### Pattern 5: HTML → react-pdf node mapping
**What:** Parse the (already sanitized) HTML string once per request with `htmlparser2.parseDocument`, then recursively walk `node.children`, switching on `node.type`/`node.name` to emit the matching react-pdf primitive. Unknown or unmapped allowed tags fall through to plain `<Text>` (locked decision: "un PDF pobre es recuperable, un 500 en la descarga no").
**When to use:** Once, on the full `contentHtml` of the document/company snapshot.
**Example:**
```tsx
// Illustrative structure, not shipped code — matches the pattern
// htmlparser2's own README demonstrates for parseDocument (Context7-verified).
import { parseDocument } from "htmlparser2";
import type { AnyNode, Element } from "domhandler";

function isElement(node: AnyNode): node is Element {
  return node.type === "tag";
}

function mapNode(node: AnyNode): React.ReactNode {
  if (node.type === "text") return node.data;
  if (!isElement(node)) return null;

  switch (node.name) {
    case "h2": return <Text style={styles.h2}>{node.children.map(mapNode)}</Text>;
    case "p": return <Text style={styles.p}>{node.children.map(mapNode)}</Text>;
    case "table": return <TableFromNode node={node} />;
    case "img": return <Image src={resolveImageSrc(node.attribs.src)} style={styles.img} />;
    // ... rest of the ~36-tag allowlist from sanitize-manual-html.ts
    default:
      // Unmapped allowed tag: degrade to plain text, never throw.
      return <Text>{node.children.map(mapNode)}</Text>;
  }
}

const dom = parseDocument(contentHtml);
const body = dom.children.map(mapNode);
```

### Anti-Patterns to Avoid
- **Re-sanitizing inside the PDF mapper.** `contentHtml` already passed through `sanitizeManualHtml` when it was saved. The mapper trusts the allowlist and never relaxes it — if a tag isn't in `sanitize-manual-html.ts`, it doesn't exist in the base and doesn't need a case in the mapper (locked decision, already stated in `04-CONTEXT.md`).
- **A second `dangerouslySetInnerHTML`-style trust boundary.** The mapper parses structured nodes and switches on `node.name`/`node.type` — it never re-interprets raw HTML strings as markup a second time.
- **Building a generic/pluggable renderer ("template variants", configurable page size per tenant, etc.).** Explicitly against the user's "hazlo más sencillo" instruction: one renderer, one stylesheet.
- **Doing expensive work inside a `fixed` View.** It repaints on every page; resolve the logo data URL once, outside the `<Page>` tree (already how `loadUploadAsDataUrl` is called in every existing route — call once in the route handler, pass the resolved string down).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML string → tree of nodes | A custom regex-based HTML tokenizer | `htmlparser2.parseDocument` | Already battle-tested (it's what sanitizes every piece of HTML this app persists); regex HTML parsing is a well-known trap even for a closed 36-tag allowlist (nested tags, self-closing `<br>`/`<hr>`/`<img>`, attribute quoting). |
| Table header repeat across page breaks | A manual page-height calculator that pre-splits rows into per-page chunks | The `fixed`-inside-wrapping-`View` technique (Pattern 4) | React-pdf already runs a full Yoga-based layout/wrapping pass; re-implementing pagination math to place a header on the "right" page duplicates that engine's job and will drift from its actual line-wrapping/font-metrics decisions. |
| Live company logo resolution | A second image-loading helper | `loadUploadAsDataUrl` from `lib/certificate-assets.ts` | Already used by three PDF routes in this repo; already handles the "not a `/uploads/...` URL" and "file missing" cases by returning `null` so the caller degrades gracefully — exactly the behavior risk #3 in `04-CONTEXT.md` requires. |
| Page numbering / total pages | Counting pages manually | `<Text render={({ pageNumber, totalPages }) => ...} fixed>` | Built into react-pdf's layout pass; already proven in `app/api/evaluations/results/[assignmentId]/pdf/route.tsx`. |

**Key insight:** every piece of infrastructure this phase needs except the HTML→node mapper itself already exists in the repo, proven against real production PDFs. The temptation to reach for a table library or a headless browser should be resisted — the repo's own precedent (three independent hand-rolled `@react-pdf/renderer` templates) is stronger evidence of "what works here" than any external library's README.

## Common Pitfalls

### Pitfall 1: `fixed` at the wrong nesting level prints the table header everywhere
**What goes wrong:** Putting the `<thead>` `View fixed>` as a direct child of `<Page>` (instead of nested inside the table's own wrapping `<View>`) makes it repeat on **every** page of the document, including pages that come before the table starts or after it ends — this was literally the first objection raised in `diegomura/react-pdf#2390` before the nested pattern was confirmed to work.
**Why it happens:** `fixed` has no inherent "scope" concept in the docs; its actual behavior (repeat only where the *containing* breakable element continues) is undocumented and only empirically confirmed.
**How to avoid:** Always nest the fixed header inside the table's own container View, never at the `<Page>` root. Verify with the spike named in `STATE.md` against a real multi-page procedure that has content both before and after the table.
**Warning signs:** A downloaded PDF that shows the table header on a page with no table rows.

### Pitfall 2: No `border-collapse` primitive — double or missing borders on a table grid
**What goes wrong:** HTML's `border-collapse: collapse` (used in `manual-content.css` for the on-screen table) has no react-pdf equivalent. If every `<td>`/`<th>` gets a full `border` on all four sides, adjacent cells produce double-thickness lines at shared edges; if borders are only assigned inconsistently, some grid lines go missing.
**Why it happens:** React-pdf's `Style` is a flat Yoga-flexbox box model per node; there's no concept of a shared border between siblings.
**How to avoid:** Follow the pattern already used in `lib/dc3/template.tsx` (`styles.field`, `styles.box`): give the outer table `View` a `borderTop`/`borderLeft`, and give every cell only `borderRight` + `borderBottom` — this reproduces `border-collapse: collapse` visually without double lines, and is exactly what PDF-02 ("tablas con bordes") needs for an audit-ready grid.
**Warning signs:** Visually thicker lines where two cells meet, or a table that looks "almost" gridded with gaps.

### Pitfall 3: `loadTemplatePreviewIdentity` requires a `companyId` the plantilla editor doesn't have
**What goes wrong:** `lib/documents/resolve-identity.ts:loadTemplatePreviewIdentity(documentId, companyId)` was written in phase 3 anticipating this phase, but its signature assumes a company context. The plain "plantilla" editor route (`app/tenant-admin/manuals/[id]/documents/[documentId]/page.tsx`, where `target.kind === "template"`) has no `companyId` — it's the manual's own template, not tied to any one company yet.
**Why it happens:** `DocumentIdentity`/`buildDocumentIdentity` structurally requires a `company: { name, dc3LegalName, logo }` object — there's no "no company" branch today.
**How to avoid:** Follow the exact precedent already shipped in `app/api/certificates/preview/route.tsx`, which previews a diploma with no real student by substituting a **fixed placeholder string** (`"Nombre del Alumno"`) instead of borrowing a real entity's data. Apply the same trick here: pass a placeholder `company: { name: "Empresa de ejemplo", dc3LegalName: null, logo: null }` into `buildDocumentIdentity` for the template-only preview, keeping `status: "BORRADOR"` (already set by `loadTemplatePreviewIdentity`) so the existing BORRADOR-watermark rule applies automatically — no special-casing needed. This is a genuine design gap the planner must decide on explicitly; see Open Questions.
**Warning signs:** The plantilla editor's Eye toggle 500s or shows a real company's logo/name that has nothing to do with the template being edited.

### Pitfall 4: `kind = FILE` has no HTML body to map
**What goes wrong:** `ManualDocument.contentHtml` / `CompanyDocument.contentHtml` are nullable — a row can legitimately be `kind = FILE` (uploaded `.docx`/binary, never converted to native HTML). Calling the mapper on `null` or `""` will either throw or silently render an empty PDF.
**Why it happens:** The schema allows `FILE` and `PROCEDIMIENTO`/`REGISTRO` to coexist per document; only the native kinds have a body.
**How to avoid:** The route must check `identity.kind === "FILE"` before attempting to render, and respond with something honest (409/400 with a clear message) rather than a blank or broken PDF — the on-screen viewer already redirects `FILE` rows to `/files/company-document/[id]` (see `app/dashboard/documents/[companyDocumentId]/page.tsx:36-38`); the PDF route should refuse in the same spirit rather than trying to download the wrong artifact type.
**Warning signs:** A "PDF" download that opens as 0 bytes or a corrupt file for file-based documents.

### Pitfall 5: pnpm phantom dependency if `htmlparser2`/`domhandler` are imported without declaring them
**What goes wrong:** Both packages currently resolve only as *transitive* dependencies (via `sanitize-html`). Under pnpm's default strict `node_modules` layout, `apps/web`'s own code cannot reliably `import` them without pnpm hoisting happening to work in dev but breaking in a clean install or a different pnpm version.
**Why it happens:** pnpm intentionally does not hoist transitive deps into a package's own resolvable set, to prevent exactly this class of bug.
**How to avoid:** Explicitly add `htmlparser2` and `domhandler` to `apps/web/package.json` dependencies (see Installation above), even though a compatible version is already in the lockfile.
**Warning signs:** Works locally (`next dev`), fails in a fresh `pnpm install` + build (this class of bug already bit this exact team once — see `STATE.md` `[Phase 03-03]` note about `mammoth`'s `ImageAttributes.src`, a different but adjacent "assume the vendored types are complete" trap).

## Code Examples

Verified patterns from this repo (already-shipped, real code) and from official/community sources:

### Fixed header + numbered footer (already shipped)
```tsx
// Source: apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx:1141-1150
<View style={styles.footer} fixed>
  <Text>
    {p.tenant.name} · {p.evaluation.title}
  </Text>
  <Text
    render={({ pageNumber, totalPages }) =>
      `Página ${pageNumber} de ${totalPages}`
    }
  />
</View>
```

### Watermark for non-authoritative pages (already shipped, precedent for BORRADOR/OBSOLETO)
```tsx
// Source: apps/web/lib/dc3/template.tsx:598, styles.watermark at :226-237
{d.watermark && <Text style={styles.watermark}>{d.watermark}</Text>}
// styles.watermark: position absolute, fontSize 54, opacity 0.16, transform "rotate(-28deg)"
```

### Route handler shape (already shipped, copy exactly)
```tsx
// Source: apps/web/app/api/dc3/[id]/pdf/route.tsx (full file read during this research)
const stream = await renderToStream(pdf);
return new NextResponse(stream as unknown as ReadableStream, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="DC3-${dc3.folio}.pdf"`,
    "Cache-Control": "private, no-store",
  },
});
```

### `htmlparser2.parseDocument` — parsing into a walkable tree
```javascript
// Source: htmlparser2 README (Context7-verified, /fb55/htmlparser2)
import * as htmlparser2 from "htmlparser2";

const dom = htmlparser2.parseDocument(
  `<ul id="fruits"><li class="apple">Apple</li></ul>`
);
// dom.type === "document"; dom.children[0].name === "ul"; etc.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| `.docx` intercambiado por correo entre consultora y cliente | Documento nativo en HTML saneado, exportable a PDF por petición | Phase 3 (2026-09), this phase closes the loop | El PDF deja de ser "el documento"; pasa a ser una vista derivada del HTML vivo, generada al vuelo — es justo lo que hace cierto el criterio 3 (logo en vivo) sin ningún trabajo extra en esta fase. |
| `renderToString` (react-pdf) | `renderToStream` / `renderToBuffer` | react-pdf 3.x+ (carried into 4.x, current) | `renderToString` is deprecated per react-pdf's own source; every route in this repo already correctly uses `renderToStream` — no migration needed, just don't reach for the deprecated API by habit. |

**Deprecated/outdated:**
- `renderToString` (react-pdf): deprecated in favor of `renderToStream`/`renderToBuffer`. Not used anywhere in this repo already — no risk, just noted so a new contributor doesn't reach for it from stale tutorials.

## Open Questions

1. **Does the `fixed`-inside-wrapping-`View` technique for table headers actually behave correctly against a real multi-section procedure (headings + paragraphs + a table that starts mid-page)?**
   - What we know: Multiple independent GitHub users confirm it works for the simpler case of "content above a single table, table spans pages" (`#2390`). Not officially documented by the maintainers.
   - What's unclear: Whether it holds when there is *also* content **after** the table on the same page flow (this document's manuals mix narrative sections and tables freely), and whether nested tables-within-cards behave the same.
   - Recommendation: Run the one-hour spike already named in `STATE.md` as the first task of the first plan, against a real seeded multi-page procedure (`P-RFC-4.1-01` already has real content in the local seed). Define the fallback (e.g., a persistent one-line "continúa: `<código>`" instead of the full header, or accept a single non-repeating header if the technique doesn't hold) as part of that same task, not as an afterthought.

2. **What identity does the "plantilla" (template-only, no company) PDF preview show?**
   - What we know: `loadTemplatePreviewIdentity(documentId, companyId)` exists, unused, and requires a `companyId` the template editor page doesn't have. `app/api/certificates/preview/route.tsx` sets a strong, directly-applicable precedent: substitute a fixed placeholder entity rather than borrowing a real one.
   - What's unclear: Whether the planner wants to (a) add a placeholder-identity path as described in Pitfall 3, (b) change `loadTemplatePreviewIdentity`'s signature to make `companyId` optional and branch inside `buildDocumentIdentity`, or (c) require the consultant to pick a company before previewing a template PDF (more clicks, contradicts "hazlo más sencillo").
   - Recommendation: (a) — placeholder company data, same shape as the diploma preview's placeholder student. It requires zero schema/signature changes and reuses the BORRADOR-watermark rule for free.

3. **Table cell width strategy for the mapper.**
   - What we know: `sanitize-manual-html.ts` allows `colspan`/`rowspan` on `th`/`td` but the sanitizer doesn't validate that column counts are internally consistent (a pasted/imported table could have ragged rows).
   - What's unclear: Whether the mapper should compute column widths from the widest row (`th`/`td` count) or just divide evenly by the first row's cell count, and what happens visually if a later row has more cells than the header.
   - Recommendation: Divide evenly by the header row's (`<thead><tr>`) cell count if present, else the first body row; any row with a different cell count degrades gracefully (extra cells wrap onto a continuation, missing cells leave a blank space) rather than throwing — consistent with the locked "never 500 on a weird-but-sanitized document" rule.

## Sources

### Primary (HIGH confidence)
- Context7 `/diegomura/react-pdf` — `fixed`, `break`, `wrap`, `minPresenceAhead`, `render` prop type definitions; `renderToBuffer`/`renderToStream` node API; `shouldBreak.test.ts` proving `wrap={false}` prevents row splitting.
- Context7 `/fb55/htmlparser2` — `parseDocument` API and returned tree shape.
- Direct repo reads (this session): `apps/web/app/api/dc3/[id]/pdf/route.tsx`, `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx`, `apps/web/app/api/certificates/preview/route.tsx`, `apps/web/lib/dc3/template.tsx`, `apps/web/lib/certificate-assets.ts`, `apps/web/lib/documents/document-identity.ts`, `apps/web/lib/documents/resolve-identity.ts`, `apps/web/lib/sanitize-manual-html.ts`, `apps/web/lib/manual-access.ts`, `apps/web/lib/queries/manual-document.ts`, `apps/web/components/manual-content.tsx`, `apps/web/components/document-identity-header.tsx`, `apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/*`, `packages/db/prisma/schema.prisma` (`ManualDocument`, `CompanyDocument` models).
- `pnpm-lock.yaml` — confirmed `htmlparser2@12.0.0`, `domhandler@5.0.3`/`6.0.1`, `domutils@3.2.2`/`4.0.2` already resolved as transitive dependencies.

### Secondary (MEDIUM confidence)
- `github.com/diegomura/react-pdf` issue #2390 ("How to create a table that will add a new table header on a new page if the table spans multiple pages?") — comment thread with working code from `t-gomez`, confirmed by original reporter `jimmcslim`, further examples from `Andres6936` in the related issue #2099. Not an official maintainer-endorsed pattern, but multiple independent, mutually-consistent confirmations with no contradicting reports found.
- `react-pdf.org/docs/v4/advanced/page-wrapping` — general prose on `fixed`/`wrap`/`break`, does not explicitly cover table headers.

### Tertiary (LOW confidence)
- None used as load-bearing claims; where WebSearch/WebFetch summaries were incomplete (e.g. GitHub issue pages returning 403 to WebFetch), the underlying data was re-fetched via `gh api` instead of relied upon secondhand.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@react-pdf/renderer` already in production three times over; `htmlparser2`/`domhandler` already resolved in the lockfile, verified by direct inspection, not guessed.
- Architecture: HIGH — every route/query/auth pattern recommended here is copied from code read directly in this repo during this research pass, not inferred from general react-pdf knowledge.
- Pitfalls: MEDIUM-HIGH — table-header-repeat mechanism (Pitfall 1) is community-verified, not officially documented, hence the mandatory spike; all other pitfalls (border-collapse, identity gap, FILE kind, phantom dependency) are HIGH confidence, sourced directly from repo code or react-pdf's own verified behavior.

**Research date:** 2026-09-03
**Valid until:** ~30 days for the architecture/stack findings (stable, all first-party repo code); the table-header-repeat finding should be re-verified by the spike task regardless of elapsed time, since it was never officially confirmed to begin with.
