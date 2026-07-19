#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE="${HERMES_PROFILE:-local-ai-assist1}"
PORT="${HERMES_PREVIEW_PORT:-9120}"
PREVIEW="${HERMES_PREVIEW_ROOT:-$HOME/.hermes/zDownloads/_BRIEFS-DASHBOARD-V3-PREVIEW}"
PY="${HERMES_PYTHON:-$HOME/.hermes/hermes-agent/venv/bin/python}"
LOG="$HOME/.hermes/logs/git-comments-v27-ui-refinements-${PORT}.log"
SOURCE="$PACKAGE_DIR/git-comments-v27-review-index.js"
CHECKER_SOURCE="$PACKAGE_DIR/github-comments-checker-v27-review.sh"
API_SOURCE="$PACKAGE_DIR/plugin_api.py"
LAUNCH_ROOT="$HOME/.hermes/plugins/git-comments-v27-review/dashboard"
PROFILE_ROOT="$HOME/.hermes/profiles/$PROFILE/plugins/git-comments-v27-review/dashboard"
LAUNCH_DEST="$LAUNCH_ROOT/dist/index.js"
PROFILE_DEST="$PROFILE_ROOT/dist/index.js"
LAUNCH_API="$LAUNCH_ROOT/plugin_api.py"
PROFILE_API="$PROFILE_ROOT/plugin_api.py"
LAUNCH_DATA="$LAUNCH_ROOT/data"
PROFILE_DATA="$PROFILE_ROOT/data"
LAUNCH_CHECKER="$HOME/.hermes/scripts/github-comments-checker-v27-review.sh"
PROFILE_CHECKER="$HOME/.hermes/profiles/$PROFILE/scripts/github-comments-checker-v27-review.sh"
PROD_LAUNCH="$HOME/.hermes/plugins/git-comments/dashboard/dist/index.js"
PROD_PROFILE="$HOME/.hermes/profiles/$PROFILE/plugins/git-comments/dashboard/dist/index.js"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/.hermes/backups/git-comments-v27-ui-refinements-$STAMP"
TOUCHED=0
GLOBAL_CHECKER_EXISTED=0

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
    cp "$BACKUP/launch-plugin-api.py" "$LAUNCH_API"
    cp "$BACKUP/profile-plugin-api.py" "$PROFILE_API"
    cp "$BACKUP/profile-checker.sh" "$PROFILE_CHECKER"
    if [[ "$GLOBAL_CHECKER_EXISTED" == "1" ]]; then cp "$BACKUP/launch-checker.sh" "$LAUNCH_CHECKER"; else rm -f "$LAUNCH_CHECKER"; fi
    rm -rf "$PROFILE_DATA"
    cp -R "$BACKUP/profile-data" "$PROFILE_DATA"
    rm -rf "$LAUNCH_DATA"
    cp -R "$BACKUP/launch-data" "$LAUNCH_DATA"
    stop_preview
    start_preview
    wait_preview || true
    echo "RESTORED_AFTER_FAILURE=$BACKUP" >&2
  fi
}
trap 'r=$?; if [[ $r -ne 0 ]]; then restore; fi; exit $r' EXIT

for required in "$PY" "$SOURCE" "$CHECKER_SOURCE" "$API_SOURCE" "$PACKAGE_DIR/CHECKSUMS.sha256" "$LAUNCH_DEST" "$PROFILE_DEST" "$LAUNCH_API" "$PROFILE_API" "$PROFILE_CHECKER" "$LAUNCH_DATA" "$PROFILE_DATA" "$PREVIEW/hermes_cli/web_dist/index.html"; do
  [[ -e "$required" ]] || { echo "Missing required path: $required" >&2; exit 1; }
done
[[ -x "$PY" ]] || { echo "Hermes Python is not executable: $PY" >&2; exit 1; }
(cd "$PACKAGE_DIR" && shasum -a 256 -c CHECKSUMS.sha256)

PROD_LAUNCH_BEFORE="$(file_hash_or_missing "$PROD_LAUNCH")"
PROD_PROFILE_BEFORE="$(file_hash_or_missing "$PROD_PROFILE")"

mkdir -p "$BACKUP" "$(dirname "$LAUNCH_CHECKER")"
cp "$LAUNCH_DEST" "$BACKUP/launch-index.js"
cp "$PROFILE_DEST" "$BACKUP/profile-index.js"
cp "$LAUNCH_API" "$BACKUP/launch-plugin-api.py"
cp "$PROFILE_API" "$BACKUP/profile-plugin-api.py"
cp "$PROFILE_CHECKER" "$BACKUP/profile-checker.sh"
if [[ -f "$LAUNCH_CHECKER" ]]; then GLOBAL_CHECKER_EXISTED=1; cp "$LAUNCH_CHECKER" "$BACKUP/launch-checker.sh"; fi
cp -R "$PROFILE_DATA" "$BACKUP/profile-data"
cp -RL "$LAUNCH_DATA" "$BACKUP/launch-data"

for destination in "$LAUNCH_DEST" "$PROFILE_DEST"; do
  temporary="$destination.tmp.$$"
  cp "$SOURCE" "$temporary"
  chmod 0644 "$temporary"
  mv -f "$temporary" "$destination"
done
for destination in "$LAUNCH_API" "$PROFILE_API"; do
  temporary="$destination.tmp.$$"
  cp "$API_SOURCE" "$temporary"
  chmod 0644 "$temporary"
  mv -f "$temporary" "$destination"
done
for destination in "$PROFILE_CHECKER" "$LAUNCH_CHECKER"; do
  temporary="$destination.tmp.$$"
  cp "$CHECKER_SOURCE" "$temporary"
  chmod 0755 "$temporary"
  mv -f "$temporary" "$destination"
done
TOUCHED=1

rm -rf "$LAUNCH_DATA"
ln -s "$PROFILE_DATA" "$LAUNCH_DATA"
[[ "$(readlink "$LAUNCH_DATA")" == "$PROFILE_DATA" ]] || { echo "Candidate data-link verification failed" >&2; exit 1; }

"$LAUNCH_CHECKER"

stop_preview
start_preview
wait_preview || { echo "Preview $PORT did not become ready; see $LOG" >&2; exit 1; }

curl -fsS "http://127.0.0.1:$PORT/api/dashboard/plugins" |
"$PY" -c 'import json,sys
plugins=json.load(sys.stdin)
assert any(p.get("name")=="git-comments-v27-review" and p.get("tab",{}).get("path")=="/git-comments-v27-review" for p in plugins), plugins
print("V27_MANIFEST_DISCOVERED=PASS")'

"$PY" - "$PROFILE_DATA/git-comments.json" "$PROFILE_DATA/watcher-health.json" <<'PY'
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys
snapshot = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
health = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert health.get("ok") is True and not health.get("error"), health
checked_at = datetime.fromisoformat(str(health.get("checked_at") or "").replace("Z", "+00:00")).astimezone(timezone.utc)
assert datetime.now(timezone.utc) - checked_at <= timedelta(hours=6), health
issues = snapshot.get("issues") or []
assert issues, "no watched issues returned"
allowed = {"opened", "closed", "reopened", "labeled", "unlabeled"}
assert all({event.get("event") for event in issue.get("status_events", [])} <= allowed for issue in issues)
assert all(any(event.get("event") == "opened" for event in issue.get("status_events", [])) for issue in issues)
assert any(event.get("event") in {"labeled", "unlabeled"} and (event.get("label") or {}).get("name") for issue in issues for event in issue.get("status_events", []))
context_keys = {"title", "body", "state", "author", "created_at", "updated_at", "labels"}
assert all(context_keys <= set(issue) for issue in issues), "issue context fields missing"
assert all(issue.get("title") and (issue.get("author") or {}).get("login") and issue.get("created_at") and issue.get("updated_at") for issue in issues), "issue context not hydrated"
print("V27_PROFILE_HEALTH_LIFECYCLE_AND_CONTEXT=PASS")
PY

LIVE_BUNDLE="$(mktemp)"
trap 'r=$?; rm -f "$LIVE_BUNDLE"; if [[ $r -ne 0 ]]; then restore; fi; exit $r' EXIT
curl -fsS "http://127.0.0.1:$PORT/dashboard-plugins/git-comments-v27-review/dist/index.js?ui=291" -o "$LIVE_BUNDLE"
"$PY" - "$LIVE_BUNDLE" "$LAUNCH_API" "$PROFILE_API" <<'PY'
from pathlib import Path
import sys
source = Path(sys.argv[1]).read_text(encoding="utf-8")
required = [
    '.git-comments-health-dot.broken{background:#ef4444',
    '.git-comments-repo-line{display:flex',
    '.git-comments-repo-primary{font-size:20.8px;color:#fff;font-weight:900}',
    '.git-comments-number-link{font-size:25px',
    '.git-comments-watch-state{font-size:18.75px;line-height:1.1;font-weight:800',
    '.git-comments-watch-state.open{color:#4ade80}',
    '.git-comments-watch-state.closed{color:#a78bfa}',
    'COMMENTS (${received.length})',
    '.git-comments-current-state,.git-comments-comment-label{display:inline-flex;align-items:center;justify-content:center;width:160px;min-height:44px;box-sizing:border-box;padding:6.25px 12.5px;border-radius:999px;font-size:15px;font-weight:850',
    '.git-comments-state-stack{display:grid;gap:8px;flex:0 0 160px}',
    '.git-comments-comment-label.no-comments{border-color:#facc15;background:#ca8a04;color:#fff}',
    '.git-comments-comment-label.has-comments.open{border-color:#4ade80;background:#16a34a;color:#fff}',
    '.git-comments-comment-label.has-comments.closed{border-color:#a78bfa;background:#7c3aed;color:#fff}',
    '.git-comments-current-state.open{border-color:#4ade80;color:#fff;background:#123c2b}',
    '.git-comments-current-state.closed{border-color:#a78bfa;color:#fff;background:#2e2452}',
    '.git-comments-issue-context-meta{align-items:flex-start;color:#9ca9bd;font-size:14.95px}',
    '.git-comments-status-text{display:flex;align-items:center;min-height:44px;gap:12px;flex-wrap:wrap}',
    '.git-comments-button.add-toggle{border-color:#FFE6CB;background:#35291f;color:#FFE6CB}',
    '.git-comments-button.submit-add{border-color:#4ade80;background:#123c2b;color:#b7f7cc}',
    '.git-comments-button.cancel-add{border-color:#ef4444;background:#4a151b;color:#fecaca}',
    'if (event.key === "Escape")',
    'closeAddForm();',
    'if (event.key === "Enter" && String(event.target?.tagName || "").toUpperCase() === "INPUT")',
    'event.currentTarget.requestSubmit();',
    'className: "git-comments-add-form", onSubmit: addUrl, onKeyDown: addFormKeyDown',
    'window.addEventListener("keydown", launchAddOnEnter)',
    'window.removeEventListener("keydown", launchAddOnEnter)',
    'if (event.key !== "Enter" || addOpen || busy || state.loading || event.defaultPrevented',
    'event.metaKey || event.ctrlKey || event.altKey || event.shiftKey',
    'target.closest("a,button,input,textarea,select,[contenteditable=true]")',
    'setActionError(""); setAddOpen(true);',
    'className: "git-comments-panel-heading"',
    'className: "git-comments-panel-add"',
    '.git-comments-panel-heading .add-toggle{flex:0 0 auto;margin-right:28px}',
    'className: "git-comments-issue-title"',
    'className: "git-comments-issue-context-meta"',
    'className: "git-comments-issue-description"',
    '`Opened by ${issueAuthor}`',
    'className: "git-comments-summary", style: { fontWeight: 400 }',
    'className: "git-comments-kicker", style: { fontSize: "22.5px" }',
    'className: "git-comments-summary-commented", style: { color: "#4ade80" }',
    'className: "git-comments-summary-archived", style: { color: "#22d3ee" }',
    '.git-comments-button.archive{margin-left:auto;border-color:#22d3ee;background:#083344;color:#cffafe}',
    'className: "git-comments-panel-title", style: { fontSize: "26.4px", color: "#FFE6CB" } }, "/// WATCHED GITHUB ISSUES & PULL REQUESTS ///"',
    'className: "git-comments-panel-title", style: { color: "#22d3ee" }',
    'duplicateWatchId(url, active, archived)',
    'health.status === "healthy"',
    '"WATCHER HEALTHY" : "BROKEN"',
    'new Set(["opened", "closed", "reopened", "labeled", "unlabeled"])',
    'aria-label": "Important GitHub status timeline"',
    'className: `git-comments-watch-state ${String(issue.state || "").toLowerCase()}`',
    'className: "git-comments-event-label"',
    'className: "git-comments-button delete"',
    'mutate("/watchlist/delete", { id })',
]
for marker in required:
    assert marker in source, marker
assert source.index('comments.length ? e("div"') < source.index('visibleStatusEvents.length ? e("div"'), "timeline must follow comments"
for forbidden in ['View on GitHub', '✓ ARCHIVE', '💼 WATCHED GITHUB ISSUES & PULL REQUESTS']:
    assert forbidden not in source, forbidden
assert '`${received.length} received`' not in source, "redundant received count remains"
assert 'COMMENTS RECEIVED' not in source, "received text remains in comment pill"
assert 'className: "git-comments-current-labels"' not in source, "duplicated current-label row remains"
assert 'className: "git-comments-current-label"' not in source, "duplicated current-label pills remain"
assert 'className: "git-comments-issue-meta"' not in source, "old separate comments row remains"
repo_line = source.index('className: "git-comments-repo-line"')
watch_state = source.index('className: `git-comments-watch-state ${String(issue.state || "").toLowerCase()}`', repo_line)
issue_title = source.index('className: "git-comments-issue-title"', watch_state)
context_row = source.index('className: "git-comments-issue-context-meta"', issue_title)
state_stack = source.index('className: "git-comments-state-stack"', context_row)
current_state = source.index('className: `git-comments-current-state ${String(issue.state || "").toLowerCase()}`', state_stack)
comment_pill = source.index('className: `git-comments-comment-label ${received.length > 0 ? `has-comments ${String(issue.state || "").toLowerCase()}` : "no-comments"}`', current_state)
status_text = source.index('className: "git-comments-status-text"', comment_pill)
updated = source.index('`Updated ${fmt(issue.updated_at)}`', status_text)
assert repo_line < watch_state < issue_title < context_row < state_stack < current_state < comment_pill < status_text < updated, "metadata text must align with OPEN/CLOSED while comments remain below"
health_start = source.index('e("section", { className: "git-comments-health" }')
watched_start = source.index('e("section", { className: "git-comments-panel" }', health_start)
add_button = source.index('className: "git-comments-button add-toggle"')
assert watched_start < add_button, "Add URL button is still in the Watcher Health card"
for path in map(Path, sys.argv[2:4]):
    api = path.read_text(encoding="utf-8")
    assert '@router.post("/watchlist/delete")' in api, path
print("V27_UI_REFINEMENTS_LIVE_BUNDLE=PASS")
PY
rm -f "$LIVE_BUNDLE"

[[ "$(file_hash_or_missing "$PROD_LAUNCH")" == "$PROD_LAUNCH_BEFORE" ]] || { echo "Production launch-home Git Comments bundle changed" >&2; exit 1; }
[[ "$(file_hash_or_missing "$PROD_PROFILE")" == "$PROD_PROFILE_BEFORE" ]] || { echo "Production profile Git Comments bundle changed" >&2; exit 1; }

echo "PRODUCTION_GIT_COMMENTS=UNTOUCHED"
echo "PRODUCTION_9119=NOT_RESTARTED"
echo "CANDIDATE_DATA_SOURCE=PROFILE_LINKED"
echo "BACKUP=$BACKUP"
echo "GIT_COMMENTS_V27_UI_REFINEMENTS=PASS"
open -a "Brave Browser" "http://127.0.0.1:$PORT/git-comments-v27-review?profile=$PROFILE&ui=291"
