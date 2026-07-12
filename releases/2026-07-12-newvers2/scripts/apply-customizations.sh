#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---dry-run}"
if [[ "$MODE" != "--dry-run" && "$MODE" != "--apply" ]]; then
  echo "Usage: bash /path/to/release/scripts/apply-customizations.sh [--dry-run|--apply]"
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PATCH_DIR="$RELEASE_DIR/patches"
MANIFEST="$RELEASE_DIR/manifest.json"
ROOT="$(pwd)"

if [[ ! -f "src/styles.css" ]]; then
  echo "Run this from Hermes Desktop apps/desktop (directory containing src/styles.css)."
  exit 1
fi
if [[ ! -d "$PATCH_DIR" ]]; then
  echo "Patch directory not found: $PATCH_DIR"
  exit 1
fi

BACKUP_DIR=".hermes-ui-customization-backups/$(date +%Y-%m-%d-%H%M%S)"
export BACKUP_DIR MANIFEST

echo "Target: $ROOT"
echo "Release: $RELEASE_DIR"
echo "Mode: $MODE"

echo "Checking patches..."
shopt -s nullglob
patches=("$PATCH_DIR"/*.patch)
if [[ ${#patches[@]} -eq 0 ]]; then
  echo "No .patch files found in $PATCH_DIR"
  exit 1
fi
for patch in "${patches[@]}"; do
  echo "  dry-run $patch"
  git apply --check "$patch"
done

if [[ "$MODE" == "--dry-run" ]]; then
  echo "Dry-run succeeded. Re-run with --apply to modify files."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
python3 - <<'PY'
import json, pathlib, shutil, os
manifest = pathlib.Path(os.environ['MANIFEST'])
m=json.loads(manifest.read_text())
backup=pathlib.Path(os.environ['BACKUP_DIR'])
for rel in m.get('files', {}).keys():
    p=pathlib.Path(rel)
    if p.exists():
        dst=backup/p
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p,dst)
PY

for patch in "${patches[@]}"; do
  echo "  apply $patch"
  git apply "$patch"
done

cat > "$BACKUP_DIR/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(cd "$BACKUP_DIR/../.." && pwd)"
find "$BACKUP_DIR" -type f ! -name rollback.sh ! -name backup-manifest.json | while read -r f; do
  rel="${f#$BACKUP_DIR/}"
  mkdir -p "$(dirname "$rel")"
  cp -p "$f" "$rel"
done
ROLLBACK
chmod +x "$BACKUP_DIR/rollback.sh"

echo "Applied customizations. Backup: $BACKUP_DIR"
echo "Rollback: bash $BACKUP_DIR/rollback.sh"
echo "Next: npm run build && npm run builder -- --dir"
