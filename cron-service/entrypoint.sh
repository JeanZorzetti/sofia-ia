#!/bin/sh
# Substitui variáveis de ambiente no crontab e inicia o crond
SOFIA_URL="${SOFIA_URL:-https://sofiaia.roilabs.com.br}"
CRON_SECRET="${CRON_SECRET:-sofia-cron-secret-2026}"

echo "=== Sofia Cron Service ==="
echo "URL: ${SOFIA_URL}"
echo "Starting cron jobs..."

# Gera crontab com variáveis resolvidas
cat <<EOF > /etc/crontabs/root
*/5 * * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" ${SOFIA_URL}/api/flows/cron >> /proc/1/fd/1 2>&1
0 */1 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" ${SOFIA_URL}/api/cron/run-scheduled >> /proc/1/fd/1 2>&1
0 12 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" ${SOFIA_URL}/api/cron/email-drip >> /proc/1/fd/1 2>&1
0 11 * * 1 curl -sf -H "Authorization: Bearer ${CRON_SECRET}" ${SOFIA_URL}/api/cron/weekly-digest >> /proc/1/fd/1 2>&1
EOF

# Roda crond em foreground
exec crond -f -l 2
