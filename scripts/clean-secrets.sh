#!/usr/bin/env bash
# Remove leaked secrets from entire git history using BFG Repo-Cleaner.
#
# Usage (from repository root):
#   1. Fill scripts/passwords.txt with literal leaked values (see passwords.txt.example)
#   2. ./scripts/clean-secrets.sh
#   3. git push --force --all && git push --force --tags   # after review
#
# Requires: git, JRE 8+ (local java OR Docker traccar/traccar:latest fallback).
# Network only needed for first-time BFG jar download.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BFG_VERSION="1.14.0"
BFG_JAR="${BFG_JAR:-$ROOT/scripts/bfg-${BFG_VERSION}.jar}"
BFG_URL="https://repo1.maven.org/maven2/com/madgag/bfg/${BFG_VERSION}/bfg-${BFG_VERSION}.jar"
PASSWORDS_FILE="$ROOT/scripts/passwords.txt"
REDACTED="REDACTED"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

step() {
  echo ""
  echo "==> $*"
}

java_works() {
  command -v java >/dev/null 2>&1 && java -jar "$BFG_JAR" --help >/dev/null 2>&1
}

docker_java_works() {
  command -v docker >/dev/null 2>&1 \
    && docker image inspect traccar/traccar:latest >/dev/null 2>&1 \
    && docker run --rm --entrypoint /opt/traccar/jre/bin/java traccar/traccar:latest -version >/dev/null 2>&1
}

dockerize_arg() {
  case "$1" in
    "$ROOT") echo "/repo" ;;
    "$ROOT"/*) echo "/repo/${1#$ROOT/}" ;;
    *) echo "$1" ;;
  esac
}

run_bfg() {
  local -a args=("$@")
  if java_works; then
    java -jar "$BFG_JAR" "${args[@]}"
    return
  fi
  if docker_java_works; then
    local -a docker_args=()
    local arg
    for arg in "${args[@]}"; do
      docker_args+=("$(dockerize_arg "$arg")")
    done
    echo "Using Docker Java (traccar/traccar:latest) — local JRE not available."
    docker run --rm \
      --entrypoint /opt/traccar/jre/bin/java \
      -v "$ROOT:/repo" \
      -w /repo \
      traccar/traccar:latest \
      -jar "/repo/scripts/bfg-${BFG_VERSION}.jar" "${docker_args[@]}"
    return
  fi
  die "No Java runtime. Install openjdk@17, or ensure traccar/traccar:latest is pulled for Docker fallback."
}

if [ ! -d "$ROOT/.git" ]; then
  die "Not a git repository: $ROOT"
fi

step "Step 1/7 — Preflight checks"
need_cmd git

if [ -n "$(git status --porcelain)" ]; then
  die "Working tree is not clean. Commit or stash changes before rewriting history."
fi

if [ ! -f "$PASSWORDS_FILE" ]; then
  die "Missing $PASSWORDS_FILE — copy scripts/passwords.txt.example and add leaked literal values."
fi

step "Step 2/7 — Download BFG Repo-Cleaner (if needed)"
if [ ! -f "$BFG_JAR" ]; then
  need_cmd curl
  echo "Downloading BFG ${BFG_VERSION} → $BFG_JAR"
  mkdir -p "$(dirname "$BFG_JAR")"
  if ! curl -fsSL "$BFG_URL" -o "$BFG_JAR"; then
    rm -f "$BFG_JAR"
    die "Failed to download BFG. Set BFG_JAR to a local jar path or check network access."
  fi
else
  echo "Using existing BFG jar: $BFG_JAR"
fi

if ! java_works && ! docker_java_works; then
  die "BFG jar is present but no working Java (local or Docker). See SECURITY.md."
fi

step "Step 3/7 — Delete SSH key files from history"
# Filenames were accidentally committed at repo root (quoted paths in git).
run_bfg \
  --delete-files '{ssh-keygen*,id_ed25519,id_ed25519.pub,id_rsa,id_rsa.pub,*.pem,*.key}' \
  "$ROOT"

step "Step 4/7 — Replace secret strings with ${REDACTED}"
run_bfg \
  --replace-text "$PASSWORDS_FILE" \
  "$ROOT"

step "Step 5/7 — Expire reflogs and garbage-collect"
git reflog expire --expire=now --all
git gc --prune=now --aggressive

step "Step 6/7 — Remove leaked key files from working tree (if still present)"
rm -f \
  "$ROOT/ssh-keygen -t ed25519 -C \"mouadsaidani461@gmail.com\"" \
  "$ROOT/ssh-keygen -t ed25519 -C \"mouadsaidani461@gmail.com\".pub" \
  2>/dev/null || true

step "Step 7/7 — Verification hints"
echo ""
echo "History rewrite complete locally."
echo ""
echo "Next steps (manual):"
echo "  1. Review:  git log --oneline -5"
echo "  2. Scan:    git grep -i 'BEGIN OPENSSH PRIVATE KEY' || echo 'No SSH private keys in tree'"
echo "  3. Scan:    git grep -E 'TRACCAR_SERVICE_TOKEN=[0-9a-f]{32,}' || echo 'No hex tokens in tree'"
echo "  4. Rotate ALL exposed credentials (see SECURITY.md)"
echo "  5. Force-push rewritten history:"
echo "       git push --force --all"
echo "       git push --force --tags"
echo ""
echo "WARNING: Collaborators must re-clone or reset after force-push."
echo "CONFIRMED: BFG finished; secrets replaced with ${REDACTED} in git history."
