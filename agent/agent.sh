#!/bin/sh
# Agent du lab : remonte l'état Docker et exécute les sauvegardes PostgreSQL.
set -eu
: "${SITE_URL:?}" "${AGENT_KEY:?}"
INTERVAL="${INTERVAL:-60}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
mkdir -p "$BACKUP_DIR"
LAST_BACKUP_DAY=""

while true; do
  # 1. État des conteneurs (socket Docker monté en lecture seule)
  PAYLOAD=$(docker ps -a --format '{{.Names}} {{.State}}' | awk '
    BEGIN { printf "{\"containers\":[" }
    { s = ($2=="running") ? "running" : (($2=="exited"||$2=="created") ? "stopped" : (($2=="dead"||$2=="restarting") ? "error" : "unknown"));
      printf "%s{\"name\":\"%s\",\"state\":\"%s\"}", (NR>1?",":""), $1, s }
    END { printf "]}" }')
  curl -fsS -X POST "$SITE_URL/api/public/agent/status" \
    -H "content-type: application/json" -H "x-agent-key: $AGENT_KEY" -d "$PAYLOAD" >/dev/null || echo "remontée d'état échouée"

  # 2. Sauvegarde quotidienne à l'heure configurée
  if [ -n "${DATABASE_URL:-}" ]; then
    CONF=$(curl -fsS "$SITE_URL/api/public/agent/backup" -H "x-agent-key: $AGENT_KEY" || echo '{}')
    HOUR=$(echo "$CONF" | sed -n 's/.*"cron":"[0-9]* \([0-9]*\).*/\1/p'); HOUR=${HOUR:-2}
    KEEP=$(echo "$CONF" | sed -n 's/.*"keep":\([0-9]*\).*/\1/p'); KEEP=${KEEP:-14}
    TODAY=$(date +%F)
    if [ "$(date +%-H)" -ge "$HOUR" ] && [ "$LAST_BACKUP_DAY" != "$TODAY" ]; then
      FILE="$BACKUP_DIR/infovergne-$(date +%Y%m%d-%H%M).sql.gz"
      if pg_dump "$DATABASE_URL" | gzip > "$FILE"; then
        STATUS=ok; MSG="pg_dump terminé"
      else
        STATUS=failed; MSG="pg_dump en échec"
      fi
      SIZE=$(stat -c %s "$FILE" 2>/dev/null || echo 0)
      curl -fsS -X POST "$SITE_URL/api/public/agent/backup" -H "content-type: application/json" \
        -H "x-agent-key: $AGENT_KEY" -d "{\"size_bytes\":$SIZE,\"status\":\"$STATUS\",\"message\":\"$MSG\"}" >/dev/null || true
      ls -1t "$BACKUP_DIR"/infovergne-*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm -f
      LAST_BACKUP_DAY="$TODAY"
    fi
  fi
  sleep "$INTERVAL"
done
