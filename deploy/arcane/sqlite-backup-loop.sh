#!/usr/bin/env bash
set -euo pipefail

DATABASE_PATH="${DATABASE_PATH:-/data/dakwah.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

backup_once() {
  if [ ! -f "$DATABASE_PATH" ]; then
    echo "SQLite database not found at $DATABASE_PATH; waiting."
    return 0
  fi

  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_path="$BACKUP_DIR/dakwah-$timestamp.sqlite"

  sqlite3 "$DATABASE_PATH" "PRAGMA wal_checkpoint(PASSIVE);"
  sqlite3 "$DATABASE_PATH" ".backup '$backup_path'"
  sqlite3 "$backup_path" "PRAGMA integrity_check;"

  find "$BACKUP_DIR" -name "dakwah-*.sqlite" -type f -mtime "+$BACKUP_RETENTION_DAYS" -delete
  echo "SQLite backup written to $backup_path"
}

while true; do
  backup_once
  sleep "$BACKUP_INTERVAL_SECONDS"
done
