#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PROL — restore a PostgreSQL dump into prol-db-1.
#
# WARNING: this will WIPE the current `prol` database before restoring.
# Use only after taking a fresh backup. Stop the web container first to
# prevent writes during restore.
#
# Usage:
#   sudo systemctl stop docker  # or: docker compose stop web
#   /opt/prol/scripts/restore-db.sh /opt/prol/backups/db/prol_20260424_0300.dump
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-prol-db-1}"
DB_USER="${DB_USER:-prol}"
DB_NAME="${DB_NAME:-prol}"

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-dump>" >&2
  exit 1
fi

dump_file="$1"
if [ ! -f "$dump_file" ]; then
  echo "Dump not found: $dump_file" >&2
  exit 1
fi

echo "WILL RESTORE $dump_file → container $DB_CONTAINER, db=$DB_NAME"
echo "Type 'restore' to confirm:"
read -r confirm
if [ "$confirm" != "restore" ]; then
  echo "Aborted."
  exit 1
fi

echo "Dropping and recreating database..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres <<SQL
SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
 WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
SQL

echo "Restoring..."
cat "$dump_file" | docker exec -i "$DB_CONTAINER" \
  pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl

echo "Done. Restart the web container."
