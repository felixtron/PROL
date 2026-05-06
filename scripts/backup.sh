#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PROL — backup script (run daily via cron on the VPS).
#
# Produces:
#   /opt/prol/backups/db/prol_YYYYMMDD_HHMM.dump      (pg_dump custom format)
#   /opt/prol/backups/uploads/uploads_YYYYMMDD.tar.gz (volumen de uploads)
#
# Retention (deleted at the end of each run):
#   - keep last 14 daily dumps
#   - keep last 8 weekly uploads tarballs
#
# Off-site (optional):
#   If BACKUP_RCLONE_REMOTE is set (e.g. "r2:prol-backups"), each artifact is
#   pushed there with `rclone copy` after creation. Configure rclone first:
#       rclone config                        # set up the remote
#       sudo apt-get install -y rclone       # if not installed
#
# Usage on the VPS (cron):
#   0 3 * * *  /opt/prol/scripts/backup.sh >> /opt/prol/backups/backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/prol}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DB_CONTAINER="${DB_CONTAINER:-prol-db-1}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-prol_prol_uploads}"
DB_USER="${DB_USER:-prol}"
DB_NAME="${DB_NAME:-prol}"
RETAIN_DB_DAYS="${RETAIN_DB_DAYS:-14}"
RETAIN_UPLOADS_WEEKS="${RETAIN_UPLOADS_WEEKS:-8}"
RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"

ts="$(date -u +%Y%m%d_%H%M)"
date_ymd="$(date -u +%Y%m%d)"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/uploads"

log() { printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"; }

# ── 1. Postgres dump ────────────────────────────────────────────────────────
db_file="$BACKUP_DIR/db/prol_${ts}.dump"
log "DB dump → $db_file"
docker exec "$DB_CONTAINER" pg_dump \
  -U "$DB_USER" -d "$DB_NAME" \
  --format=custom --compress=9 \
  > "$db_file.tmp"
mv "$db_file.tmp" "$db_file"
db_size="$(du -h "$db_file" | cut -f1)"
log "DB dump OK ($db_size)"

# ── 2. Uploads tarball (skip if volume is empty) ────────────────────────────
uploads_file="$BACKUP_DIR/uploads/uploads_${date_ymd}.tar.gz"
log "Uploads tarball → $uploads_file"
docker run --rm \
  -v "$UPLOADS_VOLUME":/data:ro \
  -v "$BACKUP_DIR/uploads":/out \
  alpine:3.20 \
  sh -c "cd /data && tar czf /out/$(basename "$uploads_file").tmp . && mv /out/$(basename "$uploads_file").tmp /out/$(basename "$uploads_file")"
uploads_size="$(du -h "$uploads_file" | cut -f1)"
log "Uploads tarball OK ($uploads_size)"

# ── 3. Off-site copy (if rclone remote configured) ──────────────────────────
if [ -n "$RCLONE_REMOTE" ]; then
  if command -v rclone >/dev/null 2>&1; then
    log "Off-site sync → $RCLONE_REMOTE"
    rclone copy "$db_file"      "$RCLONE_REMOTE/db/"      --transfers=2 || log "WARN rclone db failed"
    rclone copy "$uploads_file" "$RCLONE_REMOTE/uploads/" --transfers=2 || log "WARN rclone uploads failed"
  else
    log "WARN rclone not installed; skipping off-site"
  fi
fi

# ── 4. Retention ────────────────────────────────────────────────────────────
log "Pruning DB dumps older than $RETAIN_DB_DAYS days"
find "$BACKUP_DIR/db" -name 'prol_*.dump' -type f -mtime +"$RETAIN_DB_DAYS" -delete

log "Pruning uploads tarballs beyond last $RETAIN_UPLOADS_WEEKS weeks"
find "$BACKUP_DIR/uploads" -name 'uploads_*.tar.gz' -type f \
  -mtime +"$((RETAIN_UPLOADS_WEEKS * 7))" -delete

log "Done."
