#!/usr/bin/env bash
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PACKAGE_DIR"
python - <<'PY'
from pathlib import Path
from tempfile import TemporaryDirectory

def package_files(root):
    return {path.relative_to(root).as_posix() for path in root.rglob('*') if path.is_file() and path != root / 'CHECKSUMS.sha256'}

listed={line.split('  ',1)[1] for line in Path('CHECKSUMS.sha256').read_text().splitlines() if line.strip()}
root=Path('.')
actual=package_files(root)
assert listed == actual, {'unlisted': sorted(actual-listed), 'missing': sorted(listed-actual)}
with TemporaryDirectory() as temporary:
    probe=Path(temporary)
    (probe / 'CHECKSUMS.sha256').write_text('')
    (probe / 'unlisted').mkdir()
    (probe / 'unlisted' / 'CHECKSUMS.sha256').write_text('bypass probe')
    assert package_files(probe) == {'unlisted/CHECKSUMS.sha256'}
print('GIT_WATCH_R58_LEDGER_COVERAGE=PASS')
print('GIT_WATCH_R58_NESTED_LEDGER_REJECTION=PASS')
PY
shasum -a 256 -c CHECKSUMS.sha256
node --check payload/dashboard/dist/index.js
node tests/test_renderer_r58.js payload/dashboard/dist/index.js
node tests/test_visual_r58.js
node tests/test_renderer_regression.js payload/dashboard/dist/index.js tests/github-comments-checker-v27-review.sh payload/dashboard/plugin_api.py
python - <<'PY'
from pathlib import Path
path=Path('payload/dashboard/plugin_api.py')
compile(path.read_text(encoding='utf-8'), str(path), 'exec')
print('GIT_WATCH_R58_API_SYNTAX=PASS')
PY
GIT_WATCH_API_PATH="$PACKAGE_DIR/payload/dashboard/plugin_api.py" python -m unittest discover -s tests -p 'test_bulk_api.py' -v
bash tests/test_installer_r58.sh
bash -n INSTALL.command
bash -n tests/github-comments-checker-v27-review.sh
echo "GIT_WATCH_R58_PACKAGE_VERIFICATION=PASS"
