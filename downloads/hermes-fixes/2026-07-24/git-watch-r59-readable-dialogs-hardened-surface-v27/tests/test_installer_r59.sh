#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-$(command -v python)}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

make_home() {
  local root="$1"
  local profile_root="$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard"
  mkdir -p "$root/plugins/git-comments-v27-review/dashboard/dist" "$profile_root/dist" "$profile_root/data"
  printf 'old launch renderer\n' > "$root/plugins/git-comments-v27-review/dashboard/dist/index.js"
  printf 'old profile renderer\n' > "$profile_root/dist/index.js"
  printf 'old launch api\n' > "$root/plugins/git-comments-v27-review/dashboard/plugin_api.py"
  printf 'old profile api\n' > "$profile_root/plugin_api.py"
  printf '{"schema_version":1,"active":[{"id":"fixture"}],"archived":[]}\n' > "$profile_root/data/watchlist.json"
}

snapshot_runtime() {
  local root="$1" out="$2"
  local profile_root="$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard"
  mkdir -p "$out"
  cp "$root/plugins/git-comments-v27-review/dashboard/dist/index.js" "$out/launch-index.js"
  cp "$profile_root/dist/index.js" "$out/profile-index.js"
  cp "$root/plugins/git-comments-v27-review/dashboard/plugin_api.py" "$out/launch-api.py"
  cp "$profile_root/plugin_api.py" "$out/profile-api.py"
  cp "$profile_root/data/watchlist.json" "$out/watchlist.json"
}

assert_snapshot() {
  local root="$1" before="$2"
  local profile_root="$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard"
  cmp -s "$before/launch-index.js" "$root/plugins/git-comments-v27-review/dashboard/dist/index.js"
  cmp -s "$before/profile-index.js" "$profile_root/dist/index.js"
  cmp -s "$before/launch-api.py" "$root/plugins/git-comments-v27-review/dashboard/plugin_api.py"
  cmp -s "$before/profile-api.py" "$profile_root/plugin_api.py"
  cmp -s "$before/watchlist.json" "$profile_root/data/watchlist.json"
}

# Successful promotion must copy both runtime layers and leave all plugin data byte-identical.
SUCCESS_ROOT="$TMP/success-home"
make_home "$SUCCESS_ROOT"
cp "$SUCCESS_ROOT/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/data/watchlist.json" "$TMP/success-watchlist.before"
HERMES_HOME="$SUCCESS_ROOT" HERMES_PROFILE=local-ai-assist1 HERMES_PYTHON="$PYTHON_BIN" \
  bash "$PACKAGE_DIR/INSTALL.command" > "$TMP/success.log"
grep -q '^GIT_WATCH_R59_RUNTIME_INSTALL=PASS$' "$TMP/success.log"
grep -q '^WATCHLIST_DATA_PRESERVED=PASS$' "$TMP/success.log"
cmp -s "$PACKAGE_DIR/payload/dashboard/dist/index.js" "$SUCCESS_ROOT/plugins/git-comments-v27-review/dashboard/dist/index.js"
cmp -s "$PACKAGE_DIR/payload/dashboard/dist/index.js" "$SUCCESS_ROOT/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/dist/index.js"
cmp -s "$PACKAGE_DIR/payload/dashboard/plugin_api.py" "$SUCCESS_ROOT/plugins/git-comments-v27-review/dashboard/plugin_api.py"
cmp -s "$PACKAGE_DIR/payload/dashboard/plugin_api.py" "$SUCCESS_ROOT/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/plugin_api.py"
cmp -s "$TMP/success-watchlist.before" "$SUCCESS_ROOT/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/data/watchlist.json"

# A failure after all four runtime copies must return 91 and restore exact predecessor bytes.
ROLLBACK_ROOT="$TMP/rollback-home"
make_home "$ROLLBACK_ROOT"
snapshot_runtime "$ROLLBACK_ROOT" "$TMP/rollback-before"
set +e
HERMES_HOME="$ROLLBACK_ROOT" HERMES_PROFILE=local-ai-assist1 HERMES_PYTHON="$PYTHON_BIN" GIT_WATCH_R59_FAIL_AT=after-runtime \
  bash "$PACKAGE_DIR/INSTALL.command" > "$TMP/rollback.log" 2>&1
ROLLBACK_STATUS=$?
set -e
[[ "$ROLLBACK_STATUS" == "91" ]]
grep -q '^GIT_WATCH_R59_RESTORED_AFTER_FAILURE=' "$TMP/rollback.log"
! grep -q '^GIT_WATCH_R59_RUNTIME_INSTALL=PASS$' "$TMP/rollback.log"
assert_snapshot "$ROLLBACK_ROOT" "$TMP/rollback-before"

# A checksum-valid package mutant containing retired per-row unarchive CSS must fail closed.
MUTANT_PARENT="$TMP/mutant-parent"
mkdir -p "$MUTANT_PARENT"
cp -a "$PACKAGE_DIR" "$MUTANT_PARENT/package"
printf '\n.git-comments-button.unarchive{display:block}\n' >> "$MUTANT_PARENT/package/payload/dashboard/dist/index.js"
"$PYTHON_BIN" - "$MUTANT_PARENT/package" <<'PY'
from pathlib import Path
import hashlib, sys
root = Path(sys.argv[1])
lines = []
for path in sorted((p for p in root.rglob('*') if p.is_file() and p.name != 'CHECKSUMS.sha256'), key=lambda p: p.relative_to(root).as_posix()):
    lines.append(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(root).as_posix()}")
(root / 'CHECKSUMS.sha256').write_text('\n'.join(lines) + '\n', encoding='utf-8')
PY
REJECT_ROOT="$TMP/reject-home"
make_home "$REJECT_ROOT"
snapshot_runtime "$REJECT_ROOT" "$TMP/reject-before"
set +e
HERMES_HOME="$REJECT_ROOT" HERMES_PROFILE=local-ai-assist1 HERMES_PYTHON="$PYTHON_BIN" \
  bash "$MUTANT_PARENT/package/INSTALL.command" > "$TMP/reject.log" 2>&1
REJECT_STATUS=$?
set -e
[[ "$REJECT_STATUS" != "0" ]]
! grep -q '^GIT_WATCH_R59_INSTALL_MARKERS=PASS$' "$TMP/reject.log"
! grep -q '^GIT_WATCH_R59_RUNTIME_INSTALL=PASS$' "$TMP/reject.log"
assert_snapshot "$REJECT_ROOT" "$TMP/reject-before"

# A checksum-valid Revision 57 mobile-width regression must also fail closed.
MOBILE_MUTANT_PARENT="$TMP/mobile-mutant-parent"
mkdir -p "$MOBILE_MUTANT_PARENT"
cp -a "$PACKAGE_DIR" "$MOBILE_MUTANT_PARENT/package"
"$PYTHON_BIN" - "$MOBILE_MUTANT_PARENT/package" <<'PY'
from pathlib import Path
import hashlib, sys
root = Path(sys.argv[1])
renderer = root / 'payload/dashboard/dist/index.js'
text = renderer.read_text(encoding='utf-8')
old = '@media(max-width:760px){.git-comments-archive-bulk-controls{align-items:stretch}.git-comments-archive-selected-count{width:100%}.git-comments-action-backdrop{padding:16px}.git-comments-action-modal{width:min(620px,calc(100vw - 64px));padding:22px}'
new = old.replace('100vw - 64px', '100vw - 32px')
assert text.count(old) == 1
renderer.write_text(text.replace(old, new), encoding='utf-8')
lines = []
for path in sorted((p for p in root.rglob('*') if p.is_file() and p.name != 'CHECKSUMS.sha256'), key=lambda p: p.relative_to(root).as_posix()):
    lines.append(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(root).as_posix()}")
(root / 'CHECKSUMS.sha256').write_text('\n'.join(lines) + '\n', encoding='utf-8')
PY
MOBILE_REJECT_ROOT="$TMP/mobile-reject-home"
make_home "$MOBILE_REJECT_ROOT"
snapshot_runtime "$MOBILE_REJECT_ROOT" "$TMP/mobile-reject-before"
set +e
HERMES_HOME="$MOBILE_REJECT_ROOT" HERMES_PROFILE=local-ai-assist1 HERMES_PYTHON="$PYTHON_BIN" \
  bash "$MOBILE_MUTANT_PARENT/package/INSTALL.command" > "$TMP/mobile-reject.log" 2>&1
MOBILE_REJECT_STATUS=$?
set -e
[[ "$MOBILE_REJECT_STATUS" != "0" ]]
! grep -q '^GIT_WATCH_R59_INSTALL_MARKERS=PASS$' "$TMP/mobile-reject.log"
! grep -q '^GIT_WATCH_R59_RUNTIME_INSTALL=PASS$' "$TMP/mobile-reject.log"
assert_snapshot "$MOBILE_REJECT_ROOT" "$TMP/mobile-reject-before"

echo 'GIT_WATCH_R59_INSTALLER_LIFECYCLE=PASS'
