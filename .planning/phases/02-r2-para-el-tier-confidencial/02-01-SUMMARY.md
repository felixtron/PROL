---
phase: 02-r2-para-el-tier-confidencial
plan: 01
subsystem: infra
tags: [aws4fetch, cloudflare-r2, s3-compatible, feature-flag, env-validation]

# Dependency graph
requires:
  - phase: 01-higiene-y-operacion
    provides: volumen privado de producción respaldado, PRIVATE_UPLOAD_DIR como backend de disco actual
provides:
  - "apps/web/lib/r2.ts: cliente R2 genérico (r2Put, r2Get, r2Head, assertR2Env, isR2Configured, missingR2Env)"
  - "Avisos de arranque en lib/env.ts para las tres configuraciones de almacenamiento (sin fail-fast)"
  - "Las cuatro variables R2_* declaradas en .env.example, .env.production.example y docker-compose.prod.yml"
  - "Credenciales R2 verificadas contra el bucket real ibizadata: PUT/GET/HEAD/404 y aislamiento del prefijo prol/ confirmados"
affects: [02-02-document-storage, 02-03, 02-04-deploy]

# Tech tracking
tech-stack:
  added: ["aws4fetch@^1.0.20"]
  patterns:
    - "Cliente de servicio externo calcado del molde de cloudflare-stream.ts: getCredentials() que lanza en español + funciones exportadas que la llaman primero"
    - "Avisos de configuración parcial en assertCriticalServerEnv sin entrar en CriticalEnvSchema: warning, nunca throw, para servicios opcionales"

key-files:
  created:
    - apps/web/lib/r2.ts
  modified:
    - apps/web/lib/env.ts
    - apps/web/package.json
    - pnpm-lock.yaml
    - .env.example
    - .env.production.example
    - docker-compose.prod.yml
    - .gitignore
    - turbo.json

key-decisions:
  - "El prefijo prol/ y toda política de negocio quedan fuera de lib/r2.ts a propósito: es un cliente R2 genérico, igual que cloudflare-stream.ts no sabe nada de PROL."
  - "Ningún throw nuevo en lib/env.ts: configuración R2 parcial se avisa al arrancar (console.warn) y se rechazará al escribir en el plan 02-02, nunca tumba el arranque."
  - "turbo.json globalEnv ampliado con las cuatro R2_* (Rule 3 - blocking): sin esto, turbo/no-undeclared-env-vars subía el lint de 81 a 86 warnings."

patterns-established:
  - "Módulo de transporte a servicio externo: constante/credenciales a nivel de módulo, sin conocimiento del dominio de PROL."
  - "Cliente AwsClient cacheado a nivel de módulo por accessKeyId (a diferencia de cloudflare-stream.ts, que no cachea nada) porque aws4fetch deriva material de firma SigV4 costoso de rehacer por request."

requirements-completed: []  # R2-01 y R2-04 declarados en el frontmatter del plan, pero NO se marcan completos aquí: document-storage.ts sigue sin tocar. Ver "Deviations from Plan" — se completarán en 02-02.

# Metrics
duration: 25min
completed: 2026-09-02
---

# Phase 2 Plan 1: Cliente R2 y avisos de arranque Summary

**Cliente R2 genérico con aws4fetch firmando SigV4 contra el bucket real `ibizadata`, y arranque que avisa (sin tumbarse) de las dos configuraciones de almacenamiento problemáticas.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-01T20:00:00-06:00 (aprox.)
- **Completed:** 2026-09-01T20:10:00-06:00 (aprox.)
- **Tasks:** 3/3 completadas
- **Files modified:** 9 (8 del plan + `turbo.json` por deviation)

## Accomplishments

- `apps/web/lib/r2.ts` firma peticiones reales contra `ibizadata` (Cloudflare R2): PUT, GET, HEAD, y un 404 limpio para clave inexistente, todo verificado con un script de humo desechable que ya no existe en el repo.
- El arranque distingue los tres estados de configuración del almacenamiento confidencial y nunca falla: sin variables R2 (disco), con las cuatro (R2), y con `R2_BUCKET` sin el resto (disco + aviso). Los tres responden 200 en `/sign-in`.
- Las cuatro variables `R2_*` quedan declaradas y vacías en los tres archivos de entorno del repo, sin ninguna credencial real filtrada al diff.
- El listado real del bucket confirma que `prol/` convive con `empresas/`, `leads/`, `test/` y `whatsapp/` sin que PROL haya escrito ni una clave fuera de su prefijo.

## Task Commits

Cada tarea se commiteó atómicamente:

1. **Tarea 1: dependencia aws4fetch y módulo apps/web/lib/r2.ts** - `ad66e79` (feat)
2. **Tarea 2: avisos de arranque sobre la configuración de almacenamiento** - `2a23106` (feat)
3. **Tarea 3: declarar las variables en los tres entornos y probar el bucket real** - `c28b930` (chore, incluye el fix de `turbo.json`)

**Plan metadata:** (pendiente — commit final de este SUMMARY + STATE + ROADMAP)

## Files Created/Modified

- `apps/web/lib/r2.ts` - Cliente R2 genérico: `r2Put`, `r2Get`, `r2Head`, `assertR2Env`, `isR2Configured`, `missingR2Env`. Sin borrado, sin listado, sin mención a `prol/`.
- `apps/web/lib/env.ts` - Dos avisos nuevos (`console.warn`, sin `throw`) en `assertCriticalServerEnv`: `R2_BUCKET` presente con credenciales incompletas, y ni `R2_BUCKET` ni `PRIVATE_UPLOAD_DIR` en producción.
- `apps/web/package.json` / `pnpm-lock.yaml` - Dependencia `aws4fetch@^1.0.20`, cero paquetes transitivos.
- `.env.example` / `.env.production.example` / `docker-compose.prod.yml` - Las cuatro variables `R2_*` declaradas, vacías o con default vacío.
- `.gitignore` - Ignora `private-uploads/` (backend disco en desarrollo).
- `turbo.json` - `globalEnv` ampliado con las cuatro `R2_*` (deviation, ver abajo).

## Decisions Made

- Ninguna decisión nueva más allá de lo cerrado en CONTEXT.md: el plan se ejecutó exactamente como estaba especificado en las Tareas 1 y 2.
- Se sustituyó `/login` por `/sign-in` al ejecutar las comprobaciones de arranque de la Tarea 2: el plan citaba una ruta que no existe en este repo (`/login` da 404; la ruta real de autenticación es `/sign-in/[[...sign-in]]`). No fue necesario tocar código, sólo el comando de verificación manual — no se registra como deviation porque no cambió ningún archivo ni comportamiento del plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `turbo.json` no declaraba las variables R2_*, subiendo el lint de 81 a 86 warnings**
- **Found during:** Tarea 3, al correr la puerta transversal `pnpm exec turbo run lint`
- **Issue:** El plan no incluía `turbo.json` en `files_modified`, pero la regla `turbo/no-undeclared-env-vars` de ESLint detectó las cuatro referencias nuevas a `process.env.R2_*` (en `lib/r2.ts` y `lib/env.ts`) y generó 5 warnings nuevos (81 → 86), superando la línea base exigida por la verificación transversal del plan (`✖ 81 problems (0 errors, 81 warnings)`, sin subir).
- **Fix:** Añadidas `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` al array `globalEnv` de `turbo.json`, siguiendo el mismo patrón que las variables opcionales existentes (`CLOUDFLARE_ACCOUNT_ID`, `PRIVATE_UPLOAD_DIR`, etc.).
- **Files modified:** `turbo.json`
- **Verification:** `pnpm exec turbo run lint` vuelve a `✖ 81 problems (0 errors, 81 warnings)`, exit 1 (esperado, es la línea base sana).
- **Committed in:** `c28b930` (parte del commit de Tarea 3)

**2. [Rule 1 - Bug] REQUIREMENTS.md marcaba R2-01 y R2-04 como "Complete" tras este plan, siendo falso**
- **Found during:** Actualización de estado tras completar las tres tareas
- **Issue:** El frontmatter del plan declara `requirements: [R2-01, R2-04]`, y siguiendo el protocolo estándar (`requirements mark-complete`) ambos quedaron marcados `[x]`/"Complete". Pero el propio objetivo del plan dice explícitamente "Este plan no cambia dónde se guarda ni un solo archivo — la aplicación sigue escribiendo a disco". R2-01 ("viven en R2") y R2-04 ("quitar una variable devuelve al disco") no son ciertos todavía: `document-storage.ts` no tiene ninguna rama R2 hasta el plan 02-02. Marcarlos completos aquí habría corrompido la trazabilidad para las auditorías de fase.
- **Fix:** Revertidos a `[ ]`/pendientes en `REQUIREMENTS.md`, con una nota en la tabla de trazabilidad explicando qué parte entregó este plan (el cliente R2 probado y los avisos de arranque) y qué falta (el backend conmutable de 02-02) antes de poder marcarlos completos de verdad.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verificación:** Lectura manual confirma que ninguna evidencia se lee o escribe hoy desde R2 — `document-storage.ts` no aparece en el diff de este plan.
- **Committed in:** commit de metadatos final de este plan (junto con STATE.md y ROADMAP.md)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 corrección de trazabilidad)
**Impact on plan:** Necesarios para que la puerta de lint del milestone se mantuviera en su línea base declarada y para que `REQUIREMENTS.md` refleje la realidad del código, no la intención del frontmatter del plan. Sin scope creep.

## Issues Encountered

- El plan referenciaba `http://localhost:3000/login` en los comandos de verificación de arranque de la Tarea 2, pero esa ruta no existe en este repo (404). La ruta real es `/sign-in`. Se usó `/sign-in` para las tres comprobaciones de arranque; los tres estados respondieron 200 como exige el criterio de éxito. No requirió ningún cambio de código.

## Evidencia del script de humo (Tarea 3)

Script `apps/web/scripts/_tmp-r2-smoke.mjs`, ejecutado con `node --env-file=.env` y eliminado inmediatamente después (no se conserva; no hay operación de borrado en R2 en esta fase). Salida literal:

```
[1/7] Guarda de prefijo OK. Clave: prol/_smoke/7f8559d2-23bb-4e35-84db-667ab38f791a.txt
[2/7] PUT OK. status=200
[3/7] GET OK. status=200, cuerpo idéntico ("humo 2026-09-02T02:05:30.385Z")
[4/7] HEAD OK. status=200, content-length=29 (esperado 29)
[5/7] GET de clave inexistente OK. status=404 (clave: prol/_smoke/c544b086-aca4-45f8-b629-ca1bed0c2297.txt)
[6/7] Listado bajo prol/ OK. 1 claves, todas bajo prol/.
[7/7] Listado de la raíz (CommonPrefixes): empresas/, leads/, prol/, test/, whatsapp/

TODOS LOS PASOS COMPLETARON CORRECTAMENTE.
```

**El objeto de humo `prol/_smoke/7f8559d2-23bb-4e35-84db-667ab38f791a.txt` (29 bytes) se quedó en el bucket `ibizadata`.** No hay operación de borrado en esta fase (decisión cerrada en CONTEXT: bucket compartido, ninguna operación `r2Delete`), así que no se limpió. Es intencional.

El listado de la raíz confirma que, además de `empresas/` y `leads/` (del CRM de IBIZA), el bucket ya tenía también `test/` y `whatsapp/` — prefijos preexistentes no mencionados en CONTEXT, pero que `prol/` no interfiere con ninguno de ellos.

## Estados de arranque verificados (Tarea 2)

Los tres arrancan; sólo el tercero deja un aviso. `/sign-in` respondió 200 en los tres casos:

| Estado | R2_BUCKET | Otras 3 credenciales | HTTP /sign-in | Aviso en log |
|---|---|---|---|---|
| (a) Sin ninguna variable R2 | ausente | ausentes | 200 | Ninguno |
| (b) Las cuatro del `.env` local | presente | presentes | 200 | Ninguno |
| (c) `R2_BUCKET` sin `R2_ACCOUNT_ID` | presente | `R2_ACCOUNT_ID` ausente | 200 | Sí (ver abajo) |

Mensaje literal del aviso en el estado (c):

```
[env] Configuración de R2 incompleta: R2_BUCKET está definida pero faltan R2_ACCOUNT_ID. La aplicación arranca en modo disco y RECHAZARÁ las subidas de archivos confidenciales hasta que se completen. Quita R2_BUCKET si el disco es lo que quieres.
```

**Qué NO significa este aviso:** no es un fallo de arranque — la app está arriba y sirviendo `/sign-in` con 200. Lo que se rechazará (a partir del plan 02-02) son las subidas de archivos confidenciales, no el resto de la plataforma. El plan 02-04 debe buscar exactamente la cadena `Configuración de R2 incompleta` en los logs del contenedor.

## User Setup Required

None - no external service configuration required. Las credenciales R2 ya existen en el `.env` local (gitignored) y quedaron verificadas contra el bucket real. Pendiente para un plan de despliegue posterior (no éste): aplicarlas al env del contenedor en el VPS por SSH (`/etc/containers/env/prol-web-1.env`), nunca commiteadas.

## Next Phase Readiness

- `lib/r2.ts` está listo y probado contra `ibizadata` para que el plan 02-02 reescriba los cuerpos de `storePrivateFile`/`readPrivateFile` en `document-storage.ts`, con el prefijo `prol/` viviendo en esa frontera (no en `r2.ts`, no en `fileKey`).
- `document-storage.ts` no se tocó en este plan — la app sigue escribiendo a disco exactamente como antes.
- El aviso de arranque `Configuración de R2 incompleta` ya está en producción de código: cuando el plan 02-02 active `STORAGE_BACKEND === "r2"` con configuración parcial, el mensaje ya es descubrible en logs antes de la primera subida rechazada.
- Ningún bloqueo para 02-02, 02-03 o 02-04.

---
*Phase: 02-r2-para-el-tier-confidencial*
*Completed: 2026-09-02*

## Self-Check: PASSED

All created/modified files verified present: `apps/web/lib/r2.ts`, `apps/web/lib/env.ts`, `apps/web/package.json`, `.env.example`, `.env.production.example`, `docker-compose.prod.yml`, `.gitignore`, `turbo.json`. All three task commits (`ad66e79`, `2a23106`, `c28b930`) verified present in git log. Disposable smoke script `apps/web/scripts/_tmp-r2-smoke.mjs` confirmed removed.
