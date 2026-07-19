#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE="${HERMES_PROFILE:-local-ai-assist1}"
PORT="${HERMES_PREVIEW_PORT:-9120}"
PREVIEW="${HERMES_PREVIEW_ROOT:-$HOME/.hermes/zDownloads/_BRIEFS-DASHBOARD-V3-PREVIEW}"
PY="${HERMES_PYTHON:-$HOME/.hermes/hermes-agent/venv/bin/python}"
LOG="$HOME/.hermes/logs/git-comments-v27-ui-refinements-${PORT}.log"
SOURCE="$PACKAGE_DIR/git-comments-v27-review-index.js"
LAUNCH_DEST="$HOME/.hermes/plugins/git-comments-v27-review/dashboard/dist/index.js"
PROFILE_DEST="$HOME/.hermes/profiles/$PROFILE/plugins/git-comments-v27-review/dashboard/dist/index.js"
PROD_LAUNCH="$HOME/.hermes/plugins/git-comments/dashboard/dist/index.js"
PROD_PROFILE="$HOME/.hermes/profiles/$PROFILE/plugins/git-comments/dashboard/dist/index.js"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/.hermes/backups/git-comments-v27-ui-refinements-$STAMP"
TOUCHED=0

sha256_file() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
file_hash_or_missing() { [[ -f "$1" ]] && sha256_file "$1" || printf '%s' MISSING; }

start_preview() {
  mkdir -p "$(dirname "$LOG")"
  PREVIEW="$PREVIEW" PY="$PY" PROFILE="$PROFILE" PORT="$PORT" LOG="$LOG" \
  "$PY" -c 'import os,subprocess
p=os.environ["PREVIEW"]; py=os.environ["PY"]; profile=os.environ["PROFILE"]; port=os.environ["PORT"]
env=os.environ.copy(); env["PYTHONPATH"]=p; env["HERMES_WEB_DIST"]=p+"/hermes_cli/web_dist"
log=open(os.environ["LOG"],"ab",buffering=0)
subprocess.Popen([py,"-m","hermes_cli.main","--profile",profile,"dashboard","--isolated","--port",port,"--no-open"],cwd=p,env=env,stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)'
}

stop_preview() {
  local pids i
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  [[ -z "$pids" ]] && return 0
  kill $pids 2>/dev/null || true
  for i in $(seq 1 50); do
    [[ -z "$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)" ]] && return 0
    sleep 0.1
  done
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  [[ -z "$pids" ]] || kill -9 $pids 2>/dev/null || true
}

wait_preview() {
  local i
  for i in $(seq 1 60); do
    curl -fsS "http://127.0.0.1:$PORT/api/dashboard/plugins" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

restore() {
  set +e
  if [[ "$TOUCHED" == "1" ]]; then
    cp "$BACKUP/launch-index.js" "$LAUNCH_DEST"
    cp "$BACKUP/profile-index.js" "$PROFILE_DEST"
    stop_preview
    start_preview
    wait_preview || true
    echo "RESTORED_AFTER_FAILURE=$BACKUP" >&2
  fi
}
trap 'r=$?; if [[ $r -ne 0 ]]; then restore; fi; exit $r' EXIT

for required in "$PY" "$SOURCE" "$PACKAGE_DIR/CHECKSUMS.sha256" "$LAUNCH_DEST" "$PROFILE_DEST" "$PREVIEW/hermes_cli/web_dist/index.html"; do
  [[ -e "$required" ]] || { echo "Missing required path: $required" >&2; exit 1; }
done
[[ -x "$PY" ]] || { echo "Hermes Python is not executable: $PY" >&2; exit 1; }
(cd "$PACKAGE_DIR" && shasum -a 256 -c CHECKSUMS.sha256)

PROD_LAUNCH_BEFORE="$(file_hash_or_missing "$PROD_LAUNCH")"
PROD_PROFILE_BEFORE="$(file_hash_or_missing "$PROD_PROFILE")"

mkdir -p "$BACKUP"
cp "$LAUNCH_DEST" "$BACKUP/launch-index.js"
cp "$PROFILE_DEST" "$BACKUP/profile-index.js"

for destination in "$LAUNCH_DEST" "$PROFILE_DEST"; do
  temporary="$destination.tmp.$$"
  cp "$SOURCE" "$temporary"
  chmod 0644 "$temporary"
  mv -f "$temporary" "$destination"
done
TOUCHED=1

stop_preview
start_preview
wait_preview || { echo "Preview 9120 did not become ready; see $LOG" >&2; exit 1; }

curl -fsS "http://127.0.0.1:$PORT/api/dashboard/plugins" |
"$PY" -c 'import json,sys
plugins=json.load(sys.stdin)
assert any(p.get("name")=="git-comments-v27-review" and p.get("tab",{}).get("path")=="/git-comments-v27-review" for p in plugins), plugins
print("V27_MANIFEST_DISCOVERED=PASS")'

LIVE_BUNDLE="$(mktemp)"
trap 'r=$?; rm -f "$LIVE_BUNDLE"; if [[ $r -ne 0 ]]; then restore; fi; exit $r' EXIT
curl -fsS "http://127.0.0.1:$PORT/dashboard-plugins/git-comments-v27-review/dist/index.js?ui=271" -o "$LIVE_BUNDLE"
"$PY" - "$LIVE_BUNDLE" <<'PY'
from pathlib import Path
import sys
source = Path(sys.argv[1]).read_text(encoding="utf-8")
required = [
    '.git-comments-repo-primary{color:#fff;font-weight:800}',
    '.git-comments-watch-state{font-size:15px',
    'className: "git-comments-number-link"',
    'className: `git-comments-health-dot',
    '"ARCHIVE")',
    'new Set(["labeled", "unlabeled"])',
]
for marker in required:
    assert marker in source, marker
for forbidden in ['View on GitHub', '✓ ARCHIVE', 'labelColor', 'item.label']:
    assert forbidden not in source, forbidden
print("V27_UI_REFINEMENTS_LIVE_BUNDLE=PASS")
PY
rm -f "$LIVE_BUNDLE"

[[ "$(file_hash_or_missing "$PROD_LAUNCH")" == "$PROD_LAUNCH_BEFORE" ]] || { echo "Production launch-home Git Comments bundle changed" >&2; exit 1; }
[[ "$(file_hash_or_missing "$PROD_PROFILE")" == "$PROD_PROFILE_BEFORE" ]] || { echo "Production profile Git Comments bundle changed" >&2; exit 1; }

echo "PRODUCTION_GIT_COMMENTS=UNTOUCHED"
echo "PRODUCTION_9119=NOT_RESTARTED"
echo "WATCHLIST_AND_WATCHER_DATA=UNTOUCHED"
echo "BACKUP=$BACKUP"
echo "GIT_COMMENTS_V27_UI_REFINEMENTS=PASS"
open -a "Brave Browser" "http://127.0.0.1:$PORT/git-comments-v27-review?profile=$PROFILE&ui=271"
