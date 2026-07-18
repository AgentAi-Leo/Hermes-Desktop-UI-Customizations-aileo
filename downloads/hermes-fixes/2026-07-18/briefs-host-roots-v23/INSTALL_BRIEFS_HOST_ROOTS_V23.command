#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_ROOT="${HERMES_AGENT_ROOT:-/Users/jb3/.hermes/hermes-agent}"
PROFILE="${HERMES_PROFILE:-local-ai-assist1}"
PROFILE_HOME="${HERMES_PROFILE_HOME:-$HOME/.hermes/profiles/$PROFILE}"
PYTHON="$AGENT_ROOT/venv/bin/python"
SCRIPTS="$PROFILE_HOME/scripts"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/.hermes/backups/briefs-host-roots-v23-$STAMP"
MIGRATION="$PACKAGE_DIR/briefs_host_root_migration.py"
APPLIED=0

restart_gateway() {
  (cd "$AGENT_ROOT" && "$PYTHON" -m hermes_cli.main --profile "$PROFILE" gateway restart)
  (cd "$AGENT_ROOT" && "$PYTHON" -m hermes_cli.main --profile "$PROFILE" gateway status)
}

restore_after_failure() {
  set +e
  if [[ "$APPLIED" == "1" && -f "$BACKUP/manifest.json" ]]; then
    "$PYTHON" "$BACKUP/briefs_host_root_migration.py" --rollback --backup "$BACKUP"
    restart_gateway || true
  fi
  echo "BRIEFS_HOST_ROOTS_V23_INSTALL=FAILED" >&2
  echo "BACKUP=$BACKUP" >&2
}
trap 'r=$?; if [[ $r -ne 0 ]]; then restore_after_failure; fi; exit $r' EXIT

for required in "$PYTHON" "$MIGRATION" "$PACKAGE_DIR/CHECKSUMS.sha256" \
  "$PACKAGE_DIR/materializer/brief_materializer.py" "$SCRIPTS/brief_materializer.py" \
  "$AGENT_ROOT/hermes_cli/env_loader.py"; do
  [[ -e "$required" ]] || { echo "Missing required path: $required" >&2; exit 1; }
done
[[ -x "$PYTHON" ]] || { echo "Hermes Python is not executable: $PYTHON" >&2; exit 1; }

(cd "$PACKAGE_DIR" && shasum -a 256 -c CHECKSUMS.sha256)

if [[ -n "$(git -C "$AGENT_ROOT" status --porcelain -- hermes_cli/env_loader.py)" ]]; then
  echo "EXISTING_ENV_LOADER_PATCH=DETECTED_AND_WILL_BE_PRESERVED"
  "$PYTHON" - "$AGENT_ROOT/hermes_cli/env_loader.py" <<'PY'
import py_compile, sys
from pathlib import Path
path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
assert text.count("def _safe_status_print(message: str) -> None:") == 1
assert text.count("except (BrokenPipeError, OSError):") >= 1
assert text.count("file=sys.stderr") == 1
assert text.count("_safe_status_print(") >= 7
py_compile.compile(str(path), doraise=True)
print("EXISTING_ENV_LOADER_PATCH_PREFLIGHT=PASS")
PY
fi

echo "=== READ-ONLY ROOT AUDIT ==="
"$PYTHON" "$MIGRATION" --audit --home "$HOME"

echo "=== PACKAGE REGRESSION TESTS ==="
(cd "$PACKAGE_DIR/materializer" && "$PYTHON" -m py_compile *.py && "$PYTHON" -m unittest -v)
(cd "$PACKAGE_DIR" && "$PYTHON" -m unittest -v test_migration.py)

echo "=== BACKUP-FIRST ROOT MIGRATION AND ENV-LOADER REPAIR ==="
"$PYTHON" "$MIGRATION" --apply \
  --home "$HOME" \
  --repo "$AGENT_ROOT" \
  --profile-home "$PROFILE_HOME" \
  --package "$PACKAGE_DIR" \
  --backup "$BACKUP"
APPLIED=1

(cd "$SCRIPTS" && "$PYTHON" -m py_compile brief_materializer.py brief_renderer.py materialize-briefs-ai.py materialize-briefs-stock.py)

# Schema 4 intentionally republishes the newest validated durable payload into
# the new real roots. Empty/no-new-payload remains a successful silent no-op.
env HERMES_HOME="$PROFILE_HOME" "$PYTHON" "$SCRIPTS/materialize-briefs-ai.py"
env HERMES_HOME="$PROFILE_HOME" "$PYTHON" "$SCRIPTS/materialize-briefs-stock.py"

for root in "$HOME/.hermes/zDownloads/__AI-DAILY-BRIEFS" "$HOME/.hermes/zDownloads/_STOCK-BRIEFS"; do
  [[ -d "$root" && ! -L "$root" ]] || { echo "Root is not a real directory: $root" >&2; exit 1; }
done

echo "=== PROFILE GATEWAY RESTART ==="
restart_gateway

echo "=== POST-RESTART CLOSED-STDERR AND ROOT PROBES ==="
(cd "$AGENT_ROOT" && PYTHONPATH="$AGENT_ROOT" "$PYTHON" - <<'PY'
import os
import sys
from pathlib import Path
from hermes_cli import env_loader
from hermes_cli import web_server

class ClosedPipe:
    def write(self, _text):
        raise BrokenPipeError(32, "Broken pipe")
    def flush(self):
        raise BrokenPipeError(32, "Broken pipe")

old = sys.stderr
try:
    sys.stderr = ClosedPipe()
    env_loader._safe_status_print("status probe")
finally:
    sys.stderr = old
print("CLOSED_STDERR_PROBE=PASS")
for kind in ("ai", "stock"):
    archive = web_server._brief_archive(kind)
    root = web_server._brief_root(archive)
    if root.is_symlink() or not root.is_dir():
        raise SystemExit(f"{kind} primary archive is not a real directory: {root}")
    if "sandboxes/docker" in str(root):
        raise SystemExit(f"{kind} primary archive still resolves into Docker: {root}")
    print(f"{kind.upper()}_PRIMARY_ROOT={root}")
print("PRIMARY_ROOT_PROBE=PASS")
PY
)

"$PYTHON" "$MIGRATION" --audit --home "$HOME" > "$BACKUP/audit-after-restart.json"

git -C "$AGENT_ROOT" diff -- hermes_cli/env_loader.py > "$BACKUP/env-loader.patch"
git -C "$AGENT_ROOT" diff --check -- hermes_cli/env_loader.py

trap - EXIT
echo "BRIEFS_HOST_ROOTS_V23_INSTALL=PASS"
echo "ROOTS=REAL_MAC_DIRECTORIES"
echo "MATERIALIZER_SCHEMA=4"
echo "CLOSED_STDERR_PROBE=PASS"
echo "OLD_DOCKER_TARGETS=RETAINED"
echo "BACKUP=$BACKUP"
echo "ROLLBACK=$BACKUP/ROLLBACK_BRIEFS_HOST_ROOTS_V23.command"
