#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PROL — backup script (run daily via cron on the VPS).
#
# Produces:
#   /opt/prol/backups/db/prol_YYYYMMDD_HHMM.dump        (pg_dump custom format)
#   /opt/prol/backups/uploads/uploads_YYYYMMDD.tar.gz   (volumen de uploads)
#   /opt/prol/backups/private/private_YYYYMMDD.tar.gz   (volumen privado: evidencias
#                                                        y plantillas confidenciales)
#
# Cadence and retention (podado al final de cada corrida, POR CANTIDAD):
#   - db:      diario,  se conservan los 14 más recientes      (~1.2 MB cada uno)
#   - uploads: SEMANAL, se conservan los 8 más recientes       (~1.5 GB cada uno)
#   - private: diario,  se conservan los 30 más recientes      (evidencias; pequeño)
#
#   El tarball de uploads es semanal a propósito: pesa gigabytes y a diario
#   llenaría el disco (56 × 1.5 GB ≈ 84 GB). Se genera el domingo, o cualquier
#   día si todavía no existe ninguno. FORCE_UPLOADS=1 lo fuerza.
#
#   La poda va por CANTIDAD y no por antigüedad (`-mtime`): así el número de
#   copias conservadas no depende de con qué frecuencia llegue a correr el cron.
#
# Off-site (optional):
#   If BACKUP_RCLONE_REMOTE is set (e.g. "r2:prol-backups"), each artifact is
#   pushed there with `rclone copy` after creation. Configure rclone first:
#       rclone config                        # set up the remote
#       sudo apt-get install -y rclone       # if not installed
#
# Container runtime:
#   El host de producción corre podman y NO tiene binario `docker` (la directiva
#   prohíbe `podman-docker`), mientras que en local hay docker. El script elige
#   el que exista, y CONTAINER_CLI permite forzarlo.
#
# Usage on the VPS (cron):
#   0 3 * * *  /usr/local/bin/prol-backup.sh >> /opt/prol/backups/backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ -z "${CONTAINER_CLI:-}" ]; then
  if command -v podman >/dev/null 2>&1; then
    CONTAINER_CLI=podman
  elif command -v docker >/dev/null 2>&1; then
    CONTAINER_CLI=docker
  else
    echo "ERROR: no hay ni podman ni docker en el PATH" >&2
    exit 1
  fi
fi

PROJECT_DIR="${PROJECT_DIR:-/opt/prol}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DB_CONTAINER="${DB_CONTAINER:-prol-db-1}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-prol_prol_uploads}"
PRIVATE_VOLUME="${PRIVATE_VOLUME:-prol_prol_private}"
DB_USER="${DB_USER:-prol}"
DB_NAME="${DB_NAME:-prol}"
KEEP_DB="${KEEP_DB:-14}"
KEEP_UPLOADS="${KEEP_UPLOADS:-8}"
KEEP_PRIVATE="${KEEP_PRIVATE:-30}"
RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"

ts="$(date -u +%Y%m%d_%H%M)"
date_ymd="$(date -u +%Y%m%d)"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/uploads" "$BACKUP_DIR/private"

log() { printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"; }

# ── 1. Postgres dump ────────────────────────────────────────────────────────
db_file="$BACKUP_DIR/db/prol_${ts}.dump"
log "DB dump → $db_file"
"$CONTAINER_CLI" exec "$DB_CONTAINER" pg_dump \
  -U "$DB_USER" -d "$DB_NAME" \
  --format=custom --compress=9 \
  > "$db_file.tmp"
mv "$db_file.tmp" "$db_file"
db_size="$(du -h "$db_file" | cut -f1)"
log "DB dump OK ($db_size)"

# ── 2. Uploads tarball (SEMANAL: pesa gigabytes) ────────────────────────────
uploads_file="$BACKUP_DIR/uploads/uploads_${date_ymd}.tar.gz"
if [ "$(date -u +%u)" = "7" ] \
   || [ -z "$(find "$BACKUP_DIR/uploads" -name 'uploads_*.tar.gz' -type f -print -quit)" ] \
   || [ -n "${FORCE_UPLOADS:-}" ]; then
  log "Uploads tarball → $uploads_file"
  "$CONTAINER_CLI" run --rm \
    -v "$UPLOADS_VOLUME":/data:ro \
    -v "$BACKUP_DIR/uploads":/out \
    alpine:3.20 \
    sh -c "cd /data && tar czf /out/$(basename "$uploads_file").tmp . && mv /out/$(basename "$uploads_file").tmp /out/$(basename "$uploads_file")"
  uploads_size="$(du -h "$uploads_file" | cut -f1)"
  log "Uploads tarball OK ($uploads_size)"
else
  uploads_file=""
  log "Uploads tarball omitido (sólo domingos; hoy es día $(date -u +%u))"
fi

# ── 3. Private volume tarball (evidencias y plantillas confidenciales) ──────
private_file="$BACKUP_DIR/private/private_${date_ymd}.tar.gz"
log "Private tarball → $private_file"
"$CONTAINER_CLI" run --rm \
  -v "$PRIVATE_VOLUME":/data:ro \
  -v "$BACKUP_DIR/private":/out \
  alpine:3.20 \
  sh -c "cd /data && tar czf /out/$(basename "$private_file").tmp . && mv /out/$(basename "$private_file").tmp /out/$(basename "$private_file")"
private_size="$(du -h "$private_file" | cut -f1)"
log "Private tarball OK ($private_size)"

# ── 4. Off-site copy (if rclone remote configured) ──────────────────────────
if [ -n "$RCLONE_REMOTE" ]; then
  if command -v rclone >/dev/null 2>&1; then
    log "Off-site sync → $RCLONE_REMOTE"
    rclone copy "$db_file"      "$RCLONE_REMOTE/db/"      --transfers=2 || log "WARN rclone db failed"
    # uploads_file queda vacío los días en que no toca tarball semanal
    [ -n "$uploads_file" ] && { rclone copy "$uploads_file" "$RCLONE_REMOTE/uploads/" --transfers=2 || log "WARN rclone uploads failed"; }
    rclone copy "$private_file" "$RCLONE_REMOTE/private/" --transfers=2 || log "WARN rclone private failed"
  else
    log "WARN rclone not installed; skipping off-site"
  fi
fi

# ── 5. Retention (por cantidad, no por antigüedad) ──────────────────────────
# Conserva los N más recientes por fecha de modificación y borra el resto. Va por
# cantidad para que el número de copias no dependa de la cadencia real del cron:
# si el cron se para un mes, al volver no se borra todo el histórico de golpe.
prune_keep() {
  local dir="$1" pattern="$2" keep="$3" label="$4" total removed
  total="$(find "$dir" -name "$pattern" -type f | wc -l | tr -d ' ')"
  if [ "$total" -le "$keep" ]; then
    log "Retención $label: $total copias, se conservan hasta $keep — nada que podar"
    return
  fi
  removed=0
  # -printf no existe en BSD find; se ordena por mtime con stat, portable en el VPS (GNU).
  while IFS= read -r f; do
    rm -f "$f" && removed=$((removed + 1))
  done < <(find "$dir" -name "$pattern" -type f -printf '%T@ %p\n' \
             | sort -rn | tail -n +"$((keep + 1))" | cut -d' ' -f2-)
  log "Retención $label: $total copias → se borraron $removed, quedan $keep"
}

prune_keep "$BACKUP_DIR/db"      'prol_*.dump'        "$KEEP_DB"      "db"
prune_keep "$BACKUP_DIR/uploads" 'uploads_*.tar.gz'   "$KEEP_UPLOADS" "uploads"
prune_keep "$BACKUP_DIR/private" 'private_*.tar.gz'   "$KEEP_PRIVATE" "private"

log "Done."
