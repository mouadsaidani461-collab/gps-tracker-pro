#!/usr/bin/env bash
# Safe npm audit remediation — never runs --force automatically.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ npm audit (before fix)"
npm audit || true

echo ""
echo "→ npm audit fix"
if npm audit fix; then
  echo ""
  echo "✓ npm audit fix completed."
  npm audit || true
  exit 0
fi

echo ""
echo "⚠ npm audit fix could not resolve all issues."
echo ""
echo "  Do NOT run this automatically:"
echo "    npm audit fix --force"
echo ""
echo "  --force may install semver-major downgrades (e.g. exceljs 3.x) and break exports."
echo "  Prefer package.json \"overrides\" for patched transitive deps — see MIGRATION.md."
echo ""
npm audit || true
exit 1
