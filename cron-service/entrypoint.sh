#!/bin/sh
SOFIA_URL="${SOFIA_URL:-https://sofiaia.roilabs.com.br}"
CRON_SECRET="${CRON_SECRET:-sofia-cron-secret-2026}"
AUTH="Authorization: Bearer ${CRON_SECRET}"

echo "=== Sofia Cron Service ==="
echo "URL: ${SOFIA_URL}"
echo "Starting cron loop (5 min interval)..."

COUNTER=0

while true; do
  COUNTER=$((COUNTER + 1))
  NOW=$(date '+%Y-%m-%d %H:%M:%S')

  # Every 5 minutes: /api/flows/cron
  echo "[${NOW}] #${COUNTER} Calling /api/flows/cron ..."
  RESULT=$(curl -sf -w "%{http_code}" -o /tmp/cron_resp.txt -H "${AUTH}" "${SOFIA_URL}/api/flows/cron" 2>&1)
  BODY=$(cat /tmp/cron_resp.txt 2>/dev/null)
  echo "[${NOW}] flows/cron -> HTTP ${RESULT} | ${BODY}"

  # Every 60 minutes (12 iterations): /api/cron/run-scheduled
  if [ $((COUNTER % 12)) -eq 0 ]; then
    echo "[${NOW}] Calling /api/cron/run-scheduled ..."
    RESULT=$(curl -sf -w "%{http_code}" -o /tmp/sched_resp.txt -H "${AUTH}" "${SOFIA_URL}/api/cron/run-scheduled" 2>&1)
    BODY=$(cat /tmp/sched_resp.txt 2>/dev/null)
    echo "[${NOW}] run-scheduled -> HTTP ${RESULT} | ${BODY}"
  fi

  sleep 300
done
