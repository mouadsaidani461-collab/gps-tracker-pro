#!/usr/bin/env bash
# Install local git hooks that block committing common secrets.
#
# Usage (from repository root):
#   ./scripts/setup-git-hooks.sh
#
# Prefers detect-secrets (pip); falls back to pattern checks inspired by git-secrets.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
HOOKS_DIR="$ROOT/.git/hooks"
PRE_COMMIT="$HOOKS_DIR/pre-commit"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

step() {
  echo "==> $*"
}

[ -d "$ROOT/.git" ] || die "Not a git repository: $ROOT"

step "Step 1/3 — Install secret scanner (detect-secrets preferred)"
DETECT_SECRETS=""
if command -v detect-secrets >/dev/null 2>&1; then
  DETECT_SECRETS="$(command -v detect-secrets)"
  echo "Found detect-secrets: $DETECT_SECRETS"
elif command -v pip3 >/dev/null 2>&1; then
  echo "Installing detect-secrets via pip3 --user ..."
  pip3 install --user detect-secrets >/dev/null 2>&1 || true
  if command -v detect-secrets >/dev/null 2>&1; then
    DETECT_SECRETS="$(command -v detect-secrets)"
  elif [ -x "$HOME/.local/bin/detect-secrets" ]; then
    DETECT_SECRETS="$HOME/.local/bin/detect-secrets"
  fi
elif command -v pip >/dev/null 2>&1; then
  echo "Installing detect-secrets via pip --user ..."
  pip install --user detect-secrets >/dev/null 2>&1 || true
  [ -x "$HOME/.local/bin/detect-secrets" ] && DETECT_SECRETS="$HOME/.local/bin/detect-secrets"
fi

if [ -z "$DETECT_SECRETS" ]; then
  echo "detect-secrets not available — hook will use pattern checks only."
  echo "Optional: pip3 install detect-secrets"
fi

step "Step 2/3 — Write pre-commit hook"
mkdir -p "$HOOKS_DIR"

cat > "$PRE_COMMIT" <<HOOK
#!/usr/bin/env bash
set -e

ROOT="\$(git rev-parse --show-toplevel)"
cd "\$ROOT"

fail() {
  echo "pre-commit BLOCKED: \$*" >&2
  exit 1
}

# --- Block private keys and env files ---
while IFS= read -r -d '' file; do
  case "\$file" in
    *.pem|*.key|id_rsa|id_rsa.pub|id_ed25519|id_ed25519.pub|ssh-keygen*)
      fail "Refusing to commit key file: \$file"
      ;;
    .env|.env.*|*/.env|*/.env.*|gps-tracker-pro/.env|gps-tracker-pro/.env.*)
      fail "Refusing to commit env file: \$file (use .env.example)"
      ;;
    scripts/passwords.txt)
      fail "Refusing to commit scripts/passwords.txt (contains replacement literals)"
      ;;
  esac

  if grep -qE 'BEGIN (OPENSSH |RSA )?PRIVATE KEY' "\$file" 2>/dev/null; then
    fail "Private key material detected in: \$file"
  fi
done < <(git diff --cached --name-only -z --diff-filter=ACM)

# --- Pattern scan (git-secrets style) on staged content ---
PATTERNS=(
  'ADMIN_PASSWORD=[^[:space:]]{8,}'
  'TRACCAR_SERVICE_TOKEN=[0-9a-fA-F]{32,}'
  'WEB_SERVICE_ACCOUNT_TOKEN=[0-9a-fA-F]{32,}'
  'aws_secret_access_key'
  'BEGIN OPENSSH PRIVATE KEY'
)

for pattern in "\${PATTERNS[@]}"; do
  if git diff --cached -U0 | grep -Eiq "\$pattern"; then
    fail "Staged diff matches secret pattern: \$pattern"
  fi
done

# --- detect-secrets on staged files (if installed) ---
DETECT_SECRETS="${DETECT_SECRETS:-}"
if [ -z "\$DETECT_SECRETS" ]; then
  command -v detect-secrets >/dev/null 2>&1 && DETECT_SECRETS="\$(command -v detect-secrets)"
  [ -x "\$HOME/.local/bin/detect-secrets" ] && DETECT_SECRETS="\${DETECT_SECRETS:-\$HOME/.local/bin/detect-secrets}"
fi

if [ -n "\$DETECT_SECRETS" ]; then
  STAGED="\$(git diff --cached --name-only --diff-filter=ACM | tr '\\n' ' ')"
  if [ -n "\$STAGED" ]; then
    if \$DETECT_SECRETS scan \$STAGED 2>/dev/null | grep -q 'Secret type'; then
      fail "detect-secrets found potential secrets in staged files. Run: detect-secrets scan <file>"
    fi
  fi
fi

# --- gps-tracker-pro audit (if present) ---
if [ -x "\$ROOT/gps-tracker-pro/scripts/audit-secrets.sh" ]; then
  "\$ROOT/gps-tracker-pro/scripts/audit-secrets.sh"
fi

exit 0
HOOK

chmod +x "$PRE_COMMIT"

step "Step 3/3 — Baseline detect-secrets config (optional)"
if [ -n "$DETECT_SECRETS" ] && [ ! -f "$ROOT/.secrets.baseline" ]; then
  echo "Creating .secrets.baseline (review and commit if desired) ..."
  "$DETECT_SECRETS" scan "$ROOT" > "$ROOT/.secrets.baseline" 2>/dev/null || true
fi

echo ""
echo "Git pre-commit hook installed: $PRE_COMMIT"
echo "It blocks: SSH/private keys, .env files, passwords.txt, and common secret patterns."
echo "Re-run this script after cloning on a new machine."
