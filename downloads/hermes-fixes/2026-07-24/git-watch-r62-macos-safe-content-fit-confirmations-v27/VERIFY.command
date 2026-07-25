#!/usr/bin/env bash
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PACKAGE_DIR"
resolve_python() {
  if [[ -n "${HERMES_PYTHON:-}" ]]; then
    [[ -x "$HERMES_PYTHON" ]] || { echo "HERMES_PYTHON is not executable: $HERMES_PYTHON" >&2; return 1; }
    printf '%s\n' "$HERMES_PYTHON"
  elif command -v python3 >/dev/null 2>&1; then
    command -v python3
  elif command -v python >/dev/null 2>&1; then
    command -v python
  else
    echo "Python 3 is required but neither python3 nor python is available" >&2
    return 1
  fi
}
PYTHON_BIN="$(resolve_python)"
"$PYTHON_BIN" tests/package_surface.py .
"$PYTHON_BIN" tests/package_surface.py --self-test
shasum -a 256 -c CHECKSUMS.sha256
node --check payload/dashboard/dist/index.js
node tests/test_renderer_r62.js
node tests/test_visual_r62.js
if [[ "${GIT_WATCH_R62_SKIP_SURFACE_MUTANTS:-0}" != "1" ]]; then bash tests/test_surface_mutants_r62.sh; fi
node tests/test_renderer_regression.js payload/dashboard/dist/index.js tests/github-comments-checker-v27-review.sh payload/dashboard/plugin_api.py
"$PYTHON_BIN" - <<'PY'
from pathlib import Path
path=Path('payload/dashboard/plugin_api.py')
compile(path.read_text(encoding='utf-8'), str(path), 'exec')
print('GIT_WATCH_R62_API_SYNTAX=PASS')
PY
"$PYTHON_BIN" tests/test_bulk_api.py
bash tests/test_installer_r62.sh
if [[ "${GIT_WATCH_R62_SKIP_MACOS_COMPAT:-0}" != "1" ]]; then bash tests/test_macos_compat_r62.sh; fi
bash -n INSTALL.command
bash -n tests/github-comments-checker-v27-review.sh
echo "GIT_WATCH_R62_PACKAGE_VERIFICATION=PASS"
