#!/usr/bin/env bash
# Scan tracked files for common secret patterns (CI / pre-deploy audit).
#
# Usage: ./scripts/audit-secrets.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXCLUDES=(
  ':(exclude).env'
  ':(exclude).env.production'
  ':(exclude).env.local'
  ':(exclude)secrets/*'
  ':(exclude)*.md'
  ':(exclude)scripts/setup-traccar-admin.sh'
  ':(exclude)scripts/validate-production-secrets.sh'
)

FOUND=0

check_pattern() {
  local label="$1"
  local pattern="$2"
  local MATCHES
  MATCHES=$(git grep -nE "$pattern" -- . "${EXCLUDES[@]}" 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo "=== Found: ${label} ==="
    echo "$MATCHES"
    FOUND=1
  fi
}

check_pattern 'weak admin password assignment' 'ADMIN_PASSWORD=REDACTED
check_pattern 'weak service token assignment' 'TRACCAR_SERVICE_TOKEN=(capture-bootstrap-change-me|changeme)'
check_pattern 'real email in env template' 'CERTBOT_EMAIL=.*@(gmail|yahoo|hotmail)\.'
check_pattern 'committed hex service token' 'TRACCAR_SERVICE_TOKEN=[0-9a-f]{48,}'

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "FAIL: Secret audit found issues in tracked files."
  exit 1
fi

echo "OK: No known hardcoded secrets in tracked files."
