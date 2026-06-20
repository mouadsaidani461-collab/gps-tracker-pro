#!/usr/bin/env bash
# Lightweight production monitoring (curl/nc only — no heavy deps).
#
# Usage (cron): */5 * * * * /opt/gps-tracker-pro/gps-tracker-pro/scripts/monitor.sh
#
# Alerts via scripts/lib/send-alert.sh (webhook / Mailgun / SendGrid)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
[ -f .env.production ] && set -a && source .env.production && set +a

# shellcheck source=lib/send-alert.sh
source "$ROOT/scripts/lib/send-alert.sh"

DOMAIN="${DOMAIN:-gps-tracker-pro.ma}"
TRACCAR_INTERNAL_URL="${TRACCAR_INTERNAL_URL:-http://127.0.0.1:8082}"
DISK_WARN_PCT="${DISK_WARN_PCT:-80}"
SSL_WARN_DAYS="${SSL_WARN_DAYS:-30}"
MEM_WARN_PCT="${MEM_WARN_PCT:-90}"
CPU_LOAD_WARN="${CPU_LOAD_WARN:-4.0}"

ISSUES=()

check_traccar() {
  if curl -sf --max-time 10 "${TRACCAR_INTERNAL_URL}/api/server" >/dev/null 2>&1; then
    echo "OK: Traccar ${TRACCAR_INTERNAL_URL}"
    return
  fi
  if nc -z 127.0.0.1 8082 2>/dev/null; then
    echo "WARN: Traccar port open but /api/server failed"
    ISSUES+=("Traccar API unreachable at ${TRACCAR_INTERNAL_URL}")
    return
  fi
  ISSUES+=("Traccar not responding on port 8082")
}

check_disk() {
  local pct
  pct=$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
  echo "Disk /: ${pct}% used"
  if [ "$pct" -ge "$DISK_WARN_PCT" ]; then
    ISSUES+=("Disk usage ${pct}% (threshold ${DISK_WARN_PCT}%)")
  fi
}

check_ssl() {
  local end_date days_left
  if ! end_date=$(echo | openssl s_client -servername "$DOMAIN" -connect "${DOMAIN}:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2); then
    ISSUES+=("Could not read SSL certificate for ${DOMAIN}")
    return
  fi
  days_left=$(( ($(date -d "$end_date" +%s) - $(date +%s)) / 86400 ))
  echo "SSL ${DOMAIN}: expires in ${days_left} days"
  if [ "$days_left" -lt "$SSL_WARN_DAYS" ]; then
    ISSUES+=("SSL expires in ${days_left} days (< ${SSL_WARN_DAYS})")
  fi
}

check_memory() {
  local mem_pct
  mem_pct=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
  echo "Memory: ${mem_pct}% used"
  if [ "$mem_pct" -ge "$MEM_WARN_PCT" ]; then
    ISSUES+=("Memory usage ${mem_pct}% (threshold ${MEM_WARN_PCT}%)")
  fi
}

check_cpu() {
  local load1
  load1=$(awk '{print $1}' /proc/loadavg)
  echo "Load average (1m): ${load1}"
  if awk -v l="$load1" -v w="$CPU_LOAD_WARN" 'BEGIN { exit (l+0 >= w+0) ? 0 : 1 }'; then
    ISSUES+=("CPU load ${load1} (threshold ${CPU_LOAD_WARN})")
  fi
}

check_https() {
  if curl -sf --max-time 15 "https://${DOMAIN}/api/server" >/dev/null; then
    echo "OK: https://${DOMAIN}/api/server"
  else
    ISSUES+=("HTTPS health check failed for https://${DOMAIN}/api/server")
  fi
}

echo "==> Monitor $(date -Is)"
check_traccar
check_https
check_disk
check_ssl
check_memory
check_cpu

if [ "${#ISSUES[@]}" -gt 0 ]; then
  body=$(printf '%s\n' "${ISSUES[@]}")
  echo "ALERT: ${body}"
  send_alert "Capture GPS monitor alert (${DOMAIN})" "$body" || true
  exit 1
fi

echo "OK: all checks passed"
