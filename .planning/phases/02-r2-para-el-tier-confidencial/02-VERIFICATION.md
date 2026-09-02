---
phase: 02-r2-para-el-tier-confidencial
verified: 2026-09-02T04:23:28Z
status: passed
score: 4/4 truths verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/4 truths fully verified, 1 partial
  gaps_closed:
    - "Una petición sin sesión a /files/* (y a las siete rutas hermanas) recibe 401"
  gaps_remaining: []
  regressions: []
human_verification: []
---

# Phase 2: R2 para el tier confidencial Verification Report

**Phase Goal:** Las evidencias y plantillas confidenciales se guardan y leen desde
Cloudflare R2, sin que cambie el esquema, el cliente ni la autorización.
**Verified:** 2026-09-02T04:23:28Z
**Status:** passed
**Re-verification:** Sí — después de cerrar el hueco del criterio 3

## Resolución del hueco (historial)

Esta sección preserva el fallo original de la verificación inicial (2026-09-02T03:38:59Z),
íntegro, para que el registro muestre qué se encontró, cómo se juzgó y cómo se cerró —
no sólo el estado final en verde.

> **Hallazgo original:** Verificado directamente en el código: `requireUser()`
> (`apps/web/lib/auth.ts:194`) lanzaba `new Error("Sesión expirada. Inicia sesión de
> nuevo.")` desde el commit `d991c31` (6 de mayo de 2026, "Hardening producción —
> bloque 4"), muy anterior a toda la fase 2. Las ocho rutas que traducen la falta de
> sesión a un código HTTP seguían comparando `message === "Unauthorized"` — una cadena
> que ya no lanzaba nadie — así que esa rama era código muerto y todas caían al
> `else`/catch genérico, que devolvía 403 con el cuerpo "Sesión expirada. Inicia sesión
> de nuevo." en vez de 401 con "No autenticado".
>
> **Mi fallo entonces:** trato esto como **parcialmente verificado**, no como aprobado
> sin más ni como bloqueante duro de toda la fase. El framework de verificación pide
> comprobar la verdad observable tal como está redactada, no reinterpretarla a
> conveniencia — así que no puedo marcar "VERIFIED" sin más cuando el código demuestra
> lo contrario del texto literal. Pero el propósito real de la fase (que el cambio de
> backend no rompa nada de autorización) sí estaba demostrado con evidencia de código y
> de ejecución real: el bug era pre-existente (`d991c31`, anterior a toda la fase),
> ningún commit de código de la fase tocaba `auth.ts` ni las ocho rutas afectadas, y el
> plan 02-02 tenía **prohibido explícitamente** tocar las tres rutas `/files/*/[id]` —
> corregirlo ahí habría violado su propio contrato de alcance.
>
> **Costo de remediación estimado entonces:** pequeño en líneas (ocho comparaciones de
> string y un mensaje de origen) pero transversal — toca un helper de autenticación
> compartido por toda la aplicación y ocho rutas de cuatro módulos distintos. No era
> responsabilidad de esta fase por diseño, pero alguien tenía que priorizarlo como su
> propio plan pequeño.

**Decisión del usuario:** en vez de aceptar la salvedad y dejar R2-03 con nota, el
usuario decidió cerrar el hueco de inmediato, fuera del alcance de los cuatro planes de
la fase, con el commit `5e2352d` ("fix(auth): distinguir falta de sesión de falta de
permisos con un error propio").

**Qué cambió `5e2352d`:**
- Añadió la clase `UnauthenticatedError` en `apps/web/lib/auth.ts`; `requireUser()`
  ahora lanza esa clase en vez de un `Error` genérico. El mensaje visible en español no
  cambió ("Sesión expirada. Inicia sesión de nuevo.") — sólo la identidad del error, así
  que las rutas dejan de depender del texto exacto.
- Las ocho rutas que antes comparaban `err.message === "Unauthorized"` ahora comprueban
  `err instanceof UnauthenticatedError`.
- `apps/web/app/api/upload/document-template/route.ts` además conflaba autenticación y
  autorización en un solo 403; ahora devuelve 401 para lo primero y 403 para lo segundo.
- `apps/web/REQUIREMENTS.md` (R2-03) y `deferred-items.md` se actualizaron en el commit
  `4bc0ed9` para registrar el cierre.

## Verificación del cierre (esta re-verificación)

**1. El commit hace lo que dice, verificado leyendo el código, no el resumen:**
`apps/web/lib/auth.ts` líneas 202-213 confirma la clase `UnauthenticatedError extends
Error` y que `requireUser()` lanza exactamente esa clase (`throw new
UnauthenticatedError()`) cuando `getCurrentUser()` devuelve `null`. El mensaje que lleva
la excepción sigue siendo el mismo texto en español. `git show 5e2352d --stat` confirma
los 9 archivos tocados (8 rutas + `auth.ts`), 40 inserciones/16 borrados, consistente con
el resumen del commit.

Las ocho rutas se leyeron íntegras, no sólo el diff:
- `apps/web/app/files/evidence/[id]/route.ts`, `company-document/[id]/route.ts`,
  `manual-document/[id]/route.ts`: catch ahora es `if (err instanceof
  UnauthenticatedError) return new NextResponse("No autenticado", {status:401})`, con
  fallback a 403 genérico igual que antes para cualquier otro error.
- `apps/web/app/api/assignments/[lessonId]/route.ts`,
  `apps/web/app/api/upload/evidence/route.ts`, `.../pdf/route.ts`,
  `.../assignment/route.ts`: mismo patrón con `NextResponse.json`.
- `apps/web/app/api/upload/document-template/route.ts`: ahora separa explícitamente
  `instanceof UnauthenticatedError` (401) de `message.startsWith("No autorizado")` (403),
  con un comentario en el propio código explicando la distinción.

**2. No quedan comparaciones muertas de `"Unauthorized"`:**
`grep -rn '"Unauthorized"' apps/web --include="*.ts" --include="*.tsx"` sólo devuelve dos
coincidencias: una en `apps/web/.next/standalone/apps/web/lib/auth.ts` (artefacto de
build, no fuente) y una en el comentario JSDoc de `apps/web/lib/auth.ts:197`, que
documenta la causa raíz histórica, no una comparación activa. `grep -rl
"UnauthenticatedError"` confirma que las ocho rutas más `auth.ts` la importan y usan.

**3. Regresión de los caminos 403/200 — verificado estructural y en vivo:**
Estructuralmente, en las tres rutas `/files/*/[id]`, el `403` de "otra empresa" y el
`200` de "empresa dueña" se resuelven con `return` directo dentro del `try`, sin pasar
nunca por el `catch` que tocó este commit — así que el fix no puede haberlos afectado. Lo
mismo aplica a los `403` de rol insuficiente en `pdf/route.ts` y `document-template`. En
vivo, con servidor de desarrollo local (`pnpm --filter web dev`) contra el Postgres real
(`prol-db`, datos de seed):
- Sin cookie de sesión, las ocho rutas devuelven **401**: las tres `/files/*/[id]`, `GET
  /api/assignments/[lessonId]`, y las cuatro `/api/upload/*` (incluida
  `document-template`).
- Con sesión de `carlos.mendoza@gmail.com` (STUDENT, empresa `acme-corp`, dueña de la
  evidencia `cmtjgyyk50001td2p0lfibdkw`): `GET /files/evidence/[id]` → **200**.
- Con sesión de `admin@prol.prosuite.pro` (ADMIN del tenant), `maria.garcia@...`
  (PROFESSOR del tenant) y `super@prol.prosuite.pro` (SUPER_ADMIN): la misma evidencia →
  **200** en los tres casos (revisor de tenant y bypass de super admin, sin cambios de
  comportamiento).
- No existe en los datos de seed una segunda empresa/tenant para repetir en vivo el
  403 de "otra empresa" en esta re-verificación (sólo hay una empresa, `acme-corp`, con
  dos estudiantes). Ese caso ya fue demostrado en la verificación inicial con una
  evidencia real, y la ruta de código que lo produce (`if (!allowed) return ... 403`) no
  fue tocada por `5e2352d` — confirmado por el diff exacto arriba.
- `pnpm --filter web check-types` → limpio (`✓ Types generated successfully`, `tsc
  --noEmit` sin errores).
- `pnpm --filter web lint` → `81 problems (0 errors, 81 warnings)`, exactamente la
  línea base pre-existente del repo (el comando sale con código 1 por
  `--max-warnings 0`, no por una regresión nueva).
- Servidor de desarrollo detenido y cookies de sesión de prueba descartadas al terminar;
  no se creó ni quedó ningún registro nuevo en la base.

**4. Fallo actualizado sobre el criterio 3:** con el código leído línea por línea y las
ocho rutas ejercitadas en vivo sin sesión (401 en las ocho) y con sesión válida (200 para
dueña y revisores de tenant), el criterio 3 de ROADMAP.md — "Otra empresa recibe 403 y
una petición sin sesión recibe 401" — se cumple ahora **en su lectura literal completa**,
no sólo por intención. Truth 3 pasa de PARTIAL a VERIFIED.

**Estado de despliegue — dicho explícitamente porque importa:** producción sigue en
`55c020d` (confirmado: `git log --oneline 55c020d..5e2352d` muestra 4 commits de
diferencia, incluido el propio fix). **El fix `5e2352d` NO está desplegado.** Hasta el
próximo deploy, una petición sin sesión a `/files/*` en producción **sigue devolviendo
403**, no 401 — el hueco está cerrado en el repositorio, no todavía en el host real.
Nota aparte, sin relación con este gap: `documents_enabled = false` en los tres tenants,
así que el camino de escritura a R2 sigue verificado sólo en desarrollo local contra el
bucket real, no ejercitado a través de la interfaz de producción. El bucket `ibizadata`
es compartido con otro producto; PROL escribe únicamente bajo el prefijo `prol/`, y
borrado, reglas de expiración y versionado quedan deliberadamente fuera de alcance.

## Goal Achievement

### Observable Truths

| # | Truth (Success Criteria de ROADMAP.md) | Status | Evidence |
|---|---|---|---|
| 1 | Una evidencia nueva aparece como objeto en el bucket y se descarga por `/files/*`. | ✓ VERIFIED | Sin cambios desde la verificación inicial. `apps/web/lib/document-storage.ts` tiene la rama `STORAGE_BACKEND === "r2"` con `r2Put(sharedBucketKey(fileKey), ...)`; dos evidencias reales subidas y descargadas con `sha256` idéntico. |
| 2 | Una evidencia anterior a la migración se descarga igual, sin haber tocado la base de datos. | ✓ VERIFIED | Sin cambios desde la verificación inicial. `apps/web/scripts/migrate-private-to-r2.mjs` demostrado idempotente y no destructivo en local, con `file_key` inalterado. |
| 3 | Otra empresa recibe 403 y una petición sin sesión recibe 401. | ✓ VERIFIED | **Cerrado en esta re-verificación.** Código de `5e2352d` inspeccionado línea por línea: `UnauthenticatedError` (`auth.ts:202-213`) e `instanceof` en las ocho rutas. Confirmado en vivo: sin sesión → 401 en las ocho rutas; empresa dueña y revisores de tenant → 200; ninguna comparación muerta de `"Unauthorized"` sobrevive en `apps/web`. El caso "otra empresa → 403" no se repitió en vivo por falta de una segunda empresa en los datos de seed, pero la rama de código que lo produce no fue tocada por el fix (confirmado por diff) y ya había sido demostrada en la verificación inicial. |
| 4 | Quitando la variable del bucket y reiniciando, la aplicación vuelve a leer del disco local. | ✓ VERIFIED | Sin cambios desde la verificación inicial. `STORAGE_BACKEND` conmutable, matriz completa demostrada en local; rollback documentado en producción pero no ejercitado por no haber hecho falta. |

**Score:** 4/4 truths verified

### Required Artifacts

Sin cambios respecto a la verificación inicial — el fix `5e2352d` no toca ninguno de los
artefactos de la fase (R2, storage, migración, env, docs de deploy). Se listan de nuevo
por completitud:

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `apps/web/lib/r2.ts` | Cliente R2 genérico: `r2Put`, `r2Get`, `r2Head`, `assertR2Env`, `isR2Configured`, `missingR2Env`; `aws4fetch`; ≥100 líneas | ✓ VERIFIED | Sin cambios; 181 líneas, seis funciones exactas. |
| `apps/web/lib/env.ts` | Avisos de arranque sobre el almacenamiento confidencial (warnings, nunca throw) | ✓ VERIFIED | Sin cambios; `R2_BUCKET`, aviso antes del `safeParse`. |
| `apps/web/package.json` | Dependencia `aws4fetch` | ✓ VERIFIED | Sin cambios. |
| `.env.example` / `.env.production.example` / `docker-compose.prod.yml` | Las cuatro variables R2 documentadas | ✓ VERIFIED | Sin cambios. |
| `apps/web/lib/document-storage.ts` | `storePrivateFile`/`readPrivateFile` con backend conmutable y prefijo del bucket compartido; ≥150 líneas | ✓ VERIFIED | Sin cambios; 253 líneas. |
| `apps/web/scripts/migrate-private-to-r2.mjs` | Migración idempotente del disco al bucket bajo `prol/`; ≥60 líneas | ✓ VERIFIED | Sin cambios; 185 líneas. |
| `DEPLOY.md` | Sección 7c: variables R2 por SSH, migración y rollback | ✓ VERIFIED | Sin cambios. |
| `apps/web/lib/auth.ts` | (nuevo, del cierre) `UnauthenticatedError` exportada y usada por `requireUser()` | ✓ VERIFIED | Líneas 202-213; clase mínima, un solo constructor, mensaje inalterado. |
| 8 rutas (`/files/*/[id]`, `assignments/[lessonId]`, 4× `/api/upload/*`) | (nuevo, del cierre) `instanceof UnauthenticatedError` en vez de comparación de string | ✓ VERIFIED | Las ocho leídas íntegras; todas importan y usan la clase; ninguna retiene la comparación vieja. |

### Key Link Verification

Sin cambios respecto a la verificación inicial para los links de R2/storage/migración.
Nuevo link verificado en esta re-verificación:

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `apps/web/lib/env.ts` | `apps/web/lib/r2.ts` | `import { missingR2Env } from "@/lib/r2"` | ✓ WIRED | Sin cambios. |
| `apps/web/lib/r2.ts` | `aws4fetch` | `new AwsClient({ service: "s3", region: "auto" })` | ✓ WIRED | Sin cambios. |
| `apps/web/lib/document-storage.ts` | `apps/web/lib/r2.ts` | `import { isR2Configured, missingR2Env, r2Get, r2Put } from "@/lib/r2"` | ✓ WIRED | Sin cambios. |
| `storePrivateFile` (rama r2) | objeto en el bucket bajo `prol/` | `r2Put(...)` | ✓ WIRED | Sin cambios. |
| `readPrivateFile` (rama r2) | objeto en el bucket bajo `prol/` | `r2Get(...)` | ✓ WIRED | Sin cambios. |
| `apps/web/scripts/migrate-private-to-r2.mjs` | objetos bajo `prol/` en el bucket | PUT firmado tras HEAD idempotente | ✓ WIRED | Sin cambios. |
| `DEPLOY.md §7c` | `/etc/containers/env/prol-web-1.env` | receta por SSH | ✓ WIRED | Sin cambios. |
| **(nuevo)** ocho rutas | `apps/web/lib/auth.ts` | `import { requireUser, UnauthenticatedError } from "@/lib/auth"` seguido de `err instanceof UnauthenticatedError` en el `catch` | ✓ WIRED | Confirmado por lectura íntegra de las ocho rutas y por prueba en vivo: 401 real en las ocho sin sesión. |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|
| R2-01 | 02-01, 02-02, 02-04 | Evidencias y plantillas confidenciales viven en R2, sin cambiar el esquema ni el cliente. | ✓ SATISFIED | Sin cambios respecto a la verificación inicial. |
| R2-02 | 02-03 | Los archivos anteriores a la migración siguen descargándose sin tocar la base. | ✓ SATISFIED | Sin cambios respecto a la verificación inicial. |
| R2-03 | 02-02 (código); cierre en `5e2352d`, fuera de los cuatro planes | `/files/*` sigue autorizando contra la base: 403 desde otra empresa, 401 sin sesión. | ✓ SATISFIED | **Actualizado.** Las dos mitades del criterio se sostienen ahora en su lectura literal: 403 para otra empresa (código no tocado por el fix, demostrado en la verificación inicial) y 401 sin sesión (demostrado en vivo en esta re-verificación, en las ocho rutas). `REQUIREMENTS.md` ya lo refleja como "Complete" sin salvedad tras el commit `4bc0ed9`. |
| R2-04 | 02-01, 02-03, 02-04 | Quitar una variable de entorno devuelve la app al disco local, sin desplegar código. | ✓ SATISFIED | Sin cambios respecto a la verificación inicial. |

No hay requisitos huérfanos: los cuatro IDs que `REQUIREMENTS.md` mapea a "Phase 2" (R2-01
a R2-04) aparecen declarados en el frontmatter de al menos un plan, y los cuatro planes
cubren exactamente esos IDs sin dejar ninguno sin plan. El fix `5e2352d` que cierra R2-03
fue una decisión explícita del usuario, ejecutada fuera del alcance de los cuatro planes
de la fase — no generó un quinto plan ni un nuevo requisito.

### Anti-Patterns Found

Ninguno. Además de lo ya inspeccionado en la verificación inicial (`r2.ts`,
`document-storage.ts`, `env.ts`, script de migración), se inspeccionaron en esta
re-verificación `apps/web/lib/auth.ts` y las ocho rutas modificadas por `5e2352d`
buscando `TODO`/`FIXME`/`PLACEHOLDER`, comparaciones de string residuales y handlers
vacíos. No se encontró ninguno; la clase `UnauthenticatedError` es mínima y su único
efecto es dar identidad al error, no cambiar el mensaje visible.

### Human Verification Required

Ninguno pendiente. La confirmación humana de producción (panel carga, PDF descarga,
módulo documental sigue apagado) ya se obtuvo durante la ejecución del plan 02-04. El
cierre del criterio 3 se verificó por completo de forma automática/programática (código
+ ejecución en vivo contra Postgres real en desarrollo), sin necesidad de juicio humano
adicional.

### Gaps Summary

**No quedan gaps abiertos.** El único hueco de la verificación inicial — la mitad "401
sin sesión" del criterio 3 — se cerró con el commit `5e2352d`, verificado de forma
independiente en esta re-verificación tanto por lectura de código como por ejecución en
vivo contra las ocho rutas. No se encontraron regresiones en los caminos 403 (otra
empresa) ni 200 (empresa dueña, revisor de tenant, super admin), ni por análisis
estructural del diff (esas ramas usan `return` directo, ajeno al `catch` que tocó el
fix) ni por prueba en vivo de los casos disponibles en los datos de seed.

Dos notas que no son gaps de esta fase pero conviene que el lector no pierda de vista:

1. **El fix aún no está en producción.** Producción sigue en `55c020d`; `5e2352d` se
   despliega con el próximo deploy. Hasta entonces, una petición sin sesión a
   `/files/*` en producción sigue devolviendo 403, no 401.
2. **`documents_enabled = false`** en los tres tenants — decisión de producto explícita,
   ya declarada como tal en el plan 02-04 — así que el camino de escritura a R2 sigue sin
   ejercitarse a través de la interfaz de producción; sólo se ha probado en desarrollo
   local contra el bucket real.

---

*Verified: 2026-09-02T04:23:28Z*
*Verifier: Claude (gsd-verifier)*
