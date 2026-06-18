#!/usr/bin/env bash
# Render docker/nginx/edge.conf from edge.conf.template using DOMAIN from .env.production
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env.production ]; then
  # shellcheck disable=SC1091
  set -a && source .env.production && set +a
fi

DOMAIN="${DOMAIN:-gps-tracker-pro.ma}"
sed "s/\${DOMAIN}/${DOMAIN}/g" docker/nginx/edge.conf.template > docker/nginx/edge.conf
echo "Rendered docker/nginx/edge.conf for DOMAIN=${DOMAIN}"
