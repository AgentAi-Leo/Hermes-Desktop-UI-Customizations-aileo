#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

mkdir -p "$TMP/bin"
cat > "$TMP/bash-env" <<'SH'
python() {
  echo 'R62_MACOS_COMPAT_FAILURE: bare python command was invoked' >&2
  return 97
}
export -f python
SH

set +e
BASH_ENV="$TMP/bash-env" \
GIT_WATCH_R62_SKIP_MACOS_COMPAT=1 \
GIT_WATCH_R62_SKIP_SURFACE_MUTANTS=1 \
bash "$PACKAGE_DIR/VERIFY.command" > "$TMP/verify.log" 2>&1
status=$?
set -e

if [[ "$status" != "0" ]]; then
  sed -n '1,160p' "$TMP/verify.log" >&2
  exit "$status"
fi
if grep -q 'R62_MACOS_COMPAT_FAILURE' "$TMP/verify.log"; then
  echo 'R62 macOS compatibility test observed a bare python invocation' >&2
  exit 1
fi
grep -q '^GIT_WATCH_R62_PACKAGE_VERIFICATION=PASS$' "$TMP/verify.log"

echo 'GIT_WATCH_R62_MACOS_PYTHON3_COMPAT=PASS'
