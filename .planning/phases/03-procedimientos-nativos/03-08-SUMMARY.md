---
phase: 03-procedimientos-nativos
plan: 08
subsystem: infra
tags: [podman, prisma, postgresql, deploy, r2, auth, rollback]

# Dependency graph
requires:
  - phase: 03-07
    provides: "Código y esquema completos de la fase 3, demostrados en local y en pantalla (identidad, historial, aviso de versión, editor, importador .docx)"
provides:
  - "Producción (panel-prosuite-2) corriendo la imagen 04135ca: dos enums nuevos y 14 columnas del documento nativo aplicados a la base real, verificados directamente contra producción por este agente"
  - "El arreglo del 401 (5e2352d) confirmado EN VIVO en producción — GET /files/evidence/<inexistente> sin sesión responde 401, ya no 403 — cerrando en producción el hallazgo que la fase 2 dejó abierto sobre R2-03"
  - "DEPLOY.md §7d con el estado real del despliegue, incluida la corrección del registro heredado sobre documents_enabled"
  - "Registro corregido en STATE.md: documents_enabled es true en ibiza-online desde antes de esta fase, no false en los tres tenants como decía el cierre de la fase 2"
affects: ["04-puente-html-pdf (misma base de datos, mismas tablas company_documents/manual_documents)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verificación de producción por lectura directa (SSH read-only) en vez de confiar en el resumen de una sesión anterior: enums, columnas, conteos y el propio 401 se releyeron contra la base y el endpoint reales antes de escribir DEPLOY.md, no se copiaron de segunda mano."

key-files:
  created: []
  modified:
    - DEPLOY.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Usuario aprobó el despliegue con la opción 'desplegar-ahora' explícitamente ('Desplegar igual, fijando el SHA'), tras revisar alcance/riesgo/rollback/verificación — no se difirió ni se aplicó solo el esquema."
  - "documents_enabled queda TAL COMO ESTÁ: true en ibiza-online, false en academia-digital y mecanica-g3. El usuario decidió explícitamente no tocarlo — IBIZA es su propia consultoría y no tiene manuales — así que no se revierte ni se documenta como pendiente de corregir, sólo se corrige el REGISTRO que decía otra cosa."
  - "La confirmación humana visual sobre producción (tarea 3 del plan) NO se dio por aprobada sin haber ocurrido. Se documenta explícitamente como pendiente, con lo automatizado ya confirmado y el rollback listo, en vez de repetir el error de 03-06 donde un checkpoint se registró como aprobado sin haberse ejercido."

requirements-completed: [DOC-01, DOC-02, OPS-05]

# Metrics
duration: "Tareas 1-2: sesión previa (aprobación humana no cronometrable + despliegue). Esta continuación (tareas 3-4): ~25min — verificación read-only independiente contra producción, redacción de DEPLOY.md §7d, SUMMARY y corrección de STATE.md/ROADMAP.md/REQUIREMENTS.md."
completed: 2026-09-02
---

# Phase 3 Plan 8: Despliegue a producción — documentos nativos con el 401 arrastrado Summary

**Producción corre la imagen `04135ca` con el esquema del documento nativo aplicado (2 enums, 14 columnas) y el arreglo del 401 confirmado en vivo; el módulo documental sigue sin aparecer en dos de los tres tenants, pero el registro que decía "apagado en los tres" estaba mal desde el cierre de la fase 2 — IBIZA lo tiene encendido desde antes, sin que nadie de esta fase lo tocara. La confirmación visual humana sobre producción queda pendiente y así se declara.**

## Performance

- **Duration:** Tareas 1-2 se ejecutaron en una sesión anterior (aprobación humana del checkpoint + build/backup/schema/deploy contra el VPS). Esta continuación cubrió las tareas 3 (registro preciso del checkpoint, sin inventar una aprobación que no ocurrió) y 4 (documentación), con ~25 min de trabajo: verificación read-only independiente contra producción (enums, columnas, conteos, 401, logs de arranque) y redacción de `DEPLOY.md` §7d, este SUMMARY, y las correcciones a `STATE.md`/`ROADMAP.md`/`REQUIREMENTS.md`.
- **Completed:** 2026-09-02
- **Tasks:** 4/4 (tarea 1 checkpoint:decision resuelto, tarea 2 auto ejecutada, tarea 3 checkpoint:human-verify con confirmación **parcial** — ver abajo —, tarea 4 auto ejecutada)
- **Files modified:** 1 en el commit de tarea 4 (`DEPLOY.md`); 3 más en el commit de metadatos del plan (`STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`)

## Accomplishments

- El código y el esquema de la fase 3 están en producción: imagen `04135ca`, con `55c020d` y `64f7476` todavía tagueadas para rollback de dos niveles.
- El cambio de esquema se aplicó con `db push` **antes** de mover `latest`, sin `--accept-data-loss`: 2 `CREATE TYPE` (`ManualDocumentKind`, `CompanyDocumentStatus`) y 14 columnas (3 en `manual_documents`, 10 en `company_documents` más la relajación a nullable de 4 columnas de archivo). Releído directamente de la base real de producción por este agente — no asumido del preview.
- El backfill del invariante de "una sola VIGENTE por (documento, empresa)" se comprobó como **no-op genuino**: `company_documents` tenía 0 filas antes del `db push` y sigue en 0 después. Cero pares con más de una fila `VIGENTE`.
- El arreglo del 401 (`5e2352d`), pendiente desde la fase 2, viajó dentro de esta imagen **y se confirmó en vivo**: `GET https://prol.prosuite.pro/files/evidence/<inexistente>` sin sesión responde `401` (antes de este despliegue respondía `403`). Esto cierra en producción, no sólo en local, el hallazgo que la verificación de R2-03 en la fase 2 había dejado abierto.
- El servicio está activo, `/api/health` y `/sign-in` responden `200`, y el log de arranque (`journalctl`, reinicio de las 21:59 UTC) no muestra ningún error de columna desconocida ni "Configuración de R2 incompleta".
- Se corrigió un registro equivocado heredado del cierre de la fase 2: `documents_enabled` **no** es `false` en los tres tenants. Es `false` en `academia-digital` y `mecanica-g3`, y **`true` en `ibiza-online`** desde antes de esta fase — nadie en la fase 3 encendió esa bandera. El usuario decidió dejarlo así (IBIZA es su propia consultoría, sin manuales creados). Con `company_documents` en 0 filas en los tres tenants, hoy no hay ningún manual expuesto, pero la afirmación "el módulo se quedó apagado, nadie puede ejercitarlo" ya no es literalmente cierta para IBIZA: un administrador de esa consultoría podría abrir "Manuales" en producción y, si construyera uno, ejercitar de verdad el editor de la fase 3.
- `DEPLOY.md` §7d queda escrita con el estado real, la corrección del registro anterior, y los dos comandos de rollback listos para copiar y pegar.

## Task Commits

1. **Tarea 1: aprobación del despliegue (checkpoint:decision)** — sin commit propio; resuelta por el usuario con "Desplegar igual, fijando el SHA" (equivalente a la opción `desplegar-ahora`).
2. **Tarea 2: construir, respaldar, aplicar el esquema y desplegar** — sin commit en el repositorio (la tarea no toca archivos versionados; opera contra el VPS). Ver evidencia verificada abajo.
3. **Tarea 3: confirmación humana de que producción sigue sana (checkpoint:human-verify)** — sin commit propio. **Ver sección dedicada abajo: la confirmación es parcial, no se completó.**
4. **Tarea 4: dejar DEPLOY.md contando la verdad** - `ce3339a` (docs)

**Plan metadata:** (commit de cierre pendiente, incluye este SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Tarea 3 — estado exacto del checkpoint humano (léase con cuidado)

Este plan tiene un antecedente en el mismo phase: en el plan 03-06, un checkpoint se registró como aprobado cuando en realidad no se había ejercitado, y la discrepancia sólo se descubrió después. Para no repetirlo, aquí se documenta con precisión qué se confirmó y qué no.

**Confirmado de forma automatizada e independiente por este agente** (releído directamente contra producción, no copiado de un resumen anterior):
- `systemctl is-active prol-web-1.service` → `active`.
- `GET /api/health` → `200`. `GET /sign-in` → `200`.
- Imágenes tagueadas: `04135ca` (activa/`latest`), y `55c020d` + `64f7476` disponibles para rollback.
- Los dos enums (`ManualDocumentKind`: FILE/PROCEDIMIENTO/REGISTRO; `CompanyDocumentStatus`: BORRADOR/VIGENTE/OBSOLETO) y las 14 columnas correspondientes, con la nulabilidad correcta.
- El backfill: `company_documents` en 0 filas antes y después; 0 pares con más de una fila `VIGENTE`.
- El invariante se sostiene, el repositorio local no cambió durante el despliegue, y el log de arranque (últimos 20 minutos, reinicio de las 21:59 UTC) no muestra errores.

**Adicionalmente verificado y digno de constar**: el arreglo del 401 (`5e2352d`) está VIVO en producción — `GET https://prol.prosuite.pro/files/evidence/<inexistente>` sin sesión devuelve **401**, donde antes de este despliegue devolvía 403. Esto cierra en producción, no sólo en local, la brecha que la verificación de R2-03 en la fase 2 había dejado abierta (ver actualización en `REQUIREMENTS.md` abajo).

**NO obtenido — y no se declara obtenido**: la confirmación visual del propio usuario sobre el panel de producción (iniciar sesión, ver que todo se ve normal, descargar un certificado o un PDF de resultados). El paso 2 de `<how-to-verify>` de la tarea 3 no se ejecutó. Se dice llanamente: **las comprobaciones automatizadas pasaron; la confirmación visual humana sigue pendiente**, con el rollback de un comando (`podman tag localhost/prol-web:55c020d localhost/prol-web:latest && systemctl restart prol-web-1.service`) disponible en cualquier momento.

## El hallazgo de IBIZA (documents_enabled)

Un agente anterior en esta continuación, y este mismo agente de forma independiente, confirmaron por lectura directa de la base de producción:

```
academia-digital  f
ibiza-online      t   <-- ya estaba en true ANTES de este despliegue
mecanica-g3       f
```

Nadie en la fase 3 tocó esa bandera. El registro de `STATE.md` (escrito al cerrar la fase 2, y repetido sin cuestionar en el plan 02-04 y en el contexto de este mismo plan 03-08) decía "documents_enabled = false en los tres tenants" — es y era falso para IBIZA desde antes de que empezara esta fase. Las tres empresas tienen **0 manuales** (`company_documents` en 0 filas), así que no hay contenido expuesto hoy.

**Decisión del usuario: dejarlo tal como está.** IBIZA es su propia consultoría y no tiene manuales; no hay ninguna razón de negocio para apagarlo, y hacerlo sería una acción no solicitada sobre el flag de un tenant real. No se tocó `documents_enabled` en ningún tenant como parte de este plan.

**Consecuencia que hay que decir en voz alta**: ya no es estrictamente cierto que "nadie puede llegar al módulo en producción". Un administrador de tenant de IBIZA puede abrir "Manuales" ahora mismo y, si construyera uno, ejercitaría de verdad el editor de la fase 3 — el importador de `.docx`, el editor de cuerpo, la emisión por empresa. Con 0 manuales hoy nada está expuesto, pero el criterio 7 de la fase 3 ("el módulo apagado, el documento nativo sin ejercitar en producción") necesita ese matiz para IBIZA específicamente. Para Academia Digital MX y Mecanica G3 el módulo sigue exactamente igual de apagado que antes.

Corregido en `STATE.md` (sección "Estado de producción") y en `DEPLOY.md` §7d.

## Files Created/Modified

- `DEPLOY.md` — nueva sección §7d con el estado real del despliegue de documentos nativos, la corrección del registro sobre `documents_enabled`, y los dos rollbacks listos para copiar y pegar. Commit `ce3339a`.
- `.planning/STATE.md` — corrección del estado de producción (flags reales por tenant, imagen desplegada, 401 confirmado), nueva decisión de fase 3, nota sobre la sesión concurrente `prol-1d` con trabajo de DC-3 sin commitear en este mismo working tree.
- `.planning/ROADMAP.md` — checkbox de `03-08-PLAN.md` marcado a mano (`roadmap update-plan-progress` es un no-op contra este formato), tabla de progreso de la fase 3 actualizada a 8/8, fase 3 marcada completa con la fecha y una nota de cierre.
- `.planning/REQUIREMENTS.md` — fila de `R2-03` ampliada para registrar que el "401 sin sesión" queda confirmado también en producción, no sólo en local.

## Decisions Made

- Ver `key-decisions` en el frontmatter. En resumen: desplegar ahora (no diferir), dejar `documents_enabled` tal cual está (no apagar IBIZA), y no declarar aprobada una verificación humana que no ocurrió.

## Deviations from Plan

### Auto-fixed / ampliaciones dentro de las reglas 1-3

**1. [Rule 3 - Blocking / correctness] Verificación de producción re-ejecutada de forma independiente en vez de confiar en el traspaso de la sesión anterior**
- **Encontrado durante:** el arranque de esta continuación.
- **Motivo:** el objetivo pide precisión sobre lo que se confirmó y lo que no (con el antecedente explícito del plan 03-06, donde un checkpoint se dio por aprobado sin haberlo sido). En vez de redactar `DEPLOY.md` y el SUMMARY a partir del resumen de la conversación anterior, este agente ejecutó de nuevo, por SSH de sólo lectura, las mismas comprobaciones (estado del servicio, `/api/health`, `/sign-in`, enums, columnas, conteos, tags de imagen, existencia del dump, logs de arranque) y el propio `GET /files/evidence/<inexistente>` para el 401.
- **Resultado:** todos los datos de este SUMMARY y de `DEPLOY.md` §7d están respaldados por comandos ejecutados por este agente, no copiados de segunda mano. No se hizo ningún cambio en el VPS: sólo lectura.
- **Archivos:** ninguno (verificación, no cambio de código).
- **Commit:** N/A (no genera cambios de repositorio).

---

**Total deviations:** 1 (verificación reforzada, sin cambios de alcance)
**Impact on plan:** Ninguno sobre el alcance del plan; mayor confianza en la veracidad de lo documentado.

## Issues Encountered

- Ninguno bloqueante. La única "brecha" es la que se documenta explícitamente: la confirmación visual humana de la tarea 3 no se completó y no se simula como completada.

## User Setup Required

None — no se aplicó ninguna variable de entorno nueva ni configuración externa en este plan.

## Next Phase Readiness

- **Cierre del milestone hasta la fase 3**: los 8 planes de la fase 3 están ejecutados. Los siete criterios de éxito de la fase están satisfechos salvo el matiz de IBIZA sobre el criterio 7 (documentado arriba) y la confirmación visual humana pendiente de la tarea 3 de este plan (no bloqueante para producción — el rollback está listo si algo apareciera mal).
- **Pendiente real, no bloqueante**: que el usuario haga su propio pase visual sobre `https://prol.prosuite.pro` (login, panel, descarga de un certificado o PDF) cuando tenga oportunidad. No se ha perdido nada por no haberlo hecho todavía — todas las comprobaciones automatizables ya pasaron y el rollback de un comando sigue disponible.
- **Para la fase 4 (Puente HTML→PDF)**: la base de producción ya tiene el esquema del documento nativo (2 enums, 14 columnas) aplicado y sano. La fase 4 va a volver a tocar `company_documents`/`manual_documents`; el backfill del invariante documentado en `DEPLOY.md` §7d es idempotente y hay que repetirlo si esa fase introduce un `db push` nuevo sobre `company_documents.status`.
- **Segunda sesión concurrente**: al cierre de este plan, otra sesión interactiva (`prol-1d`) tiene ~18 archivos sin commitear en este mismo working tree relacionados con DC-3 (incluido `packages/db/prisma/schema.prisma`). Este plan no los tocó ni los commiteó — ver `git status` antes de cualquier operación destructiva sobre el árbol de trabajo.

---
*Phase: 03-procedimientos-nativos*
*Completed: 2026-09-02*
