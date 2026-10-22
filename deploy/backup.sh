#!/bin/sh
set -eu
cd "$(dirname "$0")"
[ -f .env ] || { echo 'Copy .env.example to .env first'; exit 1; }
set -a
. ./.env
set +a
: "${DATA_DIR:?}" "${BACKUP_DIR:?}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
# Serialize maintenance commands, including upgrades.
mkdir "$BACKUP_DIR/.maintenance" || { echo 'Another maintenance operation is running'; exit 1; }
restart() { docker compose start app; rmdir "$BACKUP_DIR/.maintenance"; }
trap restart EXIT
trap 'exit 1' INT TERM
# Keep exactly the currently running image, even if .env was changed for an upgrade.
container=$(docker compose ps -q app)
[ -n "$container" ] || { echo 'App must be running before backup'; exit 1; }
image=$(docker inspect --format '{{.Image}}' "$container")
docker compose stop app
stamp=$(date -u +%Y%m%dT%H%M%SZ)-$$
docker run --rm --entrypoint node -v "$DATA_DIR:/data:ro" -v "$BACKUP_DIR:/backups" "$image" scripts/data-snapshot.mjs backup /data "/backups/$stamp"
echo "Backup complete: $BACKUP_DIR/$stamp"
