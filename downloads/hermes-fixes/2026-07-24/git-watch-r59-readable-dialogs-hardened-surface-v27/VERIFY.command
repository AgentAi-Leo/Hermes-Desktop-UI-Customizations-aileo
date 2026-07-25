#!/usr/bin/env bash
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PACKAGE_DIR"
python tests/package_surface.py .
python tests/package_surface.py --self-test
shasum -a 256 -c CHECKSUMS.sha256
node --check payload/dashboard/dist/index.js
node tests/test_renderer_r59.js payload/dashboard/dist/index.js
node tests/test_visual_r59.js
if [[ "${GIT_WATCH_R59_SKIP_SURFACE_MUTANTS:-0}" != "1" ]]; then bash tests/test_surface_mutants_r59.sh; fi
node tests/test_renderer_regression.js payload/dashboard/dist/index.js tests/github-comments-checker-v27-review.sh payload/dashboard/plugin_api.py
python - <<'PY'
from pathlib import Path
path=Path('payload/dashboard/plugin_api.py')
compile(path.read_text(encoding='utf-8'), str(path), 'exec')
print('GIT_WATCH_R59_API_SYNTAX=PASS')
PY
GIT_WATCH_API_PATH="$PACKAGE_DIR/payload/dashboard/plugin_api.py" python -m unittest discover -s tests -p 'test_bulk_api.py' -v
bash tests/test_installer_r59.sh
bash -n INSTALL.command
bash -n tests/github-comments-checker-v27-review.sh
echo "GIT_WATCH_R59_PACKAGE_VERIFICATION=PASS"
