---
phase: 03-procedimientos-nativos
verified: 2026-09-02T20:24:20Z
status: passed
score: 6/7 success criteria fully verified against code + live database; 1/7 verified for its code/infra content but with an open human-verification item and a disclosed factual caveat
human_verification:
  - test: "Pase visual humano sobre PRODUCCIÓN (https://prol.prosuite.pro): iniciar sesión, ver que el panel se ve y usa con normalidad, descargar un certificado o PDF de resultados."
    expected: "La plataforma funciona con normalidad tras el despliegue de la fase 3; el módulo documental no aparece para los tenants con `documents_enabled=false` (academia-digital, mecanica-g3)."
    why_human: "Es una confirmación de experiencia real sobre producción. El plan 03-08 documenta explícitamente que este paso NO se ejecutó — 'las comprobaciones automatizadas pasaron; la confirmación visual humana sigue pendiente' — y no debe darse por hecho. Este verificador confirmó por lectura de sólo-lectura que `/api/health` → 200 y que el 401 del arreglo de auth está vivo, pero eso no sustituye el pase visual de una persona."
  - test: "Decisión de negocio sobre `documents_enabled=true` en `ibiza-online`."
    expected: "Confirmar que el usuario sigue de acuerdo con dejar encendido el flag en IBIZA (0 manuales hoy, sin exposición real) pese a que el criterio 7 dice 'con el módulo apagado'."
    why_human: "No es un bug de esta fase — el flag ya estaba en `true` desde antes del cierre de la fase 2, y el registro que decía 'false en los tres tenants' era el error, no el flag. La corrección de registro ya se hizo en STATE.md/DEPLOY.md; lo que queda es una decisión de negocio, no de código."
---

# Phase 3: Procedimientos nativos Verification Report

**Phase Goal:** Un procedimiento se redacta o se importa en la plataforma, se emite a cada empresa con su marca, y se versiona con historial — sin que exista un `.docx` de por medio a partir de la carga inicial.
**Verified:** 2026-09-02T20:24:20Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (7 Success Criteria from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Un procedimiento redactado se emite a dos empresas y cada una lo ve con su logo, razón social y código | ✓ VERIFIED | DB local: `company_documents` tiene Acme (`v1 OBSOLETO`, `v2 VIGENTE`) y Constructora Delta (`v1 VIGENTE`), ambas del mismo `manual_documents.code = P-RFC-4.1-01`. `companies` tiene logos SVG distintos (`#16a34a`/"AC" vs `#2563eb`/"CD") y `dc3_legal_name` distintos. `DocumentIdentityHeader` (68 líneas) renderiza `identity.companyLogo`, `companyName`, `code` sin ningún `??` propio — todo resuelto en `buildDocumentIdentity`. Checkpoint humano de 03-07 aprobado ("LOS VI BIEN AVANZA") entrando como ambas empresas. |
| 2 | Editar la plantilla no altera lo emitido; ambas empresas ven que hay versión más reciente | ✓ VERIFIED | DB: `manual_documents.template_version=6`, `md5(content_html)=eff9c51f...`; `company_documents` de Acme v1 y Delta v1 comparten `md5=fe1dd6d2...`, distinto del template actual — la plantilla avanzó y el cuerpo congelado no se movió. `issueCompanyDocument`/`publishCompanyDocument` (`apps/web/lib/actions/manual-document.ts`) copian `contentHtml` dentro de la transacción, nunca lo referencian. `isTemplateOutdated` + banner ámbar en `DocumentIdentityHeader` confirmado en código y visto por el usuario en ambas empresas (checkpoint 03-07). |
| 3 | Guardar dos veces un borrador deja una versión; publicar crea la siguiente y degrada la anterior | ✓ VERIFIED | Código: `saveCompanyDocumentDraft` hace `update` en sitio sin `create` (sin lock, documentado como deliberado); `publishCompanyDocument` degrada `VIGENTE→OBSOLETO` con `updateMany` y promueve el borrador dentro de un mismo `$transaction` con `FOR UPDATE` sobre `manual_documents`. Estado de la fila Acme (`v1 OBSOLETO`/`v2 VIGENTE`) es consistente con ese ciclo. Ejercitado de verdad por HTTP en 03-06b (cinco server actions invocadas con cookie de sesión real, no un script imitando su forma) — documentado en REQUIREMENTS.md/DOC-06. |
| 4 | El historial muestra versión, fecha, autor, descripción del cambio y estatus | ✓ VERIFIED | `apps/web/components/document-change-log.tsx` (85 líneas) pinta exactamente esas 5 columnas desde `buildHistoryEntry` (`lib/queries/manual-document.ts`), generado en tiempo de render desde columnas ya existentes de `CompanyDocument`. Visto en pantalla por el usuario en el checkpoint de 03-07. |
| 5 | La página de sección muestra el vigente, no el borrador de versión más alta | ✓ VERIFIED | `apps/web/app/dashboard/manuals/[assignmentId]/sections/[sectionId]/page.tsx` importa y usa `getSectionForCompany`, que filtra `where: { status: "VIGENTE" }` (`lib/queries/manual.ts:579`). Mismo filtro confirmado en `getAssignmentPanel` (línea 298) para el panel del consultor. |
| 6 | Un `.docx` real con tablas se importa, las tablas sobreviven, y pasa por el sanitizador antes de la base | ✓ VERIFIED (con matiz) | DB: `manual_documents.content_html` contiene `colspan="2"` en vivo; sin `<script`, `style=`, ni `src="data:"`; encabezados como `<h2>`/`<h3>`, nunca `<h1>`. `docx-to-html.ts` llama `sanitizeManualHtml` antes de devolver nada; la ruta no escribe en base (devuelve HTML). **Matiz declarado por el propio equipo:** el `.docx` de prueba fue fabricado a mano con OOXML válido (verificado con `unzip -l`), no un documento real de la consultora — ninguno estaba disponible en la máquina (se buscó explícitamente). Es un `.docx` genuino, no un mock del handler; simplemente no es el archivo de la consultora del criterio original del ROADMAP. |
| 7 | El código de la fase queda en producción con el módulo apagado, arrastrando el arreglo de autenticación | ? UNCERTAIN (human_needed) | Verificado de forma independiente por este agente ahora mismo: `GET https://prol.prosuite.pro/api/health` → `200`; `GET .../files/evidence/<inexistente>` sin sesión → `401` (el arreglo `5e2352d` está vivo). Commits `04135ca`→`ce3339a`→`fe75630` documentan el despliegue. **Pero:** (a) `documents_enabled` NO es `false` en los tres tenants — `ibiza-online` está en `true` desde antes de esta fase (decisión de negocio del usuario, no introducida por la fase 3, ya corregida en el registro de STATE.md); (b) el pase visual humano sobre producción (login, panel, descarga) está **declarado como pendiente y no realizado** en `03-08-SUMMARY.md` — no se simula como hecho. |

**Score:** 6/7 verified, 1/7 uncertain (needs human) — 0/7 failed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/db/prisma/schema.prisma` | Enums `ManualDocumentKind`/`CompanyDocumentStatus`, columnas nativas, 4 columnas de archivo nullable | ✓ VERIFIED | Ambos enums presentes (líneas 387/396); `contentHtml`, `templateVersion`, `sourceTemplateVersion`, `nameOverride`, `status` confirmados en `manual_documents`/`company_documents` vía `\d` en la base real. |
| `packages/db/prisma/seed-documents.ts` | Fixture idempotente (2ª empresa, manual, sección, PROCEDIMIENTO, 2 activaciones) | ✓ VERIFIED | 244 líneas, sólo `upsert`/búsqueda previa (sin `delete`), reproduce exactamente el estado observado en la base local (2 empresas, 1 manual ISO 9001, sección 4.1, documento `P-RFC-4.1-01`, 2 `manualAssignment`). |
| `packages/db/prisma/seed-password.ts` | `hashPassword` con scrypt de Better Auth, un solo sitio | ✓ VERIFIED | 25 líneas, importado por `seed.ts`. |
| `apps/web/app/files/company-document/[id]/route.ts` | Guarda de `fileKey` nulo antes de `readPrivateFile` | ✓ VERIFIED | `if (!doc.fileKey) return new NextResponse("No encontrado", { status: 404 })` presente. |
| `apps/web/lib/queries/manual.ts` | `getAssignmentPanel`/`getSectionForCompany` filtrando `VIGENTE` | ✓ VERIFIED | `status: "VIGENTE"` en ambas funciones (líneas 298, 579). Los otros 3 call-sites de `companyDocument` (contador de borrado, cálculo de versión máxima, `_count` del catálogo) confirmados SIN filtrar, tal como exige el must-have. |
| `apps/web/lib/actions/manual.ts` | `uploadCompanyDocument` degradando VIGENTE anterior en transacción | ✓ VERIFIED | `updateMany({ status: "VIGENTE" → "OBSOLETO" })` dentro del mismo `$transaction` que el `FOR UPDATE`, antes del `create`. |
| `apps/web/components/company-project-panel.tsx` | Fila consciente de `kind`: sin nombre de archivo ni botón de subida para nativos | ✓ VERIFIED | `own.kind !== "FILE"` oculta el link de descarga y el botón `CompanyDocumentUpload`; sólo se muestra la etiqueta de arquetipo + versión. |
| `apps/web/lib/documents/docx-to-html.ts` | Conversión mammoth + styleMap + saneado | ✓ VERIFIED | 95 líneas; `styleMap` mapea `Heading 1/2`→`h2/h3`; `sanitizeManualHtml` aplicado antes de devolver; imágenes descartadas sin `data:`. |
| `apps/web/app/api/upload/document-body/route.ts` | Ruta POST `.docx`→HTML, sin escribir en base | ✓ VERIFIED | `requireManualAdmin()`, valida MIME/tamaño, devuelve `{ html, droppedImages, warnings }`; no hay ninguna escritura a `db.*` en el archivo. |
| `apps/web/lib/documents/document-identity.ts` | `DocumentIdentity` + ensamblador puro | ✓ VERIFIED | 172 líneas; `dc3LegalName ?? name` (misma regla que DC-3); logo leído en vivo, no congelado. |
| `apps/web/lib/documents/resolve-identity.ts` | Lectura de base para el ensamblador | ✓ VERIFIED | 143 líneas; `buildDocumentIdentity` importado y usado dos veces. |
| `apps/web/lib/actions/manual-document.ts` | `updateManualDocumentBody`, `issueCompanyDocument`, `startCompanyDocumentDraft`, `saveCompanyDocumentDraft`, `publishCompanyDocument` | ✓ VERIFIED | Las 5 funciones presentes; política de `templateVersion` (no sube en primer cuerpo ni en guardado idéntico) confirmada línea por línea; `FOR UPDATE` presente en las 3 transacciones que lo requieren. |
| `apps/web/lib/queries/manual-document.ts` | `getManualDocumentForEdit`, `getCompanyDocumentForClient`, `getCompanyDocumentForEdit`, `listCompanyDocumentsForClient` | ✓ VERIFIED | Las 4 funciones presentes con `cache()`; cliente excluye `BORRADOR` del historial, edición lo incluye — asimetría documentada y confirmada en código. |
| `apps/web/app/tenant-admin/manuals/[id]/documents/[documentId]/page.tsx` + editor + panel + editor de borrador | Página del consultor completa | ✓ VERIFIED | 5 archivos presentes (109/314/293/129/321 líneas); `target` discrimina plantilla/empresa; import vía `fetch('/api/upload/document-body')`. |
| `apps/web/app/dashboard/documents/**` + `document-identity-header.tsx` + `document-change-log.tsx` + nav + sección | Vista del cliente completa | ✓ VERIFIED | Los 6 archivos presentes; `showDocuments` gatea la entrada de nav por `tenant.documentsEnabled && user.companyId`; sección enlaza a visor (nativos) o descarga (`FILE`). |
| `DEPLOY.md` §7d | Estado real del despliegue | ✓ VERIFIED | Sección 7d presente (línea 419), con el hallazgo de IBIZA y los dos rollbacks documentados. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `seed.ts` | `seed-documents.ts` | `import { seedDocumentFixture }` | ✓ WIRED | Import y uso confirmados (línea 3, invocación línea 1118). |
| `getSectionForCompany` | `company_documents` VIGENTE | `where: { status: "VIGENTE" }` | ✓ WIRED | Confirmado en código y consumido por la página de sección real. |
| `uploadCompanyDocument` | degradación VIGENTE→OBSOLETO | `tx.companyDocument.updateMany` | ✓ WIRED | Dentro del mismo `$transaction` que el `FOR UPDATE`. |
| `docx-to-html.ts` | `sanitize-manual-html.ts` | `sanitizeManualHtml(rawHtml)` | ✓ WIRED | Aplicado antes de retornar; confirmado también en el HTML almacenado en la base (sin `<script>`/`style=`/`data:`). |
| `document-body-editor.tsx` | `updateManualDocumentBody`/`saveCompanyDocumentDraft` | prop `target` | ✓ WIRED | `switch (target.kind)` invoca la acción correcta según destino. |
| `document-body-editor.tsx` | `/api/upload/document-body` | `fetch` con FormData | ✓ WIRED | `fetch("/api/upload/document-body", { method: "POST", body })` confirmado. |
| `manual-documents.tsx` | `/tenant-admin/manuals/[id]/documents/[documentId]` | enlace "Redactar" | ✓ WIRED | `href={`/tenant-admin/manuals/${manualId}/documents/${doc.id}`}` presente. |
| `dashboard/documents/[companyDocumentId]/page.tsx` | `getCompanyDocumentForClient` | consulta autorizada | ✓ WIRED | Import y `.catch(() => null)` + `notFound()`. |
| `document-identity-header.tsx` | `Company.logo` en vivo | `<img src={identity.companyLogo}>` | ✓ WIRED | Sin data-URL congelada; se lee de `identity.companyLogo`, resuelto en cada render desde la base. |
| `dashboard/layout.tsx` | `/dashboard/documents` | nav dentro de `showDocuments` | ✓ WIRED | `showDocuments = Boolean(tenant?.documentsEnabled) && Boolean(user.companyId)`. |
| db push producción | `podman tag ... latest` | orden de aplicación | ✓ WIRED (confirmado por lectura directa en 03-08) | Esquema aplicado antes de mover `latest`; releído independientemente por el agente de 03-08, no asumido. |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| DOC-01 | 03-01, 03-04, 03-06, 03-08 | El consultor redacta un procedimiento sin producir/intercambiar `.docx` | ✓ SATISFIED | `updateManualDocumentBody` + editor de plantilla; cerrado por HTTP real en 03-06b (`template_version` 1→5 en la sesión). |
| DOC-02 | 03-03, 03-06, 03-08 | Importar `.docx` conserva tablas al convertir y sanear | ✓ SATISFIED (con el matiz del `.docx` fabricado — ver criterio 6 arriba) | `colspan="2"` confirmado en la base real; sanitizador aplicado antes de guardar. |
| DOC-03 | 03-01, 03-05 | Emitir congela el cuerpo | ✓ SATISFIED | `issueCompanyDocument` copia `contentHtml` en la transacción; DB confirma md5 distinto entre plantilla actual y snapshots emitidos. |
| DOC-04 | 03-04, 03-07 | Misma plantilla con logo/razón social/código por empresa | ✓ SATISFIED (evidencia mixta, declarada por partes en REQUIREMENTS.md: aprobación humana + server-verified) | Logos y `dc3_legal_name` distintos confirmados en DB; checkpoint humano aprobado. |
| DOC-05 | 03-05, 03-07 | Historial con versión, fecha, autor, descripción, estatus | ✓ SATISFIED | `DocumentChangeLog` + `buildHistoryEntry`; visto por el usuario. |
| DOC-06 | 03-01, 03-05, 03-06 | Editar vigente abre borrador; sólo publicar crea versión nueva | ✓ SATISFIED | Ciclo `startCompanyDocumentDraft`/`saveCompanyDocumentDraft`/`publishCompanyDocument` confirmado en código y ejercitado por HTTP real en 03-06b. |
| DOC-07 | 03-04, 03-07 | El cliente ve cuándo su versión quedó atrás | ✓ SATISFIED | `isTemplateOutdated` + banner ámbar; visto por el usuario en ambas empresas. |
| OPS-05 | 03-02, 03-08 | Toda consulta de "vigente" filtra por estatus, no por versión máxima | ✓ SATISFIED | Los dos call-sites de lectura filtran `VIGENTE`; los tres que deben permanecer sin filtrar (contador de borrado, versión máxima de subida, `_count` de catálogo) confirmados intactos. |

No hay requisitos huérfanos: la unión de los `requirements:` declarados en los 8 planes (DOC-01..07, OPS-05) coincide exactamente con los 8 IDs que ROADMAP.md asigna a la fase 3.

### Anti-Patterns Found

Ninguno. Se escanearon los ~24 archivos modificados/creados por la fase (`TODO|FIXME|XXX|HACK|PLACEHOLDER|coming soon|not implemented`) sin resultados. No se encontraron manejadores vacíos, `return null` sospechosos, ni handlers que sólo hagan `console.log`.

### Cross-Cutting Gates (re-ejecutados por este verificador, no asumidos)

- `pnpm check-types` → limpio (8/8 tareas exitosas).
- `pnpm lint` → `81 problems (0 errors, 81 warnings)`, exit 1 por `--max-warnings 0` — exactamente la línea base declarada, no una regresión.
- `pnpm build` → verde, con `/tenant-admin/manuals/[id]/documents/[documentId]`, `/tenant-admin/manuals/[id]/documents/[documentId]/companies/[assignmentId]` y las rutas de `/dashboard/documents` presentes en la salida.
- `git status` → confirma que los ~18 archivos sin commitear de la sesión concurrente DC-3 (incluido `packages/db/prisma/schema.prisma`) siguen sin commitear y **no** fueron arrastrados por ningún commit de la fase 3; el diff de `schema.prisma` no toca ninguna columna/enum del documento nativo.
- Producción (read-only, sin tocar el VPS): `GET /api/health` → `200`; `GET /files/evidence/<inexistente>` sin sesión → `401` (arreglo `5e2352d` vivo).

### Base de datos local (verificada directamente, no asumida)

```
company_documents: Acme Corp     v1 OBSOLETO  md5=fe1dd6d2b4a0c7140c96e70cc6f961e
                    Acme Corp     v2 VIGENTE   md5=2148bb78b88c5f17e178401ac625893d
                    Constructora Delta v1 VIGENTE md5=fe1dd6d29b4a0c7140c96e70cc6f961e
manual_documents:   P-RFC-4.1-01  template_version=6  md5=eff9c51fff0b60d1bf0e8d266db9ce52
```
Coincide exactamente con el estado esperado documentado por el orquestador. `colspan="2"` presente en el cuerpo vivo; cero pares (documento, empresa) con más de una fila `VIGENTE`.

### Human Verification Required

#### 1. Pase visual humano sobre producción

**Test:** Entrar a `https://prol.prosuite.pro` con una cuenta real, navegar el panel, descargar un certificado o PDF de resultados.
**Expected:** Todo se ve y funciona con normalidad tras el despliegue de la fase 3; el módulo de documentos no aparece para los tenants con el flag apagado.
**Why human:** Declarado explícitamente como NO realizado en `03-08-SUMMARY.md` ("la confirmación visual humana sigue pendiente"). Este verificador sólo pudo confirmar de forma automatizada `/api/health` (200) y el 401 del arreglo de auth — ninguno de los dos sustituye el pase visual de una persona.

#### 2. Confirmar la decisión sobre `documents_enabled=true` en `ibiza-online`

**Test:** Revisar con el usuario si sigue de acuerdo con dejar el flag encendido en IBIZA.
**Expected:** Ratificación explícita, o instrucción de apagarlo si cambió de opinión.
**Why human:** Es una decisión de negocio ya tomada una vez ("decisión del usuario dejarlo así"), no un defecto de código; se deja como recordatorio porque el criterio 7 de la fase textualmente dice "con el módulo apagado" y eso ya no es cierto para los tres tenants por igual.

### Gaps Summary

No se encontraron gaps de implementación: los 8 planes producen artefactos que existen, son sustantivos (no stubs) y están conectados extremo a extremo, verificado contra el código fuente y contra la base de datos local real — no contra los SUMMARY. Los tres puntos de `CompanyDocument` que debían permanecer sin filtrar por estatus (contador de borrado, versión máxima de subida, `_count` del catálogo) se confirmaron intactos, evitando la regresión más probable de OPS-05.

El único punto abierto es de naturaleza humana, no de código: la confirmación visual sobre producción tras el despliegue de 03-08 está pendiente y así lo declara el propio equipo (sin fingir que ocurrió, aprendiendo del incidente de integridad del checkpoint de 03-06). Junto a ello, el criterio 7 tiene un matiz fáctico ya corregido en los registros (`documents_enabled=true` en `ibiza-online` desde antes de esta fase, decisión de negocio explícita de dejarlo así) que conviene que el usuario ratifique.

No se encontró ninguna repetición del incidente de integridad de 03-06 (checkpoint aprobado sin ejercitarse): en 03-07 el checkpoint sí se ejerció con evidencia en pantalla, y en 03-08 la ausencia de confirmación visual se declaró honestamente en vez de asumirse.

---

*Verified: 2026-09-02T20:24:20Z*
*Verifier: Claude (gsd-verifier)*


## Resolución de los dos puntos humanos — 2026-09-02

Ambos cerrados por el usuario tras leer el informe. Se registran aquí porque el
`status` pasa a `passed` por esta resolución y no por evidencia nueva de código.

**1. Pasada visual por producción — CONFIRMADA.** El usuario entró a
`prol.prosuite.pro`, el panel carga con normalidad y la descarga de un archivo que
ya funcionaba antes sigue funcionando. Era el único punto que ninguna comprobación
automática podía sustituir.

**2. `documents_enabled = true` en `ibiza-online` — RATIFICADO, se queda encendido.**
La pregunta se hizo dos veces a propósito, y la segunda no era la misma que la
primera: antes del despliegue el flag encendido no significaba nada porque no había
editor detrás; ahora sí lo hay. Con eso sobre la mesa, el usuario confirma que es la
intención — IBIZA es su propia consultora y estrenar allí el editor de procedimientos
es el uso previsto, no un descuido.

**Cómo queda el criterio 7, literalmente.** Su redacción dice "con el módulo apagado".
Eso es cierto para Academia Digital MX y Mecanica G3, y **falso para IBIZA
Consultores por decisión explícita**. Los tres tenants tienen 0 manuales, así que hoy
no hay contenido expuesto; lo que existe es la posibilidad de que un admin de IBIZA
estrene el editor sin aviso previo. Se deja escrito así, con el matiz, en vez de
declarar el criterio cumplido a secas: el error de origen fue que `STATE.md` afirmaba
desde el cierre de la fase 2 que los tres estaban apagados, y no era verdad.
