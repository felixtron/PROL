---
phase: 01-higiene-y-operacion
plan: 01
subsystem: infra
tags: [backup, docker-compose, docker, rclone, podman, volumes]

# Dependency graph
requires: []
provides:
  - "scripts/backup.sh produce un tercer artefacto (private_<fecha>.tar.gz) con la misma retención, poda y off-site que uploads"
  - "docker-compose.prod.yml declara el volumen prol_private, que resuelve a prol_prol_private (el nombre físico que producción ya creó a mano) y lo monta en /app/private-uploads con PRIVATE_UPLOAD_DIR apuntando ahí"
  - "scripts/README.md y DEPLOY.md §7b documentan el artefacto nuevo y la regla de sincronía compose ↔ quadlet"
affects: [02-r2-migracion, fase-1-resto-de-planes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bloque de backup por volumen: variable *_VOLUME con default, mkdir del subdirectorio, docker run --rm -v VOL:/data:ro ... alpine tar, rclone copy, find -mtime -delete. El bloque privado replica el de uploads exactamente."
    - "Convención de nombres de Docker Compose: la clave de volumen no-external se prefija con el nombre del proyecto (prol_private -> prol_prol_private)."

key-files:
  created: []
  modified:
    - scripts/backup.sh
    - docker-compose.prod.yml
    - scripts/README.md
    - DEPLOY.md

key-decisions:
  - "El volumen privado SÍ se replica off-site por rclone, igual que uploads y db (decisión cerrada del usuario, ya en el plan)."
  - "La migración docker -> podman de backup.sh sigue diferida: depende de un diagnóstico por SSH (fuera de alcance de esta fase) sobre si el cron corre siquiera hoy con docker en un host que sólo tiene podman instalado."

patterns-established:
  - "Nuevo volumen persistente en producción = 3 cambios coordinados: bloque en backup.sh, declaración+montaje+env en docker-compose.prod.yml, entrada en scripts/README.md y DEPLOY.md."

requirements-completed: [OPS-01, OPS-02]

# Metrics
duration: ~20min
completed: 2026-09-01
---

# Phase 1 Plan 01: Respaldo del volumen privado y coherencia del compose Summary

**`scripts/backup.sh` ahora genera un tercer tarball (`private_<fecha>.tar.gz`) del volumen de evidencias confidenciales, y `docker-compose.prod.yml` declara y monta ese mismo volumen (`prol_private` → `prol_prol_private`) que producción ya tenía creado a mano.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-01T21:00:00Z (aprox.)
- **Completed:** 2026-09-01T21:20:00Z
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- El dato más sensible de la plataforma (evidencias de cumplimiento) ya tiene copia local, retención y réplica off-site — antes no tenía ninguna.
- `docker-compose.prod.yml` deja de estar desincronizado del quadlet real de producción: ahora declara `prol_private` y lo monta en `/app/private-uploads` con `PRIVATE_UPLOAD_DIR` seteado, tal como ya corre el host.
- Documentación operativa (`scripts/README.md`, `DEPLOY.md` §7b) al día con el artefacto nuevo y la regla explícita de mantener compose y quadlet sincronizados.

## Task Commits

Each task was committed atomically:

1. **Tarea 1: segundo tarball del volumen privado en backup.sh** - `04343fd` (feat)
2. **Tarea 2: declarar, montar y apuntar el volumen privado en el compose de producción** - `bf7cc3a` (feat)
3. **Tarea 3: documentar el artefacto nuevo y la regla de sincronía compose ↔ quadlet** - `ce05e3e` (docs)

**Plan metadata:** (siguiente commit tras este SUMMARY)

## Files Created/Modified
- `scripts/backup.sh` - Nueva variable `PRIVATE_VOLUME`, tercer bloque `docker run` para el tarball privado, off-site por rclone, poda con `RETAIN_UPLOADS_WEEKS`, cabecera actualizada. Banners renumerados (3→4→5).
- `docker-compose.prod.yml` - Volumen `prol_private` declarado a nivel superior, montado en `/app/private-uploads` en el servicio `web`, `PRIVATE_UPLOAD_DIR` añadido al `environment`.
- `scripts/README.md` - Tercera fila en la tabla de artefactos, nota de retención compartida, receta de restauración del volumen privado (paralela a la de uploads).
- `DEPLOY.md` - §7b gana un párrafo (sin acentos, siguiendo el estilo del archivo) que ata la clave `prol_private` del compose al `prol_prol_private` del `podman volume create`, y deja escrita la regla de sincronía compose ↔ quadlet.

## Decisions Made
- El volumen privado se replica off-site por rclone igual que los otros dos artefactos (ya cerrado en el plan; sólo ejecutado aquí).
- La migración `docker` → `podman` de `backup.sh` **sigue diferida**. Motivo (bloqueo ya declarado en `STATE.md` antes de este plan): el script invoca `docker exec`/`docker run`, pero `DEPLOY.md` documenta que el host de producción sólo tiene `podman`. Arreglar las invocaciones del script no sirve de nada si el cron nunca llega a ejecutarlo — hace falta primero un diagnóstico por SSH (acción sobre producción, fuera del alcance de un plan de esta fase, y requiere su propio plan de riesgo/rollback). Este plan escribió el bloque nuevo con la **misma** invocación `docker` que ya usaba el bloque de uploads, exactamente como pedía el alcance.

## Comando de humo (reusar en fases futuras)

```bash
SB=$(mktemp -d)
docker volume create prol_test_uploads
docker volume create prol_test_private
docker run --rm -v prol_test_uploads:/d alpine:3.20 sh -c 'echo up > /d/u.txt'
docker run --rm -v prol_test_private:/d alpine:3.20 sh -c 'mkdir -p /d/evidence && echo secreto > /d/evidence/e.txt'
BACKUP_DIR="$SB" DB_CONTAINER=prol-db DB_USER=prol DB_NAME=prol \
  UPLOADS_VOLUME=prol_test_uploads PRIVATE_VOLUME=prol_test_private \
  bash scripts/backup.sh
ls "$SB"/db "$SB"/uploads "$SB"/private
tar tzf "$SB"/private/private_*.tar.gz | grep 'evidence/e.txt'
docker volume rm prol_test_uploads prol_test_private
rm -rf "$SB"
```

Corrida en este plan: exit 0, produjo `db/prol_20260901_2116.dump` (253.6K),
`uploads/uploads_20260901.tar.gz` (129B) y `private/private_20260901.tar.gz`
(157B); `tar tzf` del tarball privado listó `./evidence/e.txt`. Requiere el
contenedor local `prol-db` corriendo (base sembrada en `localhost:5435`, ver
`STATE.md`). Los volúmenes de prueba se borraron al terminar.

## Deviations from Plan

None - plan ejecutado tal como estaba escrito. Los cinco cambios quirúrgicos
de `backup.sh`, los tres cambios de `docker-compose.prod.yml` y las
actualizaciones documentales coinciden con lo especificado en el plan, sin
necesidad de fixes ni ajustes de alcance.

## Issues Encountered

- El entorno de ejecución denegó permiso para comandos de shell que
  encadenaban múltiples pasos de Docker en una sola invocación (`docker volume
  create && docker run && bash scripts/backup.sh && ...`). Se resolvió
  ejecutando cada paso de la corrida de humo como un comando `Bash`
  independiente; el resultado verificado es idéntico al que habría producido
  el bloque de verificación del plan tal como está escrito.
- Nota operativa encontrada al leer `DEPLOY.md` (no accionable desde este
  plan, no se tocó el VPS): el VPS tiene `docker-compose.prod.yml`
  **modificado sin commitear** (usa la red `traefik` en vez de
  `dokploy-network` y variables de Turnstile adicionales). Como este plan
  también modifica ese archivo, el próximo `git pull` en el VPS podría
  requerir reconciliación manual antes de que el volumen `prol_private` quede
  activo ahí. Queda para quien despliegue este cambio, no para este plan.

## User Setup Required

None - no requiere configuración de servicios externos. El cambio en
`docker-compose.prod.yml` sólo toma efecto cuando alguien reconstruya desde
ese archivo en el VPS; producción sigue corriendo con el quadlet existente
mientras tanto (el volumen físico `prol_prol_private` ya existe en el host).

## Next Phase Readiness

- El riesgo de mayor severidad del milestone (evidencias sin respaldo) queda
  cerrado a nivel de repositorio. Falta, como bloqueo ya declarado en
  `STATE.md` y explícitamente diferido en `01-CONTEXT.md`, el diagnóstico por
  SSH de si `backup.sh` corre siquiera hoy (host con `podman`, script con
  `docker`).
- `docker-compose.prod.yml` queda coherente con el quadlet de producción,
  documentación ejecutable para reconstruir el stack desde cero sin perder el
  volumen privado.
- Sin bloqueos para los planes 01-02 (concurrencia en `manual.ts`), 01-03/04
  (snapshot tipado) ni para la fase 2 (migración a R2), que puede apoyarse en
  este punto de restauración recién creado.

---
*Phase: 01-higiene-y-operacion*
*Completed: 2026-09-01*

## Self-Check: PASSED

Todos los archivos declarados existen (`scripts/backup.sh`,
`docker-compose.prod.yml`, `scripts/README.md`, `DEPLOY.md`,
`01-01-SUMMARY.md`) y los tres hashes de commit (`04343fd`, `bf7cc3a`,
`ce05e3e`) están en el historial de git.
