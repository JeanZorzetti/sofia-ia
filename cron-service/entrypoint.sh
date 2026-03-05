#!/bin/sh
SOFIA_URL="${SOFIA_URL:-https://sofiaia.roilabs.com.br}"
CRON_SECRET="${CRON_SECRET:-sofia-cron-secret-2026}"
AUTH="Authorization: Bearer ${CRON_SECRET}"

echo "=== Sofia Cron Service ==="
echo "URL: ${SOFIA_URL}"
echo "SECRET: ${CRON_SECRET}"
echo "Starting cron loop (5 min interval)..."

COUNTER=0

while true; do
  COUNTER=$((COUNTER + 1))
  NOW=$(date '+%Y-%m-%d %H:%M:%S')

  # Every 5 minutes: /api/flows/cron
  echo "[${NOW}] #${COUNTER} Calling /api/flows/cron ..."
  RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "${AUTH}" "${SOFIA_URL}/api/flows/cron" 2>&1)
  echo "[${NOW}] flows/cron -> ${RESULT}"

  # Every 60 minutes (12 iterations): /api/cron/run-scheduled
  if [ $((COUNTER % 12)) -eq 0 ]; then
    echo "[${NOW}] Calling /api/cron/run-scheduled ..."
    RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "${AUTH}" "${SOFIA_URL}/api/cron/run-scheduled" 2>&1)
    echo "[${NOW}] run-scheduled -> ${RESULT}"
  fi

  sleep 300
done
