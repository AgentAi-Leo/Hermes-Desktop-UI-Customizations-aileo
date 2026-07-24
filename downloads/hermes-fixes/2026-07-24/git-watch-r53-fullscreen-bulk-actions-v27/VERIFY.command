#!/usr/bin/env bash
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PACKAGE_DIR"
python - <<'PY'
from pathlib import Path
listed={line.split('  ',1)[1] for line in Path('CHECKSUMS.sha256').read_text().splitlines() if line.strip()}
actual={str(path) for path in Path('.').rglob('*') if path.is_file() and path.name != 'CHECKSUMS.sha256'}
assert listed == actual, {'unlisted': sorted(actual-listed), 'missing': sorted(listed-actual)}
print('GIT_WATCH_R53_LEDGER_COVERAGE=PASS')
PY
shasum -a 256 -c CHECKSUMS.sha256
node --check payload/dashboard/dist/index.js
node tests/test_renderer_r53.js payload/dashboard/dist/index.js
node tests/test_renderer_regression.js payload/dashboard/dist/index.js tests/github-comments-checker-v27-review.sh payload/dashboard/plugin_api.py
python - <<'PY'
from pathlib import Path
path=Path('payload/dashboard/plugin_api.py')
compile(path.read_text(encoding='utf-8'), str(path), 'exec')
print('GIT_WATCH_R53_API_SYNTAX=PASS')
PY
GIT_WATCH_API_PATH="$PACKAGE_DIR/payload/dashboard/plugin_api.py" python -m unittest -v tests/test_bulk_api.py
bash -n INSTALL.command
bash -n tests/github-comments-checker-v27-review.sh
echo "GIT_WATCH_R53_PACKAGE_VERIFICATION=PASS"
