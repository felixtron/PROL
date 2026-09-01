---
phase: 01-higiene-y-operacion
plan: 02
subsystem: database
tags: [prisma, postgres, row-lock, transactions, react-pdf, dedup]

# Dependency graph
requires: []
provides:
  - "uploadCompanyDocument transaccional con FOR UPDATE sobre manual_documents, sin condición de carrera en el incremento de versión de CompanyDocument"
  - "Ruta PDF de resultados de evaluación usando el helper único de data-URL del repo (loadUploadAsDataUrl)"
affects: [03-documentos-nativos, 04-registros-periodicos]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lock de fila FOR UPDATE sobre la tabla padre (manual_documents) para serializar el versionado append-only de una tabla hija (company_documents), replicando el patrón ya usado en submitEvidence"

key-files:
  created: []
  modified:
    - apps/web/lib/actions/manual.ts
    - apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx

key-decisions:
  - "El FOR UPDATE se coloca sobre manual_documents (siempre tiene fila) y no sobre company_documents (puede tener cero filas en la primera personalización); bloquear una tabla vacía no serializa nada."
  - "El script de concurrencia se descarta tras usarse (packages/db/prisma/_tmp-concurrency.ts, no commiteado); su evidencia queda documentada aquí porque es la única prueba del criterio 3."

requirements-completed: [OPS-03]

# Metrics
duration: 22min
completed: 2026-09-01
---

# Phase 01 Plan 02: Lock de versión de CompanyDocument y helper de data-URL único Summary

**`uploadCompanyDocument` ahora serializa su incremento de versión con `FOR UPDATE` sobre `manual_documents` dentro de una transacción, y la ruta PDF de resultados de evaluación usa `loadUploadAsDataUrl` en vez de una copia local de la misma función.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-01T20:57:00Z
- **Completed:** 2026-09-01T21:19:00Z
- **Tasks:** 3 (2 con commit propio, 1 desechable sin commit por diseño)
- **Files modified:** 2

## Accomplishments
- Eliminada la condición de carrera que permitía a dos subidas concurrentes del mismo documento para la misma empresa violar `@@unique([documentId, companyId, version])` y perder un archivo.
- Demostrado con un experimento de control (reproduce el bug) y uno de tratamiento (demuestra el fix) contra la base local — ver salida íntegra abajo.
- Eliminada la segunda de tres implementaciones idénticas de "cargar un upload como data-URL", dejando una sola fuente de verdad en `certificate-assets.ts` antes de que la fase de documentos nativos necesite una tercera.

## Task Commits

Cada tarea con cambios persistentes fue commiteada atómicamente:

1. **Tarea 1: lock de fila en uploadCompanyDocument** - `160bc5a` (fix)
2. **Tarea 2: script desechable de concurrencia** - sin commit (por diseño: el script se ejecuta y se borra, nunca se commitea). Ver evidencia de ejecución más abajo.
3. **Tarea 3: eliminar el helper de data-URL duplicado** - contenido correcto y verificado, pero **ver nota de deviation**: quedó incluido, por una condición de carrera de git entre agentes paralelos, dentro del commit `bf7cc3a` (que pertenece al plan 01-01, "feat(01-01): declarar y montar el volumen privado en docker-compose.prod.yml").

**Plan metadata:** (este commit)

## Files Created/Modified
- `apps/web/lib/actions/manual.ts` - `uploadCompanyDocument` envuelve la lectura de la última versión y la creación en `db.$transaction`, con `SELECT 1 FROM manual_documents WHERE id = ... FOR UPDATE` como primera sentencia.
- `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx` - Elimina `loadAsDataUrl` local y sus tres imports huérfanos (`node:fs/promises`, `node:path`, `@/lib/upload-paths`); importa y usa `loadUploadAsDataUrl` de `@/lib/certificate-assets`.

## Decisions Made
- Confirmado en el propio código: `manual_documents` es el punto de lock correcto porque siempre tiene fila (se crea en `createManualDocument`), mientras que `company_documents` puede no tener ninguna fila la primera vez que una empresa personaliza un documento — un `FOR UPDATE` sobre cero filas no bloquea nada.
- El chequeo de pertenencia documento↔manual (`doc.manualId !== assignment.manualId`) se dejó fuera de la transacción, tal como especificaba el plan: es una validación de negocio, no parte de la carrera de versión.
- Ninguna advertencia de lint desapareció con la Tarea 3 (la línea base sigue en 81; el helper borrado no tenía advertencias asociadas), así que no hay nueva línea base que anotar.

## Deviations from Plan

### Auto-fixed Issues

Ninguna de las Reglas 1-3 aplicó: el plan se ejecutó tal como estaba escrito en cuanto a contenido de código.

### Otras desviaciones (no relacionadas con las Reglas 1-4)

**1. Condición de carrera de git entre agentes paralelos — commit de la Tarea 3 mezclado con el de otro plan**
- **Encontrado durante:** Tarea 3 (eliminar el helper de data-URL duplicado).
- **Qué pasó:** Este plan (01-02) se ejecutó en paralelo con el plan 01-01 sobre el mismo working tree (sin aislamiento por rama; `branching_strategy: "none"` en `.planning/config.json`). Hice `git add "apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx"` y a continuación `git commit`, pero entre ambos comandos el agente del plan 01-01 completó su propio `git commit` primero. Ese commit (`bf7cc3a`, "feat(01-01): declarar y montar el volumen privado en docker-compose.prod.yml") terminó incluyendo mi archivo ya staged junto con el suyo (`docker-compose.prod.yml`).
- **Verificación de que el contenido es correcto:** `git show --stat bf7cc3a` confirma exactamente el diff esperado de la Tarea 3 (40 líneas, -38/+2) sobre `route.tsx`, y una relectura posterior del archivo confirma que el import y la llamada a `loadUploadAsDataUrl` quedaron aplicados sin corrupción.
- **Por qué no se corrigió con un rebase/amend:** El plan 01-01 podía seguir operando sobre ese commit en paralelo; reescribir historia compartida es exactamente lo que las reglas de seguridad de git de este flujo prohíben salvo pedido explícito del usuario. El código está correcto y en el historial; sólo el mensaje de commit no le pertenece a este plan.
- **Impacto:** Ninguno sobre el resultado funcional. Sólo afecta la trazabilidad commit-por-tarea de este plan específico para la Tarea 3.
- **Archivos:** `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx`
- **Commit real:** `bf7cc3a` (mensaje pertenece al plan 01-01)

---

**Total deviations:** 1 (condición de carrera de infraestructura de ejecución paralela, no de código)
**Impact on plan:** Ninguno sobre corrección, seguridad o alcance. Recomendación para el orquestador: cuando `parallelization.enabled` esté activo con `branching_strategy: "none"`, considerar serializar el `git add`+`git commit` entre agentes (lock) o adoptar aislamiento por rama por plan para evitar que un commit de un plan absorba archivos staged de otro.

## Evidencia del criterio 3 — script de concurrencia (Tarea 2)

El script (`packages/db/prisma/_tmp-concurrency.ts`, ejecutado y borrado, no commiteado) hace:
1. Fixture: reutiliza `company` y `author` del seed; crea un `Manual` y un `ManualDocument` temporales.
2. **Fase A (control, sin lock):** dos escrituras que replican el código ANTERIOR — `findFirst` suelto, barrera para que ambas lean antes de que ninguna escriba, luego `create` suelto — lanzadas con `Promise.allSettled`. Exige que al menos una rechace con `P2002`; si no, aborta con error explícito (la prueba de control es obligatoria).
3. Limpieza de las filas creadas por la fase A.
4. **Fase B (con lock, código nuevo):** copia literal del cuerpo de la transacción que dejó la Tarea 1 (`FOR UPDATE` sobre `manual_documents`, `findFirst`, `create`), lanzada con `Promise.all` (sin barrera, para no forzar un interbloqueo artificial). Exige cero rechazos y versiones consecutivas.
5. `finally`: borra el `Manual` temporal (cascada se lleva el resto) y desconecta.

**Salida real de la ejecución** (`pnpm --filter @prol/db exec tsx prisma/_tmp-concurrency.ts`, contra `localhost:5435`):

```
FASE A (sin lock):
  escritura 1: RECHAZADA (P2002)
  escritura 2: OK, version creada
  => El bug es reproducible (al menos un P2002).

FASE B (con lock):
  escritura 1: OK, version 2
  escritura 2: OK, version 1
  => Versiones consecutivas (1, 2), cero errores.

RESULTADO: PASS
```

Verificado tras la ejecución:
- `docker exec prol-db psql -U prol -d prol -c "SELECT count(*) FROM manuals WHERE title = 'TMP concurrencia';"` → `0` (base local quedó limpia).
- `rm packages/db/prisma/_tmp-concurrency.ts` seguido de `git status --porcelain | grep _tmp-concurrency` → sin salida (script eliminado, nunca estuvo en el índice de git).

Si la fase 3 (documentos nativos) necesita repetir este experimento sobre el nuevo versionado, la idea en 10 líneas es: crear fixture mínimo → fase de control sin transacción con barrera de sincronización exigiendo al menos un `P2002` (o abortar el experimento si no falla) → limpiar → fase con lock usando `Promise.all` sin barrera exigiendo cero errores y versiones consecutivas → limpiar en `finally` y desconectar.

## Issues Encountered
Ninguno más allá de la condición de carrera de git documentada arriba en Deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- El patrón de lock de fila sobre la tabla padre queda documentado y probado; reutilizable en la fase 3 (documentos nativos) si el nuevo modelo de versionado enfrenta la misma carrera.
- Sin bloqueos para el resto de la fase 1. Los planes 01-01, 01-03 y 01-04 son independientes de este.

---
*Phase: 01-higiene-y-operacion*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: apps/web/lib/actions/manual.ts
- FOUND: apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx
- FOUND: .planning/phases/01-higiene-y-operacion/01-02-SUMMARY.md
- OK: packages/db/prisma/_tmp-concurrency.ts no existe (desechado según el plan)
- FOUND commit 160bc5a (Tarea 1)
- FOUND commit bf7cc3a (contiene el diff de la Tarea 3, mezclado con 01-01 — ver Deviations)
