---
phase: 03-procedimientos-nativos
plan: 01
subsystem: database
tags: [prisma, postgres, db-push, seed, multi-tenant, better-auth, next-route-handler]

# Dependency graph
requires:
  - phase: 01-evidencias-y-cumplimiento
    provides: "Modelo CompanyDocument/ManualDocument append-only, fixture de Evidence.formSnapshot (banco de regresión, no tocar)"
  - phase: 02-r2-storage
    provides: "document-storage.ts (readPrivateFile/privateFileResponse) sobre R2, ruta /api/upload/document-template"
provides:
  - "Enums ManualDocumentKind (FILE/PROCEDIMIENTO/REGISTRO) y CompanyDocumentStatus (BORRADOR/VIGENTE/OBSOLETO) en el esquema"
  - "ManualDocument.kind/contentHtml/templateVersion; CompanyDocument.kind/contentHtml/nameOverride/status/sourceTemplateVersion/publishedAt/publishedById"
  - "CompanyDocument.fileKey/fileName/fileSize/mimeType nullable, con guard 404 en /files/company-document/[id]"
  - "Segunda empresa reproducible en el seed (Constructora Delta) — pendiente arrastrado desde la fase 1, cerrado"
  - "seedDocumentFixture(): fixture idempotente del módulo documental (2 empresas con marca, manual publicado, sección, ManualDocument PROCEDIMIENTO con tabla, 2 activaciones, usuaria líder con login real)"
  - "seed-password.ts: hashPassword en módulo propio, único punto de verdad para el hash de Better Auth en el seed"
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07, 03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixture de seed aplicable a una base viva sin destruir datos: función idempotente (upsert/findFirst, cero deleteMany) importable tanto desde seed.ts como desde un runner desechable"
    - "Guard de campo nullable copiado literal del precedente ya resuelto (Evidence.fileKey → CompanyDocument.fileKey)"

key-files:
  created:
    - packages/db/prisma/seed-password.ts
    - packages/db/prisma/seed-documents.ts
  modified:
    - packages/db/prisma/schema.prisma
    - packages/db/prisma/seed.ts
    - apps/web/app/files/company-document/[id]/route.ts

key-decisions:
  - "hashPassword se extrajo literal (mismos parámetros de scrypt) a seed-password.ts; seed.ts y seed-documents.ts lo importan del mismo sitio para que el login por API de los planes siguientes no dependa de dos copias que puedan divergir."
  - "El upsert de ManualDocument nunca toca contentHtml ni templateVersion en su rama update, para que re-ejecutar el runner de fixture no pise ediciones manuales hechas contra la base viva."
  - "Los logos de la fixture son SVG en línea como data-URI (no archivos en public/ ni conversión a data-URL vía certificate-assets.ts, que es sólo para @react-pdf/renderer): Company.logo se pinta directo como src de <img>, patrón de tenant-brand.tsx."
  - "El backfill de status se ejecutó igual aunque la base local tuviera 0 filas en company_documents (no-op comprobado, no supuesto), porque el plan 03-08 repite la misma sentencia contra producción."

requirements-completed: [DOC-01, DOC-03, DOC-06]

# Metrics
duration: ~45min
completed: 2026-09-02
---

# Phase 3 Plan 1: Esquema del documento nativo y fixture reproducible Summary

**Dos enums nuevos (`ManualDocumentKind`, `CompanyDocumentStatus`) y nueve columnas vía `prisma db push` aditivo, cuatro columnas de archivo relajadas a nullable con su guard 404 copiado del precedente de `Evidence`, y una fixture idempotente que por fin le da al seed la segunda empresa que la fase 1 dejó pendiente.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-02T16:08:22Z
- **Tasks:** 3 completado (task 3 sin cambios de código, sólo verificación con fixtures desechables)
- **Files modified:** 5 (2 nuevos, 3 modificados)

## Accomplishments

- Esquema soporta el arquetipo nativo: `ManualDocument` gana `kind`/`contentHtml`/`templateVersion`; `CompanyDocument` gana `kind`/`contentHtml`/`nameOverride`/`status`/`sourceTemplateVersion`/`publishedAt`/`publishedById`, y sus cuatro columnas de archivo pasan a nullable — todo vía `db push` sin `--accept-data-loss`.
- El invariante "como mucho un `VIGENTE` por (documento, empresa)" tiene su backfill idempotente verificado con doble ejecución real (no sólo leído).
- `/files/company-document/[id]` ya no puede reventar contra una fila sin archivo: 404 limpio, sin traza de excepción, autorización intacta (401/403/200/200 verificados con las cuatro sesiones reales).
- El seed por fin crea una segunda empresa (Constructora Delta, con logo y razón social propios) — pendiente registrado en STATE.md desde la fase 1 — y además un manual publicado, una sección, un documento `PROCEDIMIENTO` con tabla, y dos activaciones, todo aplicado a la base local **sin ejecutar `db:seed`** y sin tocar las dos evidencias de `form_snapshot` de la fase 1.

## Task Commits

1. **Tarea 1: esquema del documento nativo y guarda de `fileKey` nulo** - `6651e77` (feat)
2. **Tarea 2: fixture reproducible del módulo documental** - `5088059` (feat)
3. **Tarea 3: `/files/company-document` con las tres sesiones y una fila sin archivo** - sin commit propio (tarea de verificación pura; fixtures y scripts desechables no se commitean, según especifica el plan)

_Nota: el commit de metadata de este SUMMARY se hace por separado._

## Files Created/Modified

- `packages/db/prisma/schema.prisma` - Dos enums nuevos, columnas nativas en `ManualDocument`/`CompanyDocument`, cuatro columnas de archivo nullable, contra-relación `companyDocumentsPublished` en `User`
- `apps/web/app/files/company-document/[id]/route.ts` - Guard `if (!doc.fileKey) return 404` antes de `readPrivateFile`, fallback `?? "documento"` / `?? "application/octet-stream"` en la respuesta
- `packages/db/prisma/seed-password.ts` (nuevo) - `hashPassword` extraído de `seed.ts`, único punto de verdad
- `packages/db/prisma/seed-documents.ts` (nuevo) - `seedDocumentFixture()` idempotente
- `packages/db/prisma/seed.ts` - Importa `hashPassword` y `seedDocumentFixture`; llama a la fixture al final del bloque de empresa demo

## IDs de la fixture (para los planes 03-02 a 03-07)

Aplicados a la base local (`localhost:5435`, contenedor `prol-db`) con el runner desechable de la tarea 2, ejecutado dos veces para probar idempotencia (mismos ids ambas veces):

| Entidad | Id |
|---|---|
| Tenant | `cmtj13ozx0000p1bgg0a14a0f` (academia-digital) |
| Manual | `cmtkadnwj000712kpca105cgj` ("Manual de Gestión de Calidad ISO 9001", PUBLISHED, normaLabel "ISO 9001:2015") |
| Capítulo | `cmtkadnwm000912kpw1uo04hy` ("4. Contexto de la organización") |
| Sección | `cmtkadnwo000b12kpasqj47hp` (código `4.1`) |
| ManualDocument | `cmtkadnwq000d12kpez4bm5vl` (`P-RFC-4.1-01`, kind `PROCEDIMIENTO`, templateVersion 1) |
| Empresa Acme Corp | `cmtj13pae007ip1bgkz47qn7h` (slug `acme-corp`) — assignmentId `cmtkadnwz000h12kp8ot4q0xy` |
| Empresa Constructora Delta | `cmtkadnuo000312kp7itofytm` (slug `constructora-delta`) — assignmentId `cmtkadnx1000j12kp1hqskbbc` |
| Usuaria líder Constructora Delta | `cmtkadnw5000512kpjjauato3` (`lucia.delgado@constructoradelta.test`, contraseña `password123`, login por API verificado → 200) |

Conteos tras la fixture (idénticos en la primera y la segunda ejecución del runner): `companies=2`, `manuals=2` (incluye "Manual de prueba OPS-04" de la fase 1, intacto), `manual_documents=1`, `manual_assignments=3` (incluye la activación preexistente de OPS-04).

## Backfill del invariante (repetido contra producción en el plan 03-08)

```sql
UPDATE company_documents c
SET status = 'OBSOLETO'
WHERE c.status = 'VIGENTE'
  AND EXISTS (
    SELECT 1 FROM company_documents c2
    WHERE c2.document_id = c.document_id
      AND c2.company_id  = c.company_id
      AND c2.version     > c.version
  );
```

Ejecutado dos veces contra la base local: **`UPDATE 0`** ambas veces (no-op genuino, comprobado — la base local tenía 0 filas en `company_documents` en ese momento). El invariante se verificó aparte: `select count(*) from (... group by document_id, company_id having count(*)>1) x` → `0`.

## Salida de `db push`

```
🚀  Your database is now in sync with your Prisma schema. Done in 181ms

Running generate...
✔ Generated Prisma Client (v5.22.0)
```

No pidió `--accept-data-loss` en ningún momento — confirma que el diff era exactamente el aditivo descrito (dos `CREATE TYPE` para los enums nuevos, columnas nuevas, y `ALTER COLUMN ... DROP NOT NULL` en las cuatro de archivo).

## Tabla de códigos HTTP — Tarea 3

Fixture desechable: `CompanyDocument` fila A (`kind: FILE`, `version: 1`, con `fileKey` real subido vía `/api/upload/document-template`) y fila B (`kind: PROCEDIMIENTO`, `version: 2`, cuatro campos de archivo en `NULL`), ambas sobre `P-RFC-4.1-01` / Acme Corp. Servidor `next dev` real, tres sesiones reales por `sign-in/email`.

| Sesión | Fila A (con archivo) | Fila B (nativa, sin archivo) |
|---|---|---|
| ninguna | **401** | — (no probada, ya cubierta por A) |
| Constructora Delta (otra empresa) | **403** | — |
| Acme Corp (empresa dueña) | **200** | **404**, cuerpo `"No encontrado"` |
| ADMIN del tenant | **200** | — |

Verificado además: `grep -c 'readPrivateFile' <log del servidor>` → `0` — el 404 de la fila B es el guard temprano, no un `throw` de `readPrivateFile` capturado por el `catch` genérico.

Limpieza confirmada: `company_documents` → `0` filas tras borrar A y B; `evidences` con `form_snapshot` → `2` (intactas); cero archivos `_tmp-*` en `git status --porcelain`; ningún objeto borrado de R2 (no aplica en este milestone).

## Decisions Made

- `hashPassword` extraído a `seed-password.ts` con los mismos parámetros de scrypt (`N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2`), importado por `seed.ts` y `seed-documents.ts` — un solo punto de verdad para que el login por API de los planes 03-02/03-06/03-07 no dependa de dos copias.
- El `upsert` de `ManualDocument` dentro de `seedDocumentFixture` deja `contentHtml`/`templateVersion` fuera de la rama `update`, para que volver a correr el runner contra una base viva no pise una edición manual hecha por un consultor real.
- Logos de la fixture como SVG data-URI en línea (`brandLogo()`), no archivos en `public/` ni la conversión a data-URL de `certificate-assets.ts` (que es sólo para PDF vía `@react-pdf/renderer`) — en HTML normal `<img src="data:...">` ya renderiza sin red, siguiendo el patrón de `tenant-brand.tsx`.
- El backfill del invariante se ejecutó igual con la base en cero filas relevantes, porque un no-op comprobado dos veces vale más que uno supuesto, y el plan 03-08 repite la misma sentencia SQL contra producción.

## Deviations from Plan

None - plan executed exactly as written.

No se encontró ninguna sorpresa en `mammoth`, en el sanitizador ni en ninguna otra pieza al compilar — esta fase 03-01 no ejercita ni la importación `.docx` ni el editor, así que no hay nada que el plan 03-03 tenga que heredar de aquí más allá de lo ya documentado en 03-RESEARCH.md.

## Issues Encountered

- El wrapper local `rtk` (proxy de shell del usuario, ajeno al proyecto) reescribe `pnpm exec ...` cuando se invoca sin `rtk proxy` por delante, produciendo `[rtk: No such file or directory (os error 2)]`. Se resolvió anteponiendo `rtk proxy` a los comandos `prisma`/`tsx` de este plan. No es un problema del código de PROL ni requiere ningún cambio en el repo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El esquema, la guarda de `fileKey` y la fixture reproducible que los planes 03-02 a 03-07 necesitan ya existen y están verificados contra la base local real.
- Los dos call sites de OPS-05 (`getAssignmentPanel`, `getSectionForCompany`) identificados en 03-RESEARCH.md **siguen sin tocar** — es explícitamente el trabajo del plan 03-02, no de éste.
- `uploadCompanyDocument` **todavía no degrada** la fila `VIGENTE` anterior al subir un archivo nuevo — mismo alcance, pendiente para 03-02.
- Ningún bloqueo. La base local queda exactamente como el plan 03-02 la espera: `company_documents` vacía, dos evidencias de `form_snapshot` intactas, dos empresas con marca, un manual publicado con un documento `PROCEDIMIENTO` y dos activaciones.

---
*Phase: 03-procedimientos-nativos*
*Completed: 2026-09-02*

## Self-Check: PASSED

Todos los archivos creados/modificados existen en disco y ambos commits de tarea (`6651e77`, `5088059`) están presentes en el historial de git.
