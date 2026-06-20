#!/usr/bin/env bash
# Deploy Capture GPS on Hetzner (CX33 or similar)
#
# Usage:
#   ./scripts/deploy-production.sh http     # pre-DNS: HTTP only on server IP
#   ./scripts/deploy-production.sh init     # DNS (Hetzner API) + SSL + stack
#   ./scripts/deploy-production.sh deploy   # rebuild, cert renew, nginx reload
#   ./scripts/deploy-production.sh verify   # HTTPS + certificate expiry checks
#
# Requires: docker, docker compose, curl, dig, .env.production
# Optional: jq (Hetzner DNS API), HETZNER_DNS_API_TOKEN in env or GitHub Secrets

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE="docker compose -f ${COMPOSE_FILE} --env-file .env.production"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-capture-gps-production}"

if [ ! -f .env.production ]; then
  echo "Missing .env.production — copy from .env.production.example and set secrets."
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env.production && set +a

load_secret_file() {
  local var_name="$1"
  local file_path="$2"
  if [ -f "$file_path" ]; then
    # shellcheck disable=SC2163
    export "$var_name=$(tr -d '\n\r' < "$file_path")"
  fi
}

load_secret_file TRACCAR_SERVICE_TOKEN secrets/traccar_service_token
load_secret_file ADMIN_PASSWORD secrets/admin_password
load_secret_file CERTBOT_EMAIL secrets/certbot_email
load_secret_file POSTGRES_PASSWORD secrets/postgres_password
load_secret_file HETZNER_DNS_API_TOKEN secrets/hetzner_dns_api_token

DOMAIN="${DOMAIN:-gps-tracker-pro.ma}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
SSL_EXPIRY_WARN_DAYS="${SSL_EXPIRY_WARN_DAYS:-30}"

build_app_image() {
  chmod +x scripts/validate-env.sh
  ./scripts/validate-env.sh .env.production production

  local tag="${IMAGE_TAG:-latest}"
  echo "==> Building app image (VITE_APP_NAME=${VITE_APP_NAME})..."
  docker build \
    -f Dockerfile \
    --build-arg "VITE_APP_NAME=${VITE_APP_NAME}" \
    --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL:-/api}" \
    --build-arg "VITE_MAP_TILE_URL=${VITE_MAP_TILE_URL}" \
    -t "capture-tracking-gps:${tag}" \
    .
}

server_public_ip() {
  if [ -n "${HETZNER_SERVER_IP:-}" ]; then
    echo "$HETZNER_SERVER_IP"
    return
  fi
  curl -4 -sf --max-time 10 ifconfig.me \
    || curl -4 -sf --max-time 10 icanhazip.com \
    || curl -4 -sf --max-time 10 api.ipify.org
}

hetzner_dns_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  local token="${HETZNER_DNS_API_TOKEN:?HETZNER_DNS_API_TOKEN required for DNS API}"

  if [ -n "$data" ]; then
    curl -sf -X "$method" \
      -H "Auth-API-Token: ${token}" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "https://dns.hetzner.com/api/v1${path}"
  else
    curl -sf -X "$method" \
      -H "Auth-API-Token: ${token}" \
      "https://dns.hetzner.com/api/v1${path}"
  fi
}

resolve_hetzner_zone_id() {
  if [ -n "${HETZNER_DNS_ZONE_ID:-}" ]; then
    echo "$HETZNER_DNS_ZONE_ID"
    return
  fi
  command -v jq >/dev/null 2>&1 || {
    echo "ERROR: jq required for Hetzner DNS zone lookup (install: apt install jq)" >&2
    exit 1
  }
  local zone_name="${HETZNER_DNS_ZONE_NAME:-${DOMAIN}}"
  hetzner_dns_api GET "/zones?name=${zone_name}" | jq -r '.zones[0].id // empty'
}

upsert_hetzner_a_record() {
  local record_name="$1"
  local ip="$2"
  local zone_id="$3"

  command -v jq >/dev/null 2>&1 || exit 1

  local existing_id
  existing_id=$(hetzner_dns_api GET "/records?zone_id=${zone_id}&type=A&name=${record_name}" \
    | jq -r '.records[0].id // empty')

  local payload
  payload=$(jq -nc --arg z "$zone_id" --arg n "$record_name" --arg v "$ip" \
    '{zone_id:$z,type:"A",name:$n,value:$v,ttl:300}')

  if [ -n "$existing_id" ]; then
    hetzner_dns_api PUT "/records/${existing_id}" \
      "$(jq -nc --arg v "$ip" '{value:$v,ttl:300}')" >/dev/null
    echo "Updated A record: ${record_name} → ${ip}"
  else
    hetzner_dns_api POST "/records" "$payload" >/dev/null
    echo "Created A record: ${record_name} → ${ip}"
  fi
}

init_dns() {
  local ip
  ip="$(server_public_ip || true)"
  if [ -z "$ip" ]; then
    echo "ERROR: Could not detect server IP — set HETZNER_SERVER_IP in .env.production"
    exit 1
  fi
  echo "Server IP: ${ip}"

  if [ -z "${HETZNER_DNS_API_TOKEN:-}" ]; then
    echo "WARN: HETZNER_DNS_API_TOKEN not set — skipping Hetzner DNS API."
    echo "      Create A records manually: ${DOMAIN} and www.${DOMAIN} → ${ip}"
    check_dns
    return
  fi

  echo "==> Creating/updating Hetzner DNS A records..."
  local zone_id
  zone_id="$(resolve_hetzner_zone_id)"
  [ -n "$zone_id" ] || { echo "ERROR: Hetzner DNS zone not found for ${DOMAIN}"; exit 1; }

  upsert_hetzner_a_record "@" "$ip" "$zone_id"
  upsert_hetzner_a_record "www" "$ip" "$zone_id"

  echo "Waiting for DNS propagation (up to 120s)..."
  for _ in $(seq 1 24); do
    if check_dns 2>/dev/null; then
      return 0
    fi
    sleep 5
  done
  echo "WARN: DNS not fully propagated yet — SSL may fail; retry init later."
}

check_dns() {
  local resolved
  resolved=$(dig +short "$DOMAIN" A 2>/dev/null | head -1 || true)
  if [ -z "$resolved" ]; then
    echo "ERROR: DNS A record for ${DOMAIN} not found."
    echo "       For pre-DNS testing use: ./scripts/deploy-production.sh http"
    return 1
  fi
  echo "DNS OK: ${DOMAIN} → ${resolved}"
}

persist_ssl_edge_config() {
  if grep -q '^EDGE_NGINX_CONF=' .env.production 2>/dev/null; then
    if grep -q '^EDGE_NGINX_CONF=./docker/nginx/edge.local.conf' .env.production; then
      sed -i.bak 's|^EDGE_NGINX_CONF=.*|EDGE_NGINX_CONF=./docker/nginx/edge.conf|' .env.production
      rm -f .env.production.bak
    fi
  else
    echo 'EDGE_NGINX_CONF=./docker/nginx/edge.conf' >> .env.production
  fi
  # shellcheck disable=SC1091
  set -a && source .env.production && set +a
}

renew_ssl_and_reload_nginx() {
  echo "==> Certbot renew (if due)..."
  if $COMPOSE ps -q certbot >/dev/null 2>&1; then
    $COMPOSE exec -T certbot certbot renew --webroot -w /var/www/certbot --quiet || true
  else
    docker run --rm \
      -v "${COMPOSE_PROJECT}_certbot-etc:/etc/letsencrypt" \
      -v "${COMPOSE_PROJECT}_certbot-www:/var/www/certbot" \
      certbot/certbot renew --webroot -w /var/www/certbot --quiet || true
  fi

  local edge_cid
  edge_cid=$($COMPOSE ps -q edge 2>/dev/null || true)
  if [ -n "$edge_cid" ]; then
    echo "==> Reloading edge nginx..."
    docker exec "$edge_cid" nginx -s reload 2>/dev/null || docker exec "$edge_cid" nginx -t
  fi
}

obtain_ssl_certificate() {
  if [ -z "$CERTBOT_EMAIL" ]; then
    echo "Set CERTBOT_EMAIL in .env.production"
    exit 1
  fi

  echo "==> Obtaining Let's Encrypt certificate for ${DOMAIN}..."
  docker run --rm \
    -v "${COMPOSE_PROJECT}_certbot-etc:/etc/letsencrypt" \
    -v "${COMPOSE_PROJECT}_certbot-www:/var/www/certbot" \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" -d "www.${DOMAIN}" \
    --email "$CERTBOT_EMAIL" --agree-tos --non-interactive --no-eff-email
}

check_ssl_expiry() {
  echo "==> SSL certificate expiry..."
  local end_date days_left

  if ! end_date=$(echo | openssl s_client -servername "$DOMAIN" -connect "${DOMAIN}:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2); then
    echo "WARN: Could not read certificate for ${DOMAIN}"
    return 1
  fi

  days_left=$(( ($(date -d "$end_date" +%s) - $(date +%s)) / 86400 ))
  echo "Certificate expires: ${end_date} (${days_left} days)"

  if [ "$days_left" -lt "$SSL_EXPIRY_WARN_DAYS" ]; then
    echo "ERROR: SSL expires in ${days_left} days (< ${SSL_EXPIRY_WARN_DAYS})"
    return 1
  fi
  echo "OK: SSL expiry check passed"
}

cmd_http() {
  echo "==> Pre-SSL HTTP deploy (edge.local.conf, test via http://<SERVER_IP>/)"
  build_app_image
  $COMPOSE up -d --no-build
  cmd_verify || true
}

cmd_init() {
  build_app_image
  init_dns

  echo "==> Starting PostgreSQL + Traccar..."
  $COMPOSE up -d postgres traccar
  echo "Waiting for Traccar health..."
  sleep 15
  $COMPOSE up traccar-init
  $COMPOSE up -d app

  echo "==> Rendering edge SSL config..."
  chmod +x scripts/render-edge-conf.sh
  ./scripts/render-edge-conf.sh

  echo "==> Starting edge on HTTP (ACME webroot)..."
  EDGE_NGINX_CONF=./docker/nginx/edge.local.conf $COMPOSE up -d edge

  echo "Waiting for edge :80..."
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1/" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  obtain_ssl_certificate

  echo "==> Switching edge to HTTPS..."
  persist_ssl_edge_config
  $COMPOSE up -d --force-recreate edge certbot

  cmd_verify
}

cmd_deploy() {
  build_app_image
  if [ -f docker/nginx/edge.conf.template ] && [ ! -f docker/nginx/edge.conf ]; then
    ./scripts/render-edge-conf.sh
  fi
  $COMPOSE up -d --no-build
  renew_ssl_and_reload_nginx
  cmd_verify
}

cmd_verify() {
  local failed=0
  echo "==> Health checks..."
  $COMPOSE ps

  echo "==> Internal Traccar API (via app proxy)..."
  local app_cid
  app_cid=$($COMPOSE ps -q app 2>/dev/null || $COMPOSE ps -q frontend 2>/dev/null || true)
  if [ -n "$app_cid" ]; then
    docker exec "$app_cid" wget -qO- http://127.0.0.1/api/server | head -c 200
    echo ""
  else
    echo "WARN: app container not running"
    failed=1
  fi

  echo "==> Traccar :8082 (internal)..."
  local traccar_cid
  traccar_cid=$($COMPOSE ps -q traccar 2>/dev/null || true)
  if [ -n "$traccar_cid" ]; then
    if docker exec "$traccar_cid" wget -qO- http://127.0.0.1:8082/api/server | head -c 120 >/dev/null; then
      echo "OK: traccar:8082/api/server"
    else
      echo "ERROR: Traccar health check failed"
      failed=1
    fi
  fi

  echo "==> PostgreSQL..."
  local pg_cid
  pg_cid=$($COMPOSE ps -q postgres 2>/dev/null || true)
  if [ -n "$pg_cid" ]; then
    if docker exec "$pg_cid" pg_isready -U "${POSTGRES_USER:-traccar}" -d "${POSTGRES_DB:-traccar}" >/dev/null 2>&1; then
      echo "OK: postgres ready"
    else
      echo "ERROR: PostgreSQL not ready"
      failed=1
    fi
  fi

  echo "==> Public HTTP (local edge)..."
  if curl -sf "http://127.0.0.1/api/server" | head -c 120; then
    echo ""
    echo "OK: http://127.0.0.1/api/server"
  else
    echo "WARN: Local HTTP check failed."
  fi

  echo "==> Public HTTPS (${DOMAIN})..."
  if curl -sf "https://${DOMAIN}/api/server" | head -c 200; then
    echo ""
    echo "OK: https://${DOMAIN}/api/server"
    curl -sI "https://${DOMAIN}/" | grep -iE 'strict-transport|content-security|x-frame' || true
  else
    echo "WARN: HTTPS check failed (DNS/SSL may not be ready)."
    failed=1
  fi

  if curl -sf "https://${DOMAIN}/" >/dev/null 2>&1; then
    check_ssl_expiry || failed=1
  fi

  echo "==> Docker Scout (optional)..."
  docker scout quickview capture-tracking-gps:latest 2>/dev/null || echo "Install Docker Scout for CVE scan."

  if [ "$failed" -ne 0 ]; then
    echo "VERIFY: one or more checks failed"
    exit 1
  fi
  echo "VERIFY: all checks passed"
}

case "${1:-deploy}" in
  http) cmd_http ;;
  init) cmd_init ;;
  deploy) cmd_deploy ;;
  verify) cmd_verify ;;
  *)
    echo "Usage: $0 {http|init|deploy|verify}"
    exit 1
    ;;
esac
