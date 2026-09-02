---
phase: 02-r2-para-el-tier-confidencial
plan: 02
subsystem: documentos-confidenciales
tags: [cloudflare-r2, feature-flag, shared-bucket, storage-backend, authorization]

# Dependency graph
requires:
  - phase: 02-r2-para-el-tier-confidencial
    plan: "02-01"
    provides: "lib/r2.ts probado contra ibizadata (r2Put, r2Get, isR2Configured, missingR2Env) y avisos de arranque para configuración R2 parcial"
provides:
  - "document-storage.ts con STORAGE_BACKEND conmutable (r2 | disk), decidido una vez por proceso"
  - "sharedBucketKey(): traduce fileKey <subdir>/<uuid>.<ext> a prol/<subdir>/<uuid>.<ext> sólo dentro de la frontera de almacenamiento"
  - "storePrivateFile rechaza con 503 cuando R2_BUCKET está y falta alguna otra credencial, sin degradar a disco"
  - "Dos evidencias reales en R2 bajo prol/evidence/, con filas Evidence en la base local, listas para el criterio 2 y el rollback del plan 02-03"
affects: [02-03-migracion-y-rollback, 02-04-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Interruptor de backend a nivel de módulo (STORAGE_BACKEND), decidido una sola vez al primer import, igual patrón que R2_PARTIAL_ENV"
    - "Guarda de forma de clave que hace de frontera del prefijo compartido (sharedBucketKey), sin test runner: corre en cada lectura/escritura real"

key-files:
  created: []
  modified:
    - apps/web/lib/document-storage.ts

key-decisions:
  - "El rechazo por configuración parcial (503) vive DESPUÉS de las validaciones de MIME/tamaño/vacío, para no alterar el orden de sus mensajes ya establecido."
  - "sharedBucketKey() se llama FUERA del try/catch en storePrivateFile: si lanza es un bug de forma de clave, no un fallo de red, y no debe disfrazarse de 'vuelve a intentarlo' (502)."
  - "readPrivateFile no lleva ninguna guarda de configuración parcial: en ese estado STORAGE_BACKEND vale 'disk', así que la lectura va a disco y devuelve null si no hay nada — ya contemplado por las tres rutas /files/*."
  - "Descubierto un bug pre-existente (commit d991c31, ajeno a esta fase): las rutas que comparan message === 'Unauthorized' nunca ven ese string porque requireUser() ahora lanza 'Sesión expirada...'. No se corrige aquí: toca 8 rutas fuera de los archivos permitidos por el CONTEXT, y no lo causó este plan. Registrado en deferred-items.md."

requirements-completed: [R2-01]  # R2-03 NO se marca completo sin salvedad — ver sección de abajo

# Metrics
duration: 45min
completed: 2026-09-02
---

# Phase 2 Plan 2: Backend conmutable R2/disco en document-storage.ts Summary

**`storePrivateFile`/`readPrivateFile` reescritos con una rama R2 y una de disco tras un único interruptor de módulo; dos evidencias reales quedaron en el bucket compartido `ibizadata` bajo `prol/evidence/`, descargadas bit a bit idénticas por `/files/evidence/[id]`.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-09-01T20:00:00-06:00 (aprox.)
- **Completed:** 2026-09-01T20:27:00-06:00 (aprox.)
- **Tasks:** 3/3 completadas
- **Files modified:** 1 (`apps/web/lib/document-storage.ts`)

## Accomplishments

- `document-storage.ts` tiene un único interruptor `STORAGE_BACKEND` (`"r2" | "disk"`), decidido una vez por proceso a partir de `isR2Configured()`. Las dos funciones públicas (`storePrivateFile`, `readPrivateFile`) mantienen firmas byte-idénticas y ganan una rama R2 cada una.
- `sharedBucketKey()` es la única función que aplica el prefijo `prol/` del bucket compartido; vive dentro de la frontera de almacenamiento y lanza si la forma de la clave no es exactamente `<evidence|templates>/<uuid+ext>`.
- Dos evidencias reales (PDF y PNG) se subieron por `/api/upload/evidence` con R2 activo, aparecieron como objetos en `ibizadata` bajo `prol/evidence/<uuid>.<ext>` con el tamaño correcto, y **no** existen como objetos sin el prefijo (HEAD → 404). Sus `fileKey` en la base son `evidence/<uuid>.<ext>`, sin rastro de `prol/`.
- Las mismas dos evidencias se descargaron por `/files/evidence/<id>` con `sha256` idéntico al archivo original, `Content-Type` correcto y `Content-Disposition: attachment`.
- Los tres estados de configuración de R2 quedaron demostrados contra el servidor real (tabla abajo): sin variables → disco con 200; las cuatro → R2 con 200; `R2_BUCKET` con una credencial ausente → **la app arranca**, la subida se rechaza con **503** sin nombrar la variable en la respuesta (sólo en el log), y el disco no recibe nada.
- La autorización de `/files/evidence/[id]` (403 desde otra empresa, 200 para la empresa dueña, 200 para el revisor del tenant) sigue exactamente igual que antes de mover el backend a R2 — ver salvedad sobre "sin sesión" abajo.
- Las dos evidencias de `form_snapshot` de la fase 1 (`1|f`, `2|t`) siguen intactas.

## Task Commits

1. **Tarea 1: backend conmutable y prefijo del bucket compartido en document-storage.ts** - `7557707` (feat)
2. **Tarea 2: criterio 1 — demostración contra el servidor real** — sin commit de código (scripts desechables, no se commitean; ver detalle abajo)
3. **Tarea 3: criterio 3 — 403/401 sobre la evidencia en R2** — sin commit de código (script desechable, no se commitea)

**Plan metadata:** (pendiente — commit final de este SUMMARY + STATE + ROADMAP + REQUIREMENTS)

## Files Created/Modified

- `apps/web/lib/document-storage.ts` — cabecera actualizada para documentar los dos backends; imports de `lib/r2.ts`; constantes de módulo `STORAGE_BACKEND`, `R2_PARTIAL_ENV`, `R2_KEY_PREFIX`; función `sharedBucketKey()`; `storePrivateFile` con rechazo 503 por configuración parcial y rama R2/disco; `readPrivateFile` con rama R2 sin guarda nueva. `privateFileResponse` sin tocar.

## Decisions Made

- Ninguna decisión nueva de arquitectura: el plan se ejecutó tal como estaba especificado en la Tarea 1 (el código de `document-storage.ts` es prácticamente literal al de la acción del plan).
- Se decidió **no** marcar `R2-03` como `Complete` sin salvedad en `REQUIREMENTS.md` — ver sección "Hallazgo fuera de alcance" abajo. Es la misma disciplina de trazabilidad que el plan 02-01 aplicó a R2-01/R2-04.

## Deviations from Plan

### Auto-fixed Issues

Ninguna. La Tarea 1 no requirió ningún ajuste sobre el texto de la acción del plan: `check-types` limpio y `lint` en la línea base exacta (`✖ 81 problems (0 errors, 81 warnings)`) a la primera pasada.

### Hallazgo fuera de alcance (no corregido, documentado en `deferred-items.md`)

**[Pre-existente, ajeno a este plan] `requireUser()` ya no lanza `"Unauthorized"` — 8 rutas nunca devuelven 401 a una petición sin sesión**

- **Encontrado durante:** Tarea 3, al verificar "sin sesión → 401" sobre la evidencia servida desde R2.
- **Resultado real:** `curl` sin cookies a `/files/evidence/<id>` devolvió **403** con cuerpo `"Sesión expirada. Inicia sesión de nuevo."`, no 401 con `"No autenticado"`.
- **Causa raíz:** el commit `d991c31` ("Hardening producción — bloque 4") cambió el mensaje de `getCurrentUser()` de `"Unauthorized"` a `"Sesión expirada. Inicia sesión de nuevo."` sin actualizar los ocho `catch` (en `/files/*` y `/api/upload/*`, entre otros) que comparan `message === "Unauthorized"` para decidir el 401. Es anterior a toda la fase 2 y no tiene ninguna relación con el cambio de backend de almacenamiento.
- **Por qué no se corrige aquí:** las tres rutas `/files/*/[id]/route.ts` están explícitamente prohibidas de editar en este plan y en el CONTEXT de la fase; y aunque no lo estuvieran, el bug es transversal a ocho rutas de varios módulos — muy por fuera del radio de "backend de almacenamiento conmutable" de esta tarea.
- **Lo que SÍ queda demostrado, y es lo que el criterio 3 de la fase necesitaba:** la autorización no cambió por mover el backend a R2. Antes y después de este plan, una petición sin sesión a estas rutas devuelve 403 (no 401) — es el mismo comportamiento, sólo que distinto del que asumía la documentación del plan cuando se escribió. Otra empresa sigue en 403, la empresa dueña y el revisor del tenant siguen en 200.
- **Registrado en:** `.planning/phases/02-r2-para-el-tier-confidencial/deferred-items.md`, con el alcance completo (las ocho rutas afectadas) y una sugerencia de arreglo para quien lo priorice.
- **Impacto en trazabilidad:** `R2-03` (`/files/* sigue autorizando... 403 desde otra empresa, 401 sin sesión`) se marca `Complete` en `REQUIREMENTS.md` **con la salvedad anotada en la tabla de trazabilidad**, no como si el 401 literal se hubiera demostrado. El comportamiento sustantivo del requisito —la autorización no se rompió al cambiar de backend— sí se demostró.

---

**Total deviations:** 0 auto-arregladas, 1 hallazgo fuera de alcance documentado y no corregido.
**Impact on plan:** Ninguno sobre el código de este plan. El hallazgo afecta la redacción literal de un sub-criterio de aceptación (el código HTTP exacto para "sin sesión"), no la garantía de seguridad que ese criterio pretendía verificar.

## Resultados del criterio 1 (Tarea 2)

**`documents_enabled`:** ya estaba en `true` para el tenant `academia-digital` (`cmtj13ozx0000p1bgg0a14a0f`), verificado antes de empezar. No hizo falta activarlo.

**Evidencias creadas con R2 activo** (fixture reutilizable por el plan 02-03):

| Evidence id | Versión | fileKey | Tamaño | MIME | sha256 |
|---|---|---|---|---|---|
| `cmtjgyyk50001td2p0lfibdkw` | 3 | `evidence/1963415c-14ec-4012-8dec-a05fe7f37806.pdf` | 249 B | `application/pdf` | `e6a5f19c18a4de42377730aea87b40ea8b9331e27e6b2587d7bc6b0215e2df0a` |
| `cmtjgyykm0003td2pm6xn8ak7` | 4 | `evidence/eae03650-d04a-4089-a057-c034dd257ba6.png` | 73 B | `image/png` | `97a3a410c9bca540512251c37ce63982edccbed54c6f2e1d06ec717b9f753e29` |

Ambas cuelgan de `activityId: cmtj66acc000bt30lckqtuh0d`, `assignmentId: cmtj66ac20009t30l32b3yipo`, subidas por `carlos.mendoza@gmail.com` (`cmtj13p0f0004p1bg67enqpwq`).

**Claves reales que quedaron escritas en el bucket compartido `ibizadata`** (no se borran — esta fase no tiene operación de borrado):
- `prol/evidence/1963415c-14ec-4012-8dec-a05fe7f37806.pdf` (249 bytes, confirmado por HEAD)
- `prol/evidence/eae03650-d04a-4089-a057-c034dd257ba6.png` (73 bytes, confirmado por HEAD)
- Se confirmó que `evidence/1963415c-...pdf` y `evidence/eae03650-...png` (sin el prefijo `prol/`) **no** existen como objetos (HEAD → 404 en ambos).

**Descarga por `/files/evidence/<id>`:** las dos, `200`, `Content-Disposition: attachment`, `Content-Type` igual al MIME subido, `sha256` idéntico al original (tabla de arriba).

**Disco durante R2 activo:** `apps/web/private-uploads/evidence/` no recibió ningún archivo de esta demostración (0 antes y durante).

**Evidencias de `form_snapshot` de la fase 1:** `1|f` y `2|t` — intactas, verificadas después de crear las dos evidencias nuevas.

### Los tres estados de configuración, en la ruta de escritura

| Variables R2 | ¿Arranca? | Backend | Escritura |
|---|---|---|---|
| ninguna | sí (`/sign-in` 200) | disco | 200; el archivo apareció en `private-uploads/evidence/`; cero líneas `[r2]`/`component":"r2"` en el log |
| las cuatro | sí (`/sign-in` 200) | R2 | 200; el objeto apareció bajo `prol/evidence/` con el tamaño correcto |
| `R2_BUCKET` + falta `R2_ACCESS_KEY_ID` | **sí** (`/sign-in` 200) | disco | **503**; el disco no recibió nada (mismo conteo antes/después) |

**Aviso de arranque** (estado 3, ya lo dejó el plan 02-01, se re-confirmó aquí):
```
[env] Configuración de R2 incompleta: R2_BUCKET está definida pero faltan R2_ACCESS_KEY_ID. La aplicación arranca en modo disco y RECHAZARÁ las subidas de archivos confidenciales hasta que se completen. Quita R2_BUCKET si el disco es lo que quieres.
```

**Log de rechazo en la ruta de escritura** (línea que añadió este plan):
```
[storage] Subida rechazada por configuración de R2 incompleta: faltan R2_ACCESS_KEY_ID
```

**Cuerpo literal del 503 visto por quien sube el archivo** (sin nombrar ninguna variable — deliberado, el plan 02-04 lo necesita para reconocer este estado en producción):
```json
{"error":"El almacenamiento de evidencias no está configurado correctamente. El archivo no se ha guardado; avisa a un administrador."}
```

El archivo subido durante la prueba del estado "ninguna" quedó en
`apps/web/private-uploads/evidence/73f850fc-4c83-4eca-be4d-6625ee958b5f.pdf`
(directorio gitignored, sin fila `Evidence` asociada — es sólo la prueba de
que `storePrivateFile` escribe a disco). No requiere limpieza para el repo.

### Scripts desechables usados (ya eliminados, no comiteados)

- `apps/web/scripts/_tmp-r2-check.mjs` — recibe `fileKey` por `argv`, hace HEAD a `prol/<fileKey>` (exige 200 y compara `content-length`) y HEAD a `<fileKey>` sin prefijo (exige 404). Mismo patrón de `AwsClient({ service: "s3", region: "auto" })` que el humo del plan 02-01.
- `packages/db/prisma/_tmp-evidence-fixture.ts` — crea una fila `Evidence` por cada `fileKey` real devuelto por la ruta de subida, con la versión siguiente a la máxima existente para la actividad del fixture (`cmtj66acc000bt30lckqtuh0d`). No tocó las dos evidencias de `form_snapshot`.
- `packages/db/prisma/_tmp-outsider.ts` — crea un `User` `STUDENT` con `companyId: null` en el mismo tenant del fixture (`cmtj13ozx0000p1bgg0a14a0f`), y su cuenta de credenciales reutilizando literalmente el `hashPassword` de `seed.ts` (mismo scrypt que Better Auth). Se borró junto con su `Account` al terminar.

Si el plan 02-03 o la fase 6 necesitan repetir el montaje, estos tres scripts son reproducibles a partir de esta descripción; ninguno requiere cambios de esquema.

## Resultados del criterio 3 (Tarea 3)

Sobre la evidencia `cmtjgyyk50001td2p0lfibdkw` (servida desde R2):

| Usuario | Rol / relación | Código | Cuerpo |
|---|---|---|---|
| (sin sesión) | — | **403** (esperado 401 — ver salvedad arriba) | `Sesión expirada. Inicia sesión de nuevo.` |
| `ajeno@ejemplo.test` | STUDENT, otra empresa (`companyId: null`) | **403** | `No autorizado` |
| `carlos.mendoza@gmail.com` | STUDENT, empresa dueña (Acme Corp) | **200** | (bytes del PDF) |
| `maria.garcia@academiadigitalmx.com` | PROFESSOR, revisora del tenant | **200** | (bytes del PDF) |

Los controles positivos (empresa dueña y revisor, ambos 200) descartan que la ruta esté simplemente rota para todos. El usuario ajeno y su cuenta se borraron de la base al terminar (`select count(*) from users where email = 'ajeno@ejemplo.test'` → `0`).

## Issues Encountered

- Ver "Hallazgo fuera de alcance" arriba: `requireUser()` no lanza `"Unauthorized"` desde el commit `d991c31`, así que ocho rutas —incluidas las tres de `/files/*`— nunca devuelven 401 a una petición sin sesión. Pre-existente, fuera de los archivos que este plan puede tocar, registrado en `deferred-items.md`.
- Ninguna otra sorpresa: `check-types`, `lint` (línea base `✖ 81 problems`) y `build` pasaron a la primera en las tres corridas (después de la Tarea 1 y al cierre de la Tarea 3).

## User Setup Required

None. Las credenciales R2 ya estaban en el `.env` local (plan 02-01) y el servidor quedó, al cerrar el plan, en el estado (b) — las cuatro variables presentes, backend R2 activo — listo para que el plan 02-03 continúe sin reconfigurar nada.

## Next Phase Readiness

- El interruptor `STORAGE_BACKEND` y la rama de disco completa están listos para el rollback que el plan 02-03 tiene que demostrar (quitar `R2_BUCKET` y reiniciar vuelve a disco sin desplegar código — ya verificado aquí como estado (a)).
- Las dos evidencias reales en R2 (`cmtjgyyk50001td2p0lfibdkw`, `cmtjgyykm0003td2pm6xn8ak7`) y sus `fileKey` quedan documentadas arriba para que el plan 02-03 no tenga que rehacer el fixture.
- El cuerpo literal del 503 y el mensaje de log de configuración parcial quedan documentados arriba para que el plan 02-04 sepa qué buscar en producción.
- Ningún bloqueo nuevo para 02-03 o 02-04, salvo el hallazgo fuera de alcance ya registrado en `deferred-items.md` (no bloquea: la autorización real no cambió por este plan).

---
*Phase: 02-r2-para-el-tier-confidencial*
*Completed: 2026-09-02*

## Self-Check: PASSED

`apps/web/lib/document-storage.ts` confirmado en disco con el interruptor `STORAGE_BACKEND`. Commit de la Tarea 1 (`7557707`) confirmado en `git log`. Los tres scripts desechables (`apps/web/scripts/_tmp-r2-check.mjs`, `packages/db/prisma/_tmp-evidence-fixture.ts`, `packages/db/prisma/_tmp-outsider.ts`) confirmados eliminados. `deferred-items.md` confirmado en disco con el hallazgo fuera de alcance.
