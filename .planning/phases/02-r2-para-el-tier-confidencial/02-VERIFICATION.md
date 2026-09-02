---
phase: 02-r2-para-el-tier-confidencial
verified: 2026-09-02T03:38:59Z
status: gaps_found
score: 3/4 truths fully verified, 1 partial (see gaps)
gaps:
  - truth: "Una petición sin sesión a /files/* (y a las siete rutas hermanas) recibe 401"
    status: partial
    reason: >
      Verificado directamente en el código: `requireUser()` (apps/web/lib/auth.ts:194)
      lanza `new Error("Sesión expirada. Inicia sesión de nuevo.")` desde el commit
      `d991c31` (6 de mayo de 2026, "Hardening producción — bloque 4"), muy anterior
      a toda la fase 2. Las ocho rutas que traducen la falta de sesión a un código
      HTTP siguen comparando `message === "Unauthorized"` — una cadena que ya no
      lanza nadie — así que esa rama es código muerto y todas caen al `else`/catch
      genérico, que devuelve 403 con el cuerpo "Sesión expirada. Inicia sesión de
      nuevo." en vez de 401 con "No autenticado". Confirmado en vivo en
      `apps/web/app/files/evidence/[id]/route.ts` líneas 61-64: si `message !==
      "Unauthorized"` (siempre cierto ahora), retorna `new NextResponse(message, {
      status: 403 })`. Es el mismo hallazgo que el propio plan 02-02 documentó en
      `deferred-items.md` y en su SUMMARY, con la misma causa raíz y el mismo
      alcance de 8 rutas. No es una regresión de la fase 2: el bug ya existía antes
      de que el plan 02-01 tocara un archivo, y las tres rutas `/files/*/[id]` que
      lo padecen estaban explícitamente prohibidas de editar en el CONTEXT y en el
      propio plan 02-02. La otra mitad del criterio — 403 para otra empresa, 200
      para la empresa dueña y para el revisor del tenant — sí se sostiene, sin
      cambios de comportamiento respecto a antes del cambio de backend.
    artifacts:
      - path: "apps/web/lib/auth.ts"
        issue: "requireUser() (línea 194) lanza 'Sesión expirada. Inicia sesión de nuevo.', no 'Unauthorized'"
      - path: "apps/web/app/files/evidence/[id]/route.ts"
        issue: "catch compara message === 'Unauthorized' (línea 61); rama muerta, cae a 403 genérico"
      - path: "apps/web/app/files/company-document/[id]/route.ts"
        issue: "mismo patrón (línea 50)"
      - path: "apps/web/app/files/manual-document/[id]/route.ts"
        issue: "mismo patrón (línea 63)"
      - path: "apps/web/app/api/assignments/[lessonId]/route.ts"
        issue: "mismo patrón (línea 47)"
      - path: "apps/web/app/api/upload/evidence/route.ts"
        issue: "mismo patrón (línea 30)"
      - path: "apps/web/app/api/upload/document-template/route.ts"
        issue: "mismo patrón (línea 30)"
      - path: "apps/web/app/api/upload/pdf/route.ts"
        issue: "mismo patrón (línea 73)"
      - path: "apps/web/app/api/upload/assignment/route.ts"
        issue: "mismo patrón (línea 94)"
    missing:
      - "Alinear las ocho comparaciones de string con lo que realmente lanza requireUser(), o —mejor— sustituir la comparación de mensajes frágil por un error tipado (p. ej. una clase AuthError con un campo `code: 'NO_SESSION' | 'FORBIDDEN'`) que las ocho rutas puedan distinguir sin depender del texto exacto."
      - "Decidir el mensaje visible al usuario para 'no autenticado': hoy, incluso sin haber tenido sesión nunca, el cuerpo dice 'Sesión expirada. Inicia sesión de nuevo.', que es confuso para quien nunca inició sesión."
      - "Costo de remediación: pequeño y bien acotado en líneas de código (8 comparaciones + 1 mensaje de origen), pero transversal — toca un helper de autenticación compartido por toda la aplicación y 8 rutas de varios módulos (evidencias, plantillas, PDFs, asignaciones, lecciones). No es responsabilidad de esta fase por diseño (el plan 02-02 tenía prohibido tocar esos archivos), pero alguien tiene que priorizarlo como su propio plan pequeño."
human_verification: []
---

# Phase 2: R2 para el tier confidencial Verification Report

**Phase Goal:** Las evidencias y plantillas confidenciales se guardan y leen desde
Cloudflare R2, sin que cambie el esquema, el cliente ni la autorización.
**Verified:** 2026-09-02T03:38:59Z
**Status:** gaps_found
**Re-verification:** No — verificación inicial

## Goal Achievement

### Observable Truths

| # | Truth (Success Criteria de ROADMAP.md) | Status | Evidence |
|---|---|---|---|
| 1 | Una evidencia nueva aparece como objeto en el bucket y se descarga por `/files/*`. | ✓ VERIFIED | `apps/web/lib/document-storage.ts` tiene la rama `STORAGE_BACKEND === "r2"` con `r2Put(sharedBucketKey(fileKey), ...)`; `apps/web/lib/r2.ts` firma con `aws4fetch` contra `ibizadata`. El plan 02-02 documentó dos evidencias reales subidas y descargadas (`prol/evidence/1963415c-...pdf`, `prol/evidence/eae03650-...png`), con `sha256` idéntico al original y confirmación por HEAD de que la clave sin prefijo no existe. Código inspeccionado línea por línea coincide exactamente con lo declarado. |
| 2 | Una evidencia anterior a la migración se descarga igual, sin haber tocado la base de datos. | ✓ VERIFIED | `apps/web/scripts/migrate-private-to-r2.mjs` existe, commiteado (`62c2e62`), no importa Prisma, no borra, sólo escribe bajo `prol/`. El plan 02-03 demostró en local: dos evidencias fabricadas con backend disco, descargadas antes de migrar, migradas (`copiados=3, saltados=0, fallidos=0`), disco apartado (`mv ... .bak`), y las mismas URLs siguen devolviendo 200 con `sha256` idéntico — los bytes sólo pudieron venir del bucket. La consulta de `file_key` fue idéntica carácter a carácter antes y después. Segunda pasada de la migración: `copiados=0, saltados=3` (idempotencia). |
| 3 | Otra empresa recibe 403 y una petición sin sesión recibe 401. | ⚠ PARTIAL | **Otra empresa → 403: VERIFIED.** Código de autorización en las tres rutas `/files/*/[id]/route.ts` no fue tocado por ningún plan de la fase (verificado por `git show --stat` de los tres commits de código); el plan 02-02 demostró 403 para un usuario ajeno, 200 para la empresa dueña y 200 para el revisor del tenant, sobre una evidencia servida desde R2. **Sin sesión → 401: FAILED como está escrito.** Ver "Gaps Summary" abajo — la petición sin sesión recibe hoy 403, no 401, por un bug pre-existente (commit `d991c31`, 6 de mayo, anterior a toda la fase) ajeno al cambio de backend. |
| 4 | Quitando la variable del bucket y reiniciando, la aplicación vuelve a leer del disco local. | ✓ VERIFIED | `document-storage.ts:47`: `const STORAGE_BACKEND = isR2Configured() ? "r2" : "disk"`, decidido una vez al importar el módulo a partir de las cuatro variables `R2_*`. El plan 02-03 demostró la matriz completa: sin `R2_BUCKET` y disco presente → 200 desde disco; sin `R2_BUCKET` y disco apartado → 404; con R2 y disco apartado → 200 desde el bucket (ida y vuelta completa, sin desplegar código). En producción (plan 02-04) el rollback quedó documentado y disponible (`sed -i '/^R2_BUCKET=/d' ...`), pero no se ha ejecutado contra el host real — no hizo falta porque el despliegue quedó sano a la primera. |

**Score:** 3/4 truths fully verified, 1 partial

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `apps/web/lib/r2.ts` | Cliente R2 genérico: `r2Put`, `r2Get`, `r2Head`, `assertR2Env`, `isR2Configured`, `missingR2Env`; `aws4fetch`; ≥100 líneas | ✓ VERIFIED | 181 líneas. Exporta exactamente las seis funciones esperadas. `service: "s3"` y `region: "auto"` explícitos (líneas 62-63). Sin borrado, sin listado, sin mención a `prol/`. |
| `apps/web/lib/env.ts` | Avisos de arranque sobre el almacenamiento confidencial (warnings, nunca throw) | ✓ VERIFIED | Contiene `R2_BUCKET` (línea 51) y el bloque de aviso (líneas 51-75), insertado antes del `safeParse` como exigía el plan. Un solo `throw` en todo el archivo (línea 86, el de variables críticas). |
| `apps/web/package.json` | Dependencia `aws4fetch` | ✓ VERIFIED | `"aws4fetch": "^1.0.20"` en `dependencies`; `pnpm-lock.yaml` confirma cero paquetes transitivos (sólo `aws4fetch@1.0.20: {}` en snapshots). |
| `.env.example` / `.env.production.example` / `docker-compose.prod.yml` | Las cuatro variables R2 documentadas | ✓ VERIFIED | Las cuatro (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) presentes y vacías/con default vacío en los tres archivos. Ningún valor real en el diff. |
| `apps/web/lib/document-storage.ts` | `storePrivateFile`/`readPrivateFile` con backend conmutable y prefijo del bucket compartido; ≥150 líneas | ✓ VERIFIED | 253 líneas. `STORAGE_BACKEND`, `R2_PARTIAL_ENV`, `R2_KEY_PREFIX`, `sharedBucketKey()` presentes exactamente como en el plan. `"prol/"` sólo aparece aquí y en el script de migración (duplicación deliberada y documentada). Firmas de las tres funciones públicas sin cambios. |
| `apps/web/scripts/migrate-private-to-r2.mjs` | Migración idempotente del disco al bucket bajo `prol/`; ≥60 líneas | ✓ VERIFIED | 185 líneas. Sin `delete`, sin `prisma`, sin `@prol/db`. HEAD previo para idempotencia + HEAD posterior para verificar tamaño. Commiteado (`62c2e62`). |
| `DEPLOY.md` | Sección 7c: variables R2 por SSH, migración y rollback | ✓ VERIFIED | Sección 7c presente con estado `APLICADO en panel-prosuite-2 el 2026-09-01`, imagen `55c020d`, receta de SSH, rollback de una variable, migración local/host, y una nota operativa sobre una trampa real encontrada con `grep`/`rtk` durante el despliegue. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `apps/web/lib/env.ts` | `apps/web/lib/r2.ts` | `import { missingR2Env } from "@/lib/r2"` | ✓ WIRED | Línea 11, usado en línea 52. |
| `apps/web/lib/r2.ts` | `aws4fetch` | `new AwsClient({ service: "s3", region: "auto" })` | ✓ WIRED | Línea 56-69, con `retries: 3` y `initRetryMs: 50` añadidos según el plan. |
| `apps/web/lib/document-storage.ts` | `apps/web/lib/r2.ts` | `import { isR2Configured, missingR2Env, r2Get, r2Put } from "@/lib/r2"` | ✓ WIRED | Línea 21, las cuatro funciones se usan (`isR2Configured` en línea 47, `missingR2Env` en línea 65, `r2Put`/`r2Get` en las ramas r2). `r2Head` no se importa, tal como especificaba el plan (sin consumidor hasta fase 6). |
| `storePrivateFile` (rama r2) | objeto en el bucket bajo `prol/` | `r2Put(sharedBucketKey(fileKey), bytes, file.type)` | ✓ WIRED | Línea 167, fuera del try sólo la construcción de `key` (línea 165), el `try/catch` envuelve sólo la llamada de red, como exigía el plan. |
| `readPrivateFile` (rama r2) | objeto en el bucket bajo `prol/` | `r2Get(sharedBucketKey(fileKey))` | ✓ WIRED | Línea 212, dentro de un `try/catch` que preserva el contrato "nunca lanza". |
| `storePrivateFile` (config. parcial) | rechazo explícito, sin degradar a disco | `missingR2Env()` evaluado al cargar el módulo | ✓ WIRED | `R2_PARTIAL_ENV` (línea 65) evaluado una vez al importar; comprobado en `storePrivateFile` (línea 142) antes de cualquier escritura, devuelve 503. |
| `apps/web/scripts/migrate-private-to-r2.mjs` | objetos bajo `prol/` en el bucket | PUT firmado tras HEAD idempotente | ✓ WIRED | Confirmado por inspección directa del script y por la salida literal registrada en el SUMMARY del plan 02-03 (copia real, segunda pasada idempotente). |
| `DEPLOY.md §7c` | `/etc/containers/env/prol-web-1.env` | receta por SSH | ✓ WIRED | Presente y ejecutada en producción según el plan 02-04 (variables aplicadas, contenedor reiniciado, verificado con `env | grep -c ^R2_` → 4). |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| R2-01 | 02-01, 02-02, 02-04 | Evidencias y plantillas confidenciales viven en R2, sin cambiar el esquema ni el cliente. | ✓ SATISFIED | `STORAGE_BACKEND` conmutable verificado en código; producción desplegada con las cuatro variables activas (imagen `55c020d`); sin cambios de esquema Prisma en el diff de ningún plan de la fase. Nota honesta ya reconocida: con `documents_enabled = false` en los tres tenants, nadie ha escrito una evidencia real en producción todavía — el camino de escritura está probado contra el bucket real sólo en desarrollo local. |
| R2-02 | 02-03 | Los archivos anteriores a la migración siguen descargándose sin tocar la base. | ✓ SATISFIED | Ver Truth 2 arriba. Demostrado con disco apartado, hash idéntico, y `file_key` sin cambios en la base. |
| R2-03 | 02-02 | `/files/*` sigue autorizando contra la base: 403 desde otra empresa, 401 sin sesión. | ⚠ SATISFIED CON SALVEDAD | La mitad sustantiva (autorización por empresa/tenant) se sostiene sin cambios. La mitad literal (401 sin sesión) no se cumple hoy: devuelve 403 por un bug pre-existente y ajeno a esta fase. `REQUIREMENTS.md` ya lo marca "Complete — con salvedad", que es una caracterización honesta, pero el criterio de ROADMAP.md sigue redactado sin la salvedad. Ver Gaps Summary. |
| R2-04 | 02-01, 02-03, 02-04 | Quitar una variable de entorno devuelve la app al disco local, sin desplegar código. | ✓ SATISFIED | Ver Truth 4 arriba. Verificado en local de punta a punta; en producción el mecanismo está desplegado y el procedimiento de rollback documentado, pero no ejercitado contra el host real (no hizo falta). |

No hay requisitos huérfanos: los cuatro IDs que `REQUIREMENTS.md` mapea a "Phase 2" (R2-01 a R2-04) aparecen declarados en el frontmatter de al menos un plan, y los cuatro planes cubren exactamente esos IDs sin dejar ninguno sin plan.

### Anti-Patterns Found

Ninguno. Se inspeccionaron `apps/web/lib/r2.ts`, `apps/web/lib/document-storage.ts`, `apps/web/lib/env.ts` y `apps/web/scripts/migrate-private-to-r2.mjs` buscando `TODO`/`FIXME`/`PLACEHOLDER`, retornos vacíos sospechosos y handlers que sólo hacen `console.log`. Los únicos `return null` encontrados son parte del contrato documentado y exigido por el propio diseño ("nunca lanza, `null` si no existe"), no implementaciones a medio hacer.

### Human Verification Required

Ninguno pendiente de verificación humana nueva. La confirmación humana de producción (panel carga, PDF descarga, módulo documental sigue apagado) ya se obtuvo durante la ejecución del plan 02-04 y quedó registrada verbatim en su SUMMARY.

### Gaps Summary

**El gap es real, acotado, y no es una sorpresa — pero tampoco desaparece por estar bien documentado.**

El criterio 3 de la fase, tal como está escrito en `ROADMAP.md` ("Otra empresa recibe 403 y una petición sin sesión recibe 401"), describe dos comportamientos independientes. Verifiqué el código directamente (no sólo el SUMMARY) y confirmo exactamente lo que el ejecutor del plan 02-02 encontró y documentó:

- `apps/web/lib/auth.ts:194` — `requireUser()` lanza `"Sesión expirada. Inicia sesión de nuevo."`
- Ocho rutas (las tres `/files/*/[id]/route.ts`, más `assignments/[lessonId]`, y cuatro de `/api/upload/*`) comparan `message === "Unauthorized"` para decidir si devuelven 401. Esa cadena ya no la lanza nada en el repo. La rama está muerta.
- Resultado: una petición sin sesión a cualquiera de las ocho recibe **403** con el cuerpo "Sesión expirada. Inicia sesión de nuevo.", no 401 con "No autenticado".

**Mi lectura de las dos interpretaciones posibles:**

*Lectura literal* — el criterio dice 401, el código produce 403. Bajo esa lectura estricta, el criterio 3 **falla**.

*Lectura por intención* — R2-03 es, en el fondo, un requisito de "no regresión": que cambiar el backend de almacenamiento no rompa la autorización que ya existía. Bajo esa lectura, R2-03 **se cumple**: verifiqué con `git show --stat` que ninguno de los tres commits de código de la fase (`ad66e79`, `2a23106`, `c28b930`, `7557707`, `62c2e62`, `f81f30a`) toca `auth.ts` ni ninguna de las ocho rutas afectadas. El bug existía exactamente igual el 5 de mayo (antes de que existiera esta fase) que hoy. Además, el propio plan 02-02 tenía **prohibido explícitamente** tocar las tres rutas `/files/*/[id]/route.ts` — corregirlo ahí habría violado su propio contrato de alcance.

**Mi fallo:** trato esto como **parcialmente verificado**, no como aprobado sin más ni como bloqueante duro de toda la fase. Razones:
1. El framework de verificación pide comprobar la verdad observable tal como está redactada, no reinterpretarla a conveniencia — así que no puedo marcar "VERIFIED" sin más cuando el código demuestra lo contrario del texto literal.
2. Pero el propósito real de la fase (que el cambio de backend no rompa nada de autorización) sí está demostrado con evidencia de código y de ejecución real, y el hallazgo ya estaba transparentemente registrado en tres sitios (`deferred-items.md`, ambos SUMMARY relevantes, y `REQUIREMENTS.md` con la anotación "Complete — con salvedad") antes de que yo llegara a verificarlo — no es un gap oculto que esta verificación esté "descubriendo", es uno que la fase ya sabía que tenía y decidió no resolver por estar fuera de su radio de acción.

**Costo de remediación** (para quien decida priorizarlo, probablemente como su propio plan pequeño, no como parte de esta fase): pequeño en líneas — ocho comparaciones de string y un mensaje de origen — pero transversal: toca `apps/web/lib/auth.ts`, un helper compartido por prácticamente toda la aplicación autenticada, y ocho rutas de al menos cuatro módulos distintos (evidencias, plantillas, PDFs certificados, asignaciones). La arreglo más robusto no es sólo alinear la cadena comparada, sino sustituir la comparación de mensajes de error por un error tipado — evita que el próximo cambio de redacción del mensaje (como el que causó este bug) vuelva a romper silenciosamente ocho rutas a la vez. También hay una decisión de producto pequeña pendiente: el mensaje "Sesión expirada" no tiene sentido para alguien que nunca inició sesión.

**Todo lo demás de la fase se sostiene con evidencia sólida, verificada a nivel de código, no sólo de SUMMARY:** el cliente R2 firma contra el bucket real, el backend es conmutable con una sola variable de interruptor, el prefijo `prol/` está contenido dentro de una sola frontera, la migración es idempotente y no destructiva, el rollback es real y fue demostrado de punta a punta en local, y producción está desplegada y sana con las cuatro variables activas. La limitación de confianza ya reconocida (`documents_enabled = false` en los tres tenants, así que el camino de escritura nunca se ha ejercitado en producción por la interfaz) no es un gap de esta verificación: es una decisión de producto explícita y fuera del alcance de la fase, ya declarada como tal en el propio plan 02-04.

---

*Verified: 2026-09-02T03:38:59Z*
*Verifier: Claude (gsd-verifier)*
