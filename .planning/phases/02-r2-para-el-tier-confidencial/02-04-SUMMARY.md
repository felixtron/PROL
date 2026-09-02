---
phase: 02-r2-para-el-tier-confidencial
plan: 04
subsystem: infra
tags: [cloudflare-r2, deployment, podman, quadlets, ssh, rollback]

# Dependency graph
requires:
  - phase: 02-r2-para-el-tier-confidencial
    plan: "02-03"
    provides: "apps/web/scripts/migrate-private-to-r2.mjs, DEPLOY.md §7c (estado NO APLICADO) con la receta de variables, rollback de una variable y migración, criterio 2 y criterio 4 demostrados en local"
provides:
  - "Producción corriendo con STORAGE_BACKEND=r2: imagen 55c020d desplegada por la ruta canónica de quadlets (git archive, sin tocar /opt/prol), cuatro variables R2 aplicadas por SSH a /etc/containers/env/prol-web-1.env"
  - "DEPLOY.md §7c con el estado real: APLICADO, fecha, SHA, migración todavía como no-op documentado (volumen vacío), módulo documental apagado"
  - "Alias SSH panel-prosuite-2 y propodvps2 confirmados como el mismo host (195.26.255.71), documentado para no reaveriguarlo"
  - "Trampa operativa documentada en el runbook: grep no es seguro para canalizar credenciales por SSH en esta máquina (el hook rtk reescribe la invocación incluso en mitad de un pipe); usar awk o una variable de shell capturada"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - DEPLOY.md

key-decisions:
  - "El usuario aprobó explícitamente 'desplegar-ahora' tras ver alcance, riesgo, rollback y verificación (checkpoint de la tarea 1), en vez de diferir al final del milestone."
  - "documents_enabled permanece false en los tres tenants — decisión de producto fuera del alcance de esta fase; el camino de escritura en producción queda sin ejercitar por la interfaz hasta que se encienda."
  - "La receta de migración contra el host de producción sigue sin ejecutarse: el volumen prol_prol_private estaba vacío (0 archivos) al desplegar, así que es un no-op real, no uno asumido — se confirmó antes de tocar el env."
  - "Incidente operativo con el hook rtk reescribiendo grep en mitad de un pipe SSH (ver Issues Encountered) resuelto sin que ningún valor de credencial llegara a salida visible ni a git; documentado en DEPLOY.md como trampa permanente del runbook."

requirements-completed: [R2-01, R2-04]

# Metrics
duration: "~1h (tareas 1-3, incluida la pausa de aprobación humana y el incidente operativo) + ~15min (tarea 4, esta sesión)"
completed: 2026-09-01
---

# Phase 2 Plan 4: Despliegue a producción del backend R2 Summary

**Producción corriendo con el backend de almacenamiento confidencial en Cloudflare R2 (imagen `55c020d`, cuatro variables aplicadas por SSH), con `DEPLOY.md` §7c reescrita para decir la verdad: migración todavía sin ejecutar en el host porque el volumen estaba vacío, y módulo documental deliberadamente apagado.**

## Performance

- **Duration:** Tareas 1-3 ejecutadas por un agente previo (incluye una pausa de aprobación humana y un incidente operativo resuelto durante la tarea 2, ver abajo); tarea 4 (esta sesión de continuación) ~15 min.
- **Completed:** 2026-09-01 (hora local; ~2026-09-02T03:xx UTC)
- **Tasks:** 4/4 completadas (2 checkpoints resueltos por el usuario, 2 tareas automáticas)
- **Files modified:** 1 (`DEPLOY.md`)

## Accomplishments

- El usuario aprobó explícitamente el despliegue (checkpoint de la tarea 1: "Desplegar y aplicar R2"), con alcance, riesgo, rollback y verificación presentados por delante — ninguna operación tocó el VPS antes de esa respuesta.
- Producción desplegada por la ruta canónica de quadlets (`git archive` → `/opt/prol-deploy-$SHA`, sin tocar `/opt/prol`): imagen `55c020d` (anterior `64f7476`), que arrastra el código de la fase 2 y el desfase pendiente de la fase 1 (`formSnapshot` tipado, `b697b3b`/`ab975e2`).
- Las cuatro variables R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) quedaron aplicadas en `/etc/containers/env/prol-web-1.env` (600, root) — nunca sus valores, sólo que son cuatro y sus nombres.
- Verificado dentro del contenedor: exactamente 4 variables `R2_*`, cero apariciones de "Configuración de R2 incompleta" en los últimos 300 renglones de `journalctl`, `/api/health` en 200, `/sign-in` en 200.
- Un humano confirmó verbalmente que el panel carga con normalidad y que puede descargarse un PDF (tier público de archivos, no tocado por esta fase), y que el módulo documental sigue sin aparecer.
- `DEPLOY.md` §7c actualizada: estado APLICADO con fecha y SHA, alias SSH documentado (`panel-prosuite-2` y `propodvps2` son el mismo host), y la trampa operativa de `grep`/`rtk` registrada en el runbook para que no se repita.

## Task Commits

1. **Tarea 1: aprobación del despliegue (checkpoint:decision)** — sin commit; resuelta por el usuario ("Desplegar y aplicar R2").
2. **Tarea 2: desplegar la imagen y aplicar las variables por SSH** — sin commit; operación sobre el VPS, sin cambios en el repositorio.
3. **Tarea 3: confirmación humana de que producción sigue sana (checkpoint:human-verify)** — sin commit; el usuario confirmó verbatim: *"Es correcto, puedo entrar al panel. Confirmo que carga todo con normalidad y puedo descargar un PDF, y confirmo que la gestión documental aún no está cargada."*
4. **Tarea 4: dejar DEPLOY.md contando la verdad** — `2161c35` (docs)

**Plan metadata:** (pendiente — commit final de este SUMMARY + STATE + ROADMAP + REQUIREMENTS)

## Files Created/Modified

- `DEPLOY.md` — sección 7c: bloque de estado sustituido de "NO APLICADO" a "APLICADO en `panel-prosuite-2` el 2026-09-01" con SHA, alias SSH confirmado, nota de trampa operativa sobre `grep`/`rtk` junto a la receta de aplicación de variables, y aclaración de que ninguno de los dos niveles de rollback se ejecutó en producción (no hizo falta) aunque ambos están verificados/disponibles.

## Decisions Made

- Ver `key-decisions` en el frontmatter. En resumen: desplegar ahora (no diferir), no encender `documents_enabled`, dejar la migración de producción documentada pero sin ejecutar porque el volumen estaba vacío, y registrar la trampa de `grep`/`rtk` como conocimiento permanente del runbook.

## Deviations from Plan

### Auto-fixed Issues

Ninguna deviation de las Reglas 1-4 sobre código de aplicación: la tarea 4 es sólo documentación y no tocó `apps/web/`. El único evento fuera de guion fue operativo, durante la tarea 2, y se resolvió dentro de la propia tarea sin necesidad de invocar las reglas de deviation (no hay código de aplicación involucrado):

**Incidente operativo (no es una deviation de código): el hook `rtk` reescribió un `grep` en mitad de un pipe SSH**

- **Encontrado durante:** Tarea 2, primer intento de aplicar las cuatro variables al env de producción.
- **Qué pasó:** El primer intento canalizó `grep '^R2_' .env` sobre SSH hacia el archivo de env del contenedor. Un hook local de shell (`rtk`, configurado en las instrucciones globales de Claude del usuario) reescribió esa invocación de `grep` **incluso estando dentro de un pipe**, así que lo que se anexó al archivo remoto fue la salida formateada de `rtk` ("N matches in N files:" más líneas `path:line:content` con los valores reales incrustados en líneas malformadas), no líneas `VAR=valor`.
- **Cómo se detectó:** El conteo de verificación (`grep -c '^R2_' ...` dentro del contenedor) devolvió `0` en vez de `4`, inmediatamente después del primer intento — la red de seguridad que exige el plan hizo su trabajo.
- **Cómo se resolvió:** Se borraron las líneas corruptas del archivo remoto y se reaplicaron los valores usando `awk '/^R2_/'` capturado en una variable de shell (en vez de `grep`), verificando después que el archivo quedara con exactamente cuatro líneas correctas.
- **Impacto en credenciales:** Ningún valor de credencial se imprimió en salida visible en ningún momento, y ninguno llegó a git (`.env` nunca ha estado versionado; los 23 commits desplegados se verificaron limpios). El archivo corrupto existió sólo transitoriamente en el host y se sobrescribió antes de reiniciar el contenedor.
- **Registrado permanentemente:** `DEPLOY.md` §7c ahora advierte contra usar `grep` para canalizar credenciales por SSH en esta máquina, y recomienda `awk` o una variable de shell capturada. `grep` sigue siendo seguro para contar (paso de verificación), sólo no para copiar valores.

---

**Total deviations:** 0 sobre código de aplicación. 1 incidente operativo durante la tarea 2, detectado y resuelto por la propia red de seguridad del plan, sin fuga de credenciales, documentado en el runbook para que no se repita.
**Impact on plan:** Ninguno sobre el alcance ni el resultado final — las cuatro variables terminaron correctamente aplicadas y verificadas. El único efecto duradero es una lección operativa ahora escrita en `DEPLOY.md`.

## Issues Encountered

Ver el incidente de `grep`/`rtk` arriba — es el único evento no trivial del plan. No hubo fallos de arranque, no apareció el aviso de "Configuración de R2 incompleta" tras la corrección, y `/api/health` respondió 200 en todo momento salvo durante el reinicio del servicio.

## Estado verificado de producción (registrado para STATE.md)

- SSH: `panel-prosuite-2` y `propodvps2` resuelven al mismo host (`195.26.255.71`, hostname real `propodvps2`).
- SHA desplegado: `55c020d` (anterior `64f7476`), 23 commits de diferencia, incluido el desfase de tipado de `formSnapshot` de la fase 1.
- `prol-web-1.service`: activo, imagen `localhost/prol-web:latest` → `55c020d`.
- Contenedor: exactamente 4 variables `R2_*` (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) — nunca sus valores.
- `/etc/containers/env/prol-web-1.env`: 27 líneas, 4 de ellas `R2_`, modo 600 root:root, sin residuo del incidente.
- `journalctl` (últimas 300 líneas): 0 apariciones de "Configuración de R2 incompleta".
- `https://prol.prosuite.pro/api/health` → 200; `/sign-in` → 200.
- `prisma migrate diff` en preview: vacío (0 sentencias) — no hizo falta ningún `db push`.
- Volumen `prol_prol_private`: 0 archivos antes del despliegue — la migración de la §7c es un no-op genuino, todavía sin ejecutar contra el host.
- Imágenes de rollback siguen tagueadas: `64f7476`, `5323a42`, `7c287e8`.
- `documents_enabled` permanece `false` en los tres tenants (Academia Digital MX, IBIZA Consultores, Mecanica G3) — sin tocar, por diseño.

**Lo que este despliegue NO demuestra:** con `documents_enabled = false`, ninguna evidencia puede subirse por la interfaz de producción, así que el camino de escritura a R2 queda verificado en desarrollo local contra el bucket real (planes 02-02 y 02-03) pero **no** se ha ejercitado en producción. Se ejercitará cuando se encienda `documentsEnabled`, decisión de producto fuera del alcance de esta fase.

**Rollbacks disponibles, ninguno ejecutado en producción (no hizo falta):**
1. Sólo el backend: `ssh panel-prosuite-2 "sed -i '/^R2_BUCKET=/d' /etc/containers/env/prol-web-1.env && systemctl restart prol-web-1.service"` — verificado de punta a punta en local (plan 02-03).
2. La imagen entera: `ssh panel-prosuite-2 "podman tag localhost/prol-web:64f7476 localhost/prol-web:latest && systemctl restart prol-web-1.service"` — imagen anterior confirmada tagueada en el host.

## User Setup Required

None. Las cuatro variables ya están aplicadas en producción.

## Next Phase Readiness

- La fase 2 (R2 para el tier confidencial) queda cerrada: los cuatro planes completados, R2-01 y R2-04 confirmados también en producción (no sólo en local), sin romper R2-02 ni R2-03.
- Pendiente real, no bloqueante: ejecutar la receta de migración contra el host cuando el volumen deje de estar vacío (hoy sigue siendo un no-op documentado), y encender `documentsEnabled` cuando el negocio lo decida — ninguna de las dos cosas es responsabilidad de esta fase.
- Sin bloqueos para la fase 3.

---
*Phase: 02-r2-para-el-tier-confidencial*
*Completed: 2026-09-01*

## Self-Check: PASSED

`DEPLOY.md` confirmado modificado en disco con la sección 7c actualizada (`grep -n 'Estado:' DEPLOY.md` muestra la línea "APLICADO en `panel-prosuite-2` el 2026-09-01"). Commit `2161c35` confirmado en `git log --oneline -1`. `git diff --name-only` antes del commit mostró exactamente `DEPLOY.md`, y ninguna búsqueda de patrón de credencial (`R2_(ACCESS|SECRET|ACCOUNT|BUCKET)=[A-Za-z0-9]`) encontró coincidencias en el diff.
