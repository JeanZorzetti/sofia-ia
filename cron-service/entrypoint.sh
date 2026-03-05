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
  HOUR=$(date '+%H')
  MINUTE=$(date '+%M')
  DOW=$(date '+%u')

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

  # Daily at 12:00 UTC: /api/cron/email-drip
  if [ "$HOUR" = "12" ] && [ "$MINUTE" -lt "5" ] && [ $((COUNTER % 12)) -eq 1 ]; then
    echo "[${NOW}] Calling /api/cron/email-drip ..."
    RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "${AUTH}" "${SOFIA_URL}/api/cron/email-drip" 2>&1)
    echo "[${NOW}] email-drip -> ${RESULT}"
  fi

  # Monday at 11:00 UTC: /api/cron/weekly-digest
  if [ "$DOW" = "1" ] && [ "$HOUR" = "11" ] && [ "$MINUTE" -lt "5" ]; then
    echo "[${NOW}] Calling /api/cron/weekly-digest ..."
    RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "${AUTH}" "${SOFIA_URL}/api/cron/weekly-digest" 2>&1)
    echo "[${NOW}] weekly-digest -> ${RESULT}"
  fi

  sleep 300
done
