---
phase: 02-r2-para-el-tier-confidencial
plan: 03
subsystem: infra
tags: [aws4fetch, cloudflare-r2, migration, rollback, shared-bucket]

# Dependency graph
requires:
  - phase: 02-r2-para-el-tier-confidencial
    plan: "02-02"
    provides: "document-storage.ts con STORAGE_BACKEND conmutable, sharedBucketKey() bajo prol/, dos evidencias reales en R2 (cmtjgyyk50001td2p0lfibdkw, cmtjgyykm0003td2pm6xn8ak7)"
provides:
  - "apps/web/scripts/migrate-private-to-r2.mjs: migración disco → R2 idempotente, sin borrado, sin Prisma, bajo prol/"
  - "DEPLOY.md §7c: recetas de aplicación de variables por SSH, rollback de una variable y migración (local y host), sin acentos salvo la cadena de log a buscar"
  - "Criterio 2 de la fase demostrado en local: una fileKey previa a la migración resuelve igual en los dos backends, sin tocar la base"
  - "Criterio 4 de la fase demostrado: quitar R2_BUCKET y reiniciar devuelve la app al disco sin desplegar código, con el par 404/200 como prueba"
  - "Matriz de cinco estados de configuración demostrada contra el servidor real"
  - "Cuatro evidencias adicionales en la base local (dos de 02-02 nativas de R2, dos de 02-03 migradas de disco) como banco de regresión"
affects: [02-04-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Script de migración .mjs standalone que duplica deliberadamente la constante de prefijo y la config de AwsClient de document-storage.ts/r2.ts, porque un .mjs no puede importar un .ts"
    - "Override de eslint.config.js por directorio (files: ['scripts/**/*.mjs']) para declarar globals de Node sin arrastrar globals.node a todo el árbol de Next.js"

key-files:
  created:
    - apps/web/scripts/migrate-private-to-r2.mjs
  modified:
    - DEPLOY.md
    - apps/web/eslint.config.js

key-decisions:
  - "El encabezado del script evita literalmente la palabra 'Prisma' (aunque el texto de la acción del plan la sugería) para no chocar con la propia puerta de verificación del plan, que hace grep -i 'prisma' esperando cero coincidencias."
  - "eslint.config.js gana un override scoped a scripts/**/*.mjs con { process: 'readonly' } en vez de importar el paquete 'globals': ese paquete no es una dependencia directa de apps/web y no se resuelve fuera de packages/eslint-config bajo pnpm estricto."

requirements-completed: [R2-02, R2-04]

# Metrics
duration: ~35min
completed: 2026-09-02
---

# Phase 2 Plan 3: Migración disco → R2 y rollback verificado Summary

**Script de migración idempotente disco → R2 bajo `prol/` (sin borrado, sin tocar la base), y las dos propiedades que hacen reversible la fase demostradas de punta a punta contra el servidor real: una `fileKey` anterior a la migración resuelve igual en los dos backends, y quitar `R2_BUCKET` devuelve la app al disco sin desplegar código.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-01T20:33:00-06:00 (aprox.)
- **Completed:** 2026-09-01T20:46:00-06:00 (aprox.)
- **Tasks:** 3/3 completadas
- **Files modified:** 3 (`apps/web/scripts/migrate-private-to-r2.mjs` creado, `DEPLOY.md` y `apps/web/eslint.config.js` modificados)

## Accomplishments

- `apps/web/scripts/migrate-private-to-r2.mjs` copia bajo `prol/` con HEAD previo (idempotencia) y HEAD posterior (verificación de tamaño), sin ninguna operación de borrado ni referencia a Prisma, y falla limpio en español si faltan credenciales.
- `DEPLOY.md` §7c documenta la aplicación de las cuatro variables por SSH, el rollback de una sola variable y las dos recetas de migración (local, verificada; host, no ejecutada todavía), marcando explícitamente el estado "NO APLICADO en producción".
- Dos evidencias fabricadas con el backend en disco se subieron, se descargaron (línea base), se migraron, y siguieron descargándose con el mismo `sha256` **con el directorio de disco apartado**: los bytes sólo pudieron venir del bucket.
- La segunda pasada de la migración copió cero archivos (idempotencia demostrada con salida literal).
- La base de datos no cambió ni un carácter en las dos filas migradas, y ninguna `file_key` de toda la tabla contiene `prol/`.
- Matriz de cinco estados demostrada: R2 con disco presente (200), R2 con disco apartado (200, ida y vuelta completa), disco con disco presente (200), disco con disco apartado (404), y configuración parcial (arranca, lee 200 de disco, rechaza escritura con 503).
- Las dos evidencias de `form_snapshot` de la fase 1 (`1|f`, `2|t`) siguen intactas.

## Task Commits

1. **Tarea 1: script de migración disco → R2 y sección 7c de DEPLOY.md** - `62c2e62` (feat)
2. **Tarea 2: criterio 2 — misma fileKey en los dos backends** — sin commit de código (scripts desechables, no se commitean)
3. **Tarea 3: criterio 4 — rollback y configuración parcial** — sin commit de código, pero generó un fix necesario para la puerta de lint: `f81f30a` (fix)

**Plan metadata:** (pendiente — commit final de este SUMMARY + STATE + ROADMAP + REQUIREMENTS)

## Files Created/Modified

- `apps/web/scripts/migrate-private-to-r2.mjs` — migración idempotente disco → R2, cuatro variables o sale con código 1, sólo escribe bajo `prol/`, sin borrado y sin importar Prisma ni `@prol/db`.
- `DEPLOY.md` — sección 7c nueva entre la 7b y el "8. Verificar": aplicación de variables, rollback de una variable, y las dos recetas de migración (local verificada, host documentada pero no ejecutada).
- `apps/web/eslint.config.js` — override `files: ["scripts/**/*.mjs"]` con `languageOptions.globals.process = "readonly"` (deviation, ver abajo).

## Decisions Made

- Se reformuló una frase del encabezado del script para decir "la base de datos" en vez de "Prisma": el propio texto de la acción del plan usaba la palabra "Prisma" en un comentario ilustrativo, pero la verificación automatizada del mismo plan hace `grep -i prisma` y exige que no aparezca. Es un ajuste de redacción, no de comportamiento — no se registra como deviation de las Reglas 1-4 porque no corrige un bug ni añade funcionalidad, sólo evita una contradicción textual dentro del propio plan.
- El resto del plan se ejecutó tal como estaba especificado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] El script de migración subía el lint de 81 a 92 warnings por `no-undef` sobre `process`**
- **Found during:** Verificación transversal de la Tarea 3 (`pnpm exec turbo run lint`)
- **Issue:** `apps/web/scripts/migrate-private-to-r2.mjs` es un `.mjs` fuera del árbol de Next.js. La configuración de ESLint del repo (`@prol/eslint-config/next-js`) no declara el global `process` para archivos sueltos —sólo lo hacen implícitamente los `.ts`, donde `typescript-eslint` desactiva `no-undef` porque el compilador ya lo cubre—, así que las 11 referencias a `process.env`/`process.argv`/`process.exit` del script dispararon 11 warnings nuevos, subiendo la línea base declarada del milestone (`✖ 81 problems`) a `✖ 92 problems`.
- **Fix:** Añadido un override en `apps/web/eslint.config.js`, scoped a `files: ["scripts/**/*.mjs"]`, que declara `languageOptions.globals.process = "readonly"`. Se evitó importar el paquete `globals` (usado en `packages/eslint-config/next.js`) porque no es una dependencia directa de `apps/web` y no se resuelve fuera de `packages/eslint-config` bajo la resolución estricta de pnpm.
- **Files modified:** `apps/web/eslint.config.js`
- **Verification:** `pnpm exec turbo run lint 2>&1 | grep problems` vuelve a `✖ 81 problems (0 errors, 81 warnings)`.
- **Committed in:** `f81f30a`

---

**Total deviations:** 1 auto-arreglada (bloqueante)
**Impact on plan:** Necesaria para que la puerta de lint del milestone se mantuviera en su línea base declarada. Sin scope creep — no toca ningún archivo de aplicación (`apps/web/lib/`, `apps/web/app/`) ni el esquema.

## Issues Encountered

Ninguna otra sorpresa. El aviso de arranque `Configuración de R2 incompleta` no aparece en la primera línea del log al arrancar (a diferencia de lo que sugerían los planes 02-01/02-02): en este repo se dispara de forma perezosa, en el primer request que toca el módulo de auth, no en el `console.log` inicial de `next dev`. No cambia ninguna conclusión: el aviso sigue apareciendo, sólo que tras la primera petición (`/sign-in`), y así quedó verificado.

## Resultados del criterio 2 (Tarea 2)

**Histórico fabricado con el backend en disco**, subido vía `/api/upload/evidence` con `carlos.mendoza@gmail.com` (Acme Corp), servidor arrancado con `R2_BUCKET=`:

| Evidence id | Versión | fileKey | Tamaño | sha256 (origen) |
|---|---|---|---|---|
| `cmtjhksv500016hqhpf99jh4z` | 5 | `evidence/4d0c3f52-cd36-4b94-a676-33e50d2766c3.pdf` | 72 B | `1110668ee5e7899f081b3572ad21b26fea7d6d0e72fccf34f458c74fad9ebbfd` |
| `cmtjhksvg00036hqh226qpdb1` | 6 | `evidence/44d48853-f4ad-4f48-acf6-e367c0f77008.png` | 69 B | `b1ff9c8ea3a780bad09b346c423d2d0e46815926879b18e841d928376a946640` |

**Descarga ANTES de migrar** (backend disco): `pre1=200`, `pre2=200`, `sha256` idéntico al origen para las dos — línea base establecida.

**Salida literal de la migración, primera pasada** (`PRIVATE_UPLOAD_DIR="$PWD/apps/web/private-uploads" node --env-file=.env apps/web/scripts/migrate-private-to-r2.mjs`):
```
Directorio local de origen: /Users/flx/Documents/Developer/PROL/apps/web/private-uploads
[evidence] copiado: prol/evidence/44d48853-f4ad-4f48-acf6-e367c0f77008.png (69 bytes)
[evidence] copiado: prol/evidence/4d0c3f52-cd36-4b94-a676-33e50d2766c3.pdf (72 bytes)
[evidence] copiado: prol/evidence/73f850fc-4c83-4eca-be4d-6625ee958b5f.pdf (249 bytes)
[templates] sin archivos (el directorio no existe: .../apps/web/private-uploads/templates)

Resumen:
  evidence: copiados=3 saltados=0 fallidos=0
  templates: copiados=0 saltados=0 fallidos=0
```
(El tercer archivo, `73f850fc-...pdf`, es un residuo sin fila `Evidence` que quedó del plan 02-02 al probar el estado "backend disco" — la migración lo copia igual, correctamente: no distingue si hay o no fila en la base, sólo copia bytes de disco.)

**Salida literal de la migración, segunda pasada (idempotencia)**:
```
Directorio local de origen: /Users/flx/Documents/Developer/PROL/apps/web/private-uploads
[evidence] saltado (ya existe, mismo tamaño): prol/evidence/44d48853-f4ad-4f48-acf6-e367c0f77008.png
[evidence] saltado (ya existe, mismo tamaño): prol/evidence/4d0c3f52-cd36-4b94-a676-33e50d2766c3.pdf
[evidence] saltado (ya existe, mismo tamaño): prol/evidence/73f850fc-4c83-4eca-be4d-6625ee958b5f.pdf
[templates] sin archivos (el directorio no existe: .../apps/web/private-uploads/templates)

Resumen:
  evidence: copiados=0 saltados=3 fallidos=0
  templates: copiados=0 saltados=0 fallidos=0
```

**Disco apartado (`mv apps/web/private-uploads apps/web/private-uploads.bak`), servidor reiniciado con las cuatro variables**: `post1=200`, `post2=200`, `sha256` idéntico al origen para las dos — los bytes sólo pudieron venir del bucket.

**Base de datos, antes y después de migrar** (idéntica carácter a carácter):
```
            id             |                     file_key
---------------------------+---------------------------------------------------
 cmtjhksv500016hqhpf99jh4z | evidence/4d0c3f52-cd36-4b94-a676-33e50d2766c3.pdf
 cmtjhksvg00036hqh226qpdb1 | evidence/44d48853-f4ad-4f48-acf6-e367c0f77008.png
```
`select count(*) from evidences where file_key like 'prol/%'` → `0`. `form_snapshot`: `1|f`, `2|t` — intactas.

Disco restaurado (`mv apps/web/private-uploads.bak apps/web/private-uploads`) antes de pasar a la tarea 3.

## Resultados del criterio 4 y la matriz de configuración (Tarea 3)

| Backend | Disco presente | Resultado real |
|---|---|---|
| R2 (4 variables) | sí | `200`, sin líneas `[r2]` de rechazo — servidor `/tmp/prol-dev-r2-b.log` |
| R2 (4 variables) | no | `200`, mismo `sha256` — bytes vienen del bucket |
| disco (sin `R2_BUCKET`) | sí | `200`, mismo `sha256`, 0 líneas `component":"r2"` en `/tmp/prol-dev-rollback.log` |
| disco (sin `R2_BUCKET`) | no | `404` |
| parcial (`R2_BUCKET` sin `R2_ACCESS_KEY_ID`) | sí | arranca (`/sign-in` 200); lectura `200` con hash original; **escritura 503** |

**Ida y vuelta completa** (R2 → disco → R2), sin desplegar código, sólo cambiando `R2_BUCKET` y reiniciando el proceso de `next dev`.

**Las dos cadenas literales del estado parcial**, para que el plan 02-04 sepa qué buscar en `journalctl`:

Aviso de arranque (lazy, en el primer request que toca el módulo de auth, no en el boot inicial de `next dev`):
```
[env] Configuración de R2 incompleta: R2_BUCKET está definida pero faltan R2_ACCESS_KEY_ID. La aplicación arranca en modo disco y RECHAZARÁ las subidas de archivos confidenciales hasta que se completen. Quita R2_BUCKET si el disco es lo que quieres.
```

Rechazo de escritura (en la ruta de subida):
```
[storage] Subida rechazada por configuración de R2 incompleta: faltan R2_ACCESS_KEY_ID
```

Cuerpo del 503 visto por quien sube (sin nombrar la variable — deliberado desde el plan 02-02):
```json
{"error":"El almacenamiento de evidencias no está configurado correctamente. El archivo no se ha guardado; avisa a un administrador."}
```

Conteo de disco antes y después de la subida rechazada: `3` y `3` — el rechazo no tocó el disco.

## Ids de evidencia y `fileKey` — banco de regresión para fases siguientes

| Evidence id | Versión | fileKey | Origen |
|---|---|---|---|
| `cmtj938ve00053arl0omi0yrd` | 1 | — (form_snapshot, sin archivo) | Fase 1 |
| `cmtj9cgrn0001pjsr9bi7dyus` | 2 | — (form_snapshot, sin archivo) | Fase 1 |
| `cmtjgyyk50001td2p0lfibdkw` | 3 | `evidence/1963415c-14ec-4012-8dec-a05fe7f37806.pdf` | Plan 02-02, nativa de R2 |
| `cmtjgyykm0003td2pm6xn8ak7` | 4 | `evidence/eae03650-d04a-4089-a057-c034dd257ba6.png` | Plan 02-02, nativa de R2 |
| `cmtjhksv500016hqhpf99jh4z` | 5 | `evidence/4d0c3f52-cd36-4b94-a676-33e50d2766c3.pdf` | Plan 02-03, disco → migrada a R2 |
| `cmtjhksvg00036hqh226qpdb1` | 6 | `evidence/44d48853-f4ad-4f48-acf6-e367c0f77008.png` | Plan 02-03, disco → migrada a R2 |

## Claves nuevas escritas en el bucket compartido `ibizadata`

Recordatorio: no hay operación de borrado en esta fase, así que se quedan.

- `prol/evidence/4d0c3f52-cd36-4b94-a676-33e50d2766c3.pdf` (72 bytes, escrita por la migración de la tarea 2)
- `prol/evidence/44d48853-f4ad-4f48-acf6-e367c0f77008.png` (69 bytes, escrita por la migración de la tarea 2)
- `prol/evidence/73f850fc-4c83-4eca-be4d-6625ee958b5f.pdf` (249 bytes, escrita por la migración de la tarea 2; residuo del plan 02-02 sin fila `Evidence` asociada)

(Las dos claves del plan 02-02, `prol/evidence/1963415c-...pdf` y `prol/evidence/eae03650-...png`, ya estaban desde antes y no las tocó este plan.)

## Scripts desechables usados (ya eliminados, no comiteados)

- `packages/db/prisma/_tmp-evidence-fixture-0203.ts` — crea dos filas `Evidence` sobre `activityId: cmtj66acc000bt30lckqtuh0d` / `assignmentId: cmtj66ac20009t30l32b3yipo`, con la `fileKey` real devuelta por `/api/upload/evidence` y la versión siguiente a la máxima existente. Mismo patrón que el fixture del plan 02-02.

## User Setup Required

None. Las credenciales R2 ya estaban en el `.env` local desde el plan 02-01. El entorno local quedó, al cerrar el plan, con el servidor de desarrollo parado, `apps/web/private-uploads` en su sitio con sus tres archivos, y sin ningún `.bak` ni script `_tmp-` residual.

## Next Phase Readiness

- El script de migración y la sección 7c de `DEPLOY.md` están listos para que el plan 02-04 los use por SSH cuando el volumen de producción deje de estar vacío (hoy es un no-op documentado).
- Las dos cadenas literales del estado parcial (aviso de arranque y rechazo de escritura) quedan documentadas arriba para que el plan 02-04 sepa exactamente qué grep correr contra `journalctl` en el contenedor.
- Cuatro evidencias nuevas (dos nativas de R2 del plan 02-02, dos migradas de disco de este plan) más las dos de `form_snapshot` de la fase 1 quedan en la base local como banco de regresión para las fases siguientes.
- Ningún bloqueo para el plan 02-04.

---
*Phase: 02-r2-para-el-tier-confidencial*
*Completed: 2026-09-02*

## Self-Check: PASSED

Todos los archivos creados/modificados confirmados en disco: `apps/web/scripts/migrate-private-to-r2.mjs`, `DEPLOY.md`, `apps/web/eslint.config.js`. Los dos commits de tarea (`62c2e62`, `f81f30a`) confirmados en `git log`. El script desechable `packages/db/prisma/_tmp-evidence-fixture-0203.ts` confirmado eliminado. El entorno local quedó limpio: sin `.bak`, sin `_tmp-` residuales, servidor de desarrollo detenido.
