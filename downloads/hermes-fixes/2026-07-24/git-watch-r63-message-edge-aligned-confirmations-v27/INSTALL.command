#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="git-watch-r63-message-edge-aligned-confirmations-v27"
export PYTHONDONTWRITEBYTECODE=1
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${HERMES_HOME:-$HOME/.hermes}"
PROFILE="${HERMES_PROFILE:-local-ai-assist1}"
PY="${HERMES_PYTHON:-$ROOT/hermes-agent/venv/bin/python}"
SOURCE="$PACKAGE_DIR/payload/dashboard/dist/index.js"
API_SOURCE="$PACKAGE_DIR/payload/dashboard/plugin_api.py"
LAUNCH_ROOT="$ROOT/plugins/git-comments-v27-review/dashboard"
PROFILE_ROOT="$ROOT/profiles/$PROFILE/plugins/git-comments-v27-review/dashboard"
LAUNCH_RENDERER="$LAUNCH_ROOT/dist/index.js"
PROFILE_RENDERER="$PROFILE_ROOT/dist/index.js"
LAUNCH_API="$LAUNCH_ROOT/plugin_api.py"
PROFILE_API="$PROFILE_ROOT/plugin_api.py"
PROFILE_DATA="$PROFILE_ROOT/data"
STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP="$ROOT/profiles/$PROFILE/backups/$PACKAGE_NAME/$STAMP-install"
TOUCHED=0

sha256_file() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
tree_hash() {
  "$PY" - "$1" <<'PY'
from pathlib import Path
import hashlib, sys
root=Path(sys.argv[1])
h=hashlib.sha256()
for path in sorted((p for p in root.rglob('*') if p.is_file()), key=lambda p: str(p.relative_to(root))):
    rel=str(path.relative_to(root)).encode()
    h.update(len(rel).to_bytes(8,'big')); h.update(rel)
    data=path.read_bytes(); h.update(len(data).to_bytes(8,'big')); h.update(data)
print(h.hexdigest())
PY
}

restore_failure() {
  set +e
  if [[ "$TOUCHED" == "1" ]]; then
    if ! (cd "$BACKUP" && shasum -a 256 -c BACKUP-CHECKSUMS.sha256 >/dev/null); then
      echo "GIT_WATCH_R63_RESTORE_FAILED=backup-integrity" >&2
      return 1
    fi
    local failed=0 src dest temporary
    for pair in "$BACKUP/launch-index.js|$LAUNCH_RENDERER" "$BACKUP/profile-index.js|$PROFILE_RENDERER" "$BACKUP/launch-plugin-api.py|$LAUNCH_API" "$BACKUP/profile-plugin-api.py|$PROFILE_API"; do
      src="${pair%%|*}"; dest="${pair#*|}"; temporary="$dest.restore.$$"
      cp "$src" "$temporary" && mv -f "$temporary" "$dest" || { failed=1; rm -f "$temporary"; }
    done
    if [[ "$failed" != "0" ]]; then
      echo "GIT_WATCH_R63_RESTORE_FAILED=copy" >&2
      return 1
    fi
    echo "GIT_WATCH_R63_RESTORED_AFTER_FAILURE=$BACKUP" >&2
  fi
}
trap 'status=$?; if [[ $status -ne 0 ]]; then restore_failure || true; fi; exit $status' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for required in "$SOURCE" "$API_SOURCE" "$PACKAGE_DIR/CHECKSUMS.sha256" "$PY" "$LAUNCH_RENDERER" "$PROFILE_RENDERER" "$LAUNCH_API" "$PROFILE_API" "$PROFILE_DATA"; do
  [[ -e "$required" ]] || { echo "Missing required path: $required" >&2; exit 1; }
done
[[ -x "$PY" ]] || { echo "Hermes Python is not executable: $PY" >&2; exit 1; }
"$PY" "$PACKAGE_DIR/tests/package_surface.py" "$PACKAGE_DIR"
(cd "$PACKAGE_DIR" && \
shasum -a 256 -c CHECKSUMS.sha256)
"$PY" - "$SOURCE" "$API_SOURCE" <<'PY'
from pathlib import Path
import sys
renderer=Path(sys.argv[1]).read_text(encoding='utf-8')
api=Path(sys.argv[2]).read_text(encoding='utf-8')
compile(api, sys.argv[2], 'exec')
required_renderer=[
    'function ActionConfirmModal',
    '.git-comments-action-backdrop{position:fixed;inset:0;',
    'className: "git-comments-archive-select"',
    '"SELECT ALL"', '"DESELECT ALL"', '"UNARCHIVE SELECTED"', '"DELETE SELECTED"',
    'mutate("/watchlist/bulk-archived", { action: dialog.action, ids: dialog.ids })',
    'const ids = [...selectedArchivedIds]',
    'inert: actionDialog ? "inert" : undefined',
    'event.key !== "Tab"',
    '<meta name="git-watch-export-version" content="63">',
    '<meta name="git-watch-visual-baseline" content="63">',
    'Export format 63 · Visual baseline 63',
    '.git-comments-action-modal{width:max-content;max-width:min(869px,calc(100vw - 64px));max-height:calc(100vh - 64px);overflow:auto;box-sizing:border-box;display:grid;grid-template-columns:max-content;border:1px solid #475569;border-radius:25px;',
    '@media(max-width:760px){.git-comments-archive-bulk-controls{align-items:stretch}.git-comments-archive-selected-count{width:100%}.git-comments-action-backdrop{padding:16px}.git-comments-action-modal{padding:22px}',
    'font-family:"Alumni Sans SC",sans-serif',
    '.git-comments-action-title{grid-column:1;margin:0;color:#FFE6CB;font-size:68px;font-weight:800;letter-spacing:.04em;white-space:nowrap}',
    '.git-comments-action-message{grid-column:1;grid-row:2;margin:14px 0 24px;color:#cbd5e1;font-size:44px;line-height:1.2;font-weight:800;letter-spacing:.04em;white-space:nowrap}',
    '.git-comments-action-modal.red .git-comments-action-message{font-size:32px}',
    '.git-comments-action-buttons{grid-column:1;grid-row:3;justify-self:end;display:flex;align-items:center;gap:24px}',
    '.git-comments-action-buttons .git-comments-button{min-height:76px;padding:16px 28px;border-radius:18px;font-family:"Alumni Sans SC",sans-serif;font-size:24px;font-weight:800;white-space:nowrap}',
    '.git-comments-archive-bulk-controls .git-comments-button.deselect-all{border-color:#facc15;background:#713f12;color:#fef3c7}',
    '.git-comments-archive-bulk-controls .git-comments-button.bulk-unarchive{border-color:#22c55e;background:#14532d;color:#f0fdf4}',
    'CONFIRMATION DIALOG TOKENS (Revision 63)',
    '// Archived restore/delete are intentionally selection-only; per-row mutation buttons were retired in Revision 56.',
    '.git-comments-archive-bulk-controls,.git-comments-archive-select,.git-comments-action-backdrop',
]
missing=[marker for marker in required_renderer if marker not in renderer]
assert not missing, missing
assert 'window.confirm(' not in renderer
for retired in ['className: "git-comments-archived-actions"', '.git-comments-archived-actions{', 'git-comments-button.unarchive', 'const unarchive = async (id)', 'const deleteArchived = (id, event)', 'kind: "delete-archived"', 'Export format 55 · Visual baseline 55', 'Export format 56 · Visual baseline 56', 'Export format 57 · Visual baseline 57', 'Export format 58 · Visual baseline 58', 'Export format 59 · Visual baseline 59', 'Export format 60 · Visual baseline 60', 'Export format 62 · Visual baseline 62', '.git-comments-action-modal{width:min(620px,calc(100vw - 32px));padding:22px}', '.git-comments-action-modal{width:min(620px,calc(100vw - 64px));', '.git-comments-action-modal{width:min(1440px', 'grid-template-columns:max-content max-content', '.git-comments-action-buttons{grid-column:2', '.git-comments-action-buttons{grid-column:1;grid-row:3;justify-self:start', '.git-comments-action-buttons{display:flex;align-items:center;justify-content:flex-end']:
    assert retired not in renderer, retired
assert '@router.post("/watchlist/bulk-archived")' in api
assert 'def bulk_archived_watch_urls' in api
print('GIT_WATCH_R63_INSTALL_MARKERS=PASS')
PY

mkdir -p "$BACKUP"
cp "$LAUNCH_RENDERER" "$BACKUP/launch-index.js"
cp "$PROFILE_RENDERER" "$BACKUP/profile-index.js"
cp "$LAUNCH_API" "$BACKUP/launch-plugin-api.py"
cp "$PROFILE_API" "$BACKUP/profile-plugin-api.py"
(cd "$BACKUP" && shasum -a 256 launch-index.js profile-index.js launch-plugin-api.py profile-plugin-api.py > BACKUP-CHECKSUMS.sha256)
DATA_BEFORE="$(tree_hash "$PROFILE_DATA")"

cat > "$BACKUP/RESTORE_THIS_BACKUP.command" <<EOF
#!/usr/bin/env bash
set -euo pipefail
(cd "${BACKUP}" && shasum -a 256 -c BACKUP-CHECKSUMS.sha256)
for pair in "${BACKUP}/launch-index.js|${LAUNCH_RENDERER}" "${BACKUP}/profile-index.js|${PROFILE_RENDERER}" "${BACKUP}/launch-plugin-api.py|${LAUNCH_API}" "${BACKUP}/profile-plugin-api.py|${PROFILE_API}"; do
  src="\${pair%%|*}"; dest="\${pair#*|}"; temporary="\${dest}.restore.\$\$"
  cp "\$src" "\$temporary"; mv -f "\$temporary" "\$dest"
done
echo "GIT_WATCH_R63_BACKUP_RESTORE=PASS"
echo "RESTART_DASHBOARD_REQUIRED=1"
EOF
chmod 0755 "$BACKUP/RESTORE_THIS_BACKUP.command"

TOUCHED=1
for pair in "$SOURCE|$LAUNCH_RENDERER" "$SOURCE|$PROFILE_RENDERER" "$API_SOURCE|$LAUNCH_API" "$API_SOURCE|$PROFILE_API"; do
  src="${pair%%|*}"; dest="${pair#*|}"
  temporary="$dest.tmp.$$"
  cp "$src" "$temporary"
  chmod 0644 "$temporary"
  mv -f "$temporary" "$dest"
done

if [[ "${GIT_WATCH_R63_PAUSE_AFTER_RUNTIME:-0}" != "0" ]]; then
  [[ -z "${GIT_WATCH_R63_PAUSE_MARKER:-}" ]] || : > "$GIT_WATCH_R63_PAUSE_MARKER"
  sleep "$GIT_WATCH_R63_PAUSE_AFTER_RUNTIME"
fi

if [[ "${GIT_WATCH_R63_FAIL_AT:-}" == "after-runtime" ]]; then
  echo "Injected failure after runtime copy" >&2
  exit 91
fi

SOURCE_SHA="$(sha256_file "$SOURCE")"
API_SHA="$(sha256_file "$API_SOURCE")"
[[ "$(sha256_file "$LAUNCH_RENDERER")" == "$SOURCE_SHA" ]]
[[ "$(sha256_file "$PROFILE_RENDERER")" == "$SOURCE_SHA" ]]
[[ "$(sha256_file "$LAUNCH_API")" == "$API_SHA" ]]
[[ "$(sha256_file "$PROFILE_API")" == "$API_SHA" ]]
DATA_AFTER="$(tree_hash "$PROFILE_DATA")"
[[ "$DATA_AFTER" == "$DATA_BEFORE" ]] || { echo "Watchlist data changed during runtime install" >&2; exit 1; }

TOUCHED=0
trap - EXIT
echo "GIT_WATCH_R63_RUNTIME_INSTALL=PASS"
echo "WATCHLIST_DATA_PRESERVED=PASS"
echo "RENDERER_SHA256=$SOURCE_SHA"
echo "API_SHA256=$API_SHA"
echo "ROLLBACK=$BACKUP/RESTORE_THIS_BACKUP.command"
echo "RESTART_DASHBOARD_REQUIRED=1"
