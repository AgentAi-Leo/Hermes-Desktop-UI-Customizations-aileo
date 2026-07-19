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
MANIFEST_SOURCE="$PACKAGE_DIR/manifest.json"
LAUNCH_ROOT="$HOME/.hermes/plugins/git-comments-v27-review/dashboard"
PROFILE_ROOT="$HOME/.hermes/profiles/$PROFILE/plugins/git-comments-v27-review/dashboard"
LAUNCH_DEST="$LAUNCH_ROOT/dist/index.js"
PROFILE_DEST="$PROFILE_ROOT/dist/index.js"
LAUNCH_API="$LAUNCH_ROOT/plugin_api.py"
PROFILE_API="$PROFILE_ROOT/plugin_api.py"
LAUNCH_MANIFEST="$LAUNCH_ROOT/manifest.json"
PROFILE_MANIFEST="$PROFILE_ROOT/manifest.json"
LAUNCH_DATA="$LAUNCH_ROOT/data"
PROFILE_DATA="$PROFILE_ROOT/data"
LAUNCH_CHECKER="$HOME/.hermes/scripts/github-comments-checker-v27-review.sh"
PROFILE_CHECKER="$HOME/.hermes/profiles/$PROFILE/scripts/github-comments-checker-v27-review.sh"
PROD_LAUNCH="$HOME/.hermes/plugins/git-comments/dashboard/dist/index.js"
PROD_PROFILE="$HOME/.hermes/profiles/$PROFILE/plugins/git-comments/dashboard/dist/index.js"
PROD_LAUNCH_MANIFEST="$HOME/.hermes/plugins/git-comments/dashboard/manifest.json"
PROD_PROFILE_MANIFEST="$HOME/.hermes/profiles/$PROFILE/plugins/git-comments/dashboard/manifest.json"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/.hermes/backups/git-comments-v27-ui-refinements-$STAMP"
TOUCHED=0
GLOBAL_CHECKER_EXISTED=0

sha256_file() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
file_hash_or_missing() { [[ -f "$1" ]] && sha256_file "$1" || printf '%s' MISSING; }
set_manifest_label() {
  "$PY" - "$1" "$2" <<'PY'
import json, os, stat, sys, tempfile
from pathlib import Path
path = Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
data["label"] = sys.argv[2]
fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
try:
    os.fchmod(fd, stat.S_IMODE(path.stat().st_mode))
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)
finally:
    if os.path.exists(temporary):
        os.unlink(temporary)
PY
}

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
    cp "$BACKUP/launch-manifest.json" "$LAUNCH_MANIFEST"
    cp "$BACKUP/profile-manifest.json" "$PROFILE_MANIFEST"
    if [[ -f "$BACKUP/prod-launch-manifest.json" ]]; then cp "$BACKUP/prod-launch-manifest.json" "$PROD_LAUNCH_MANIFEST"; fi
    if [[ -f "$BACKUP/prod-profile-manifest.json" ]]; then cp "$BACKUP/prod-profile-manifest.json" "$PROD_PROFILE_MANIFEST"; fi
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

for required in "$PY" "$SOURCE" "$CHECKER_SOURCE" "$API_SOURCE" "$MANIFEST_SOURCE" "$PACKAGE_DIR/CHECKSUMS.sha256" "$LAUNCH_DEST" "$PROFILE_DEST" "$LAUNCH_API" "$PROFILE_API" "$LAUNCH_MANIFEST" "$PROFILE_MANIFEST" "$PROFILE_CHECKER" "$LAUNCH_DATA" "$PROFILE_DATA" "$PREVIEW/hermes_cli/web_dist/index.html"; do
  [[ -e "$required" ]] || { echo "Missing required path: $required" >&2; exit 1; }
done
[[ -x "$PY" ]] || { echo "Hermes Python is not executable: $PY" >&2; exit 1; }
[[ -f "$PROD_LAUNCH_MANIFEST" || -f "$PROD_PROFILE_MANIFEST" ]] || { echo "Missing production git-comments manifest that owns the visible sidebar label" >&2; exit 1; }
(cd "$PACKAGE_DIR" && shasum -a 256 -c CHECKSUMS.sha256)

PROD_LAUNCH_BEFORE="$(file_hash_or_missing "$PROD_LAUNCH")"
PROD_PROFILE_BEFORE="$(file_hash_or_missing "$PROD_PROFILE")"

mkdir -p "$BACKUP" "$(dirname "$LAUNCH_CHECKER")"
cp "$LAUNCH_DEST" "$BACKUP/launch-index.js"
cp "$PROFILE_DEST" "$BACKUP/profile-index.js"
cp "$LAUNCH_API" "$BACKUP/launch-plugin-api.py"
cp "$PROFILE_API" "$BACKUP/profile-plugin-api.py"
cp "$LAUNCH_MANIFEST" "$BACKUP/launch-manifest.json"
cp "$PROFILE_MANIFEST" "$BACKUP/profile-manifest.json"
if [[ -f "$PROD_LAUNCH_MANIFEST" ]]; then cp "$PROD_LAUNCH_MANIFEST" "$BACKUP/prod-launch-manifest.json"; fi
if [[ -f "$PROD_PROFILE_MANIFEST" ]]; then cp "$PROD_PROFILE_MANIFEST" "$BACKUP/prod-profile-manifest.json"; fi
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
for destination in "$LAUNCH_MANIFEST" "$PROFILE_MANIFEST"; do
  temporary="$destination.tmp.$$"
  cp "$MANIFEST_SOURCE" "$temporary"
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
for destination in "$PROD_LAUNCH_MANIFEST" "$PROD_PROFILE_MANIFEST"; do
  [[ -f "$destination" ]] && set_manifest_label "$destination" "GIT WATCH"
done

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
assert any(p.get("name")=="git-comments-v27-review" and p.get("label")=="GIT WATCH" and p.get("tab",{}).get("path")=="/git-comments-v27-review" for p in plugins), plugins
assert any(p.get("name")=="git-comments" and p.get("label")=="GIT WATCH" for p in plugins), plugins
print("V27_CANDIDATE_AND_VISIBLE_PRODUCTION_MANIFESTS_DISCOVERED=PASS")'

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
curl -fsS "http://127.0.0.1:$PORT/dashboard-plugins/git-comments-v27-review/dist/index.js?ui=305" -o "$LIVE_BUNDLE"
"$PY" - "$LIVE_BUNDLE" "$LAUNCH_API" "$PROFILE_API" "$LAUNCH_CHECKER" "$PROFILE_CHECKER" <<'PY'
from pathlib import Path
import sys
source = Path(sys.argv[1]).read_text(encoding="utf-8")
required = [
    '.git-comments-health-dot.broken{background:#ef4444',
    '.git-comments-repo-line{display:flex',
    '.git-comments-repo-primary{font-size:20.8px;color:#fff;font-weight:900}',
    '.git-comments-number-link{font-size:25px',
    '.git-comments-issue-author{color:#9ca9bd;font-size:16px;font-weight:650;white-space:nowrap}',
    'className: "git-comments-issue-author" }, `by ${issueAuthor}`',
    '.git-comments-issue-title{display:block;color:#FFE6CB;font-size:24px;',
    '.git-comments-watch-state{font-size:18.75px;line-height:1.1;font-weight:800',
    '.git-comments-watch-state.open{color:#4ade80}',
    '.git-comments-watch-state.closed{color:#ef4444}',
    '.git-comments-watch-state.merged{color:#a78bfa}',
    'COMMENTS (${received.length})',
    '.git-comments-current-state,.git-comments-comment-label{display:inline-flex;align-items:center;justify-content:center;min-width:200px;width:auto;min-height:44px;box-sizing:border-box;padding:6.25px 16px;border-radius:999px;white-space:nowrap;flex:0 0 auto;font-size:15px;font-weight:850',
    '.git-comments-comment-label.open{border-color:#4ade80;color:#fff;background:#166534}',
    '.git-comments-comment-label.closed{border-color:#ef4444;color:#fff;background:#7f1d1d}',
    '.git-comments-comment-label.merged{border-color:#a78bfa;color:#fff;background:#5b21b6}',
    '.git-comments-current-state.open{border-color:#4ade80;color:#d1fae5;background:rgba(22,101,52,.25)}',
    '.git-comments-current-state.closed{border-color:#ef4444;color:#fecaca;background:rgba(127,29,29,.25)}',
    '.git-comments-current-state.merged{border-color:#a78bfa;color:#e9d5ff;background:rgba(91,33,182,.25)}',
    '.git-comments-status-cluster{display:flex;align-items:center;gap:12px;flex:0 0 auto;white-space:nowrap}',
    '.git-comments-health-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}',
    '.git-comments-button.export-html{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:54px;padding:0 24px;border:1px solid #FFE6CB;border-radius:0;background:#0b1324;color:#FFE6CB;font-size:18px;letter-spacing:.08em}',
    '.git-comments-issue-context-meta{display:flex;align-items:center;gap:12px;flex-wrap:nowrap;overflow-x:auto;color:#9ca9bd;font-size:14.95px}',
    '.git-comments-status-text{display:flex;align-items:center;min-height:44px;gap:12px;flex-wrap:nowrap;white-space:nowrap}',
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
    'if (event.key !== "Enter" || addOpen || busy || state.loading || archiveView || event.defaultPrevented',
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
    'className: "git-comments-panel-title", style: { fontSize: "26.4px", color: "#FFE6CB" } }, "*** WATCHED GITHUB ISSUES & PULL REQUESTS ***"',
    'className: "git-comments-panel-title", style: { color: "#22d3ee" }',
    'duplicateWatchId(url, active, archived)',
    'health.status === "healthy"',
    '"WATCHER HEALTHY" : "BROKEN"',
    'new Set(["opened", "closed", "reopened", "labeled", "unlabeled"])',
    'aria-label": "Important GitHub status timeline"',
    'function issueStatus(issue)',
    'className: `git-comments-watch-state ${status}`',
    'className: "git-comments-event-label"',
    'className: "git-comments-button delete"',
    'mutate("/watchlist/delete", { id })',
    'className: "git-comments-button unarchive"',
    '"UNARCHIVE"',
    'Permanently delete this archived URL?',
    '.git-comments-issue-content{display:flex;align-items:flex-start;gap:12px;flex:1 1 720px;min-width:0}',
    '.git-comments-card-icon{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:0 0 32px;line-height:1;font-size:22px}',
    'className: "git-comments-card-icon", "aria-hidden": "true"',
    'showSuccess("URL ADDED SUCCESSFULLY!", 5000)',
    'className: `git-comments-success${successFading ? " fading" : ""}`, role: "status", "aria-live": "polite"',
    '`STATUS: ${currentState}`',
    'function exportStandaloneHtml()',
    'snapshot.querySelectorAll("button,.git-comments-panel-add,.git-comments-success,.git-comments-error")',
    'new window.Blob([html], { type: "text/html;charset=utf-8" })',
    'link.download = `git-watch-${exportedAt.toISOString().slice(0, 10)}.html`',
    '<title>GIT WATCH Export</title>',
    '"Loading GIT WATCH…"',
    '`GIT WATCH failed: ${state.error}`',
    '.git-comments-issue-avatar{width:40px;height:40px;',
    'className: "git-comments-issue-avatar", src: issue.author.avatar_url, alt: `${issueAuthor} profile picture`',
    'showSuccess("URL ADDED SUCCESSFULLY!", 5000)',
    'showSuccess("URL SUCCESSFULLY ARCHIVED!", 3000)',
    'window.setTimeout(() => setSuccessFading(true), successDuration)',
    'window.setTimeout(() => setActionSuccess(""), successDuration + 500)',
    '.git-comments-success.fading{opacity:0}',
    'className: `git-comments-success${successFading ? " fading" : ""}`',
    'className: "git-comments-button export-html"',
    'function DownloadIcon()',
    '"aria-label": "Download HTML"',
    'e(DownloadIcon), "HTML"',
    '.git-comments-button.view-archived{min-height:32px;padding:5px 11px;',
    'className: "git-comments-button view-archived"',
    'className: "git-comments-archive-modal", role: "dialog", "aria-modal": "true"',
    'className: "git-comments-button close-archive-view"',
    'window.addEventListener("keydown", closeArchiveViewOnEscape, true)',
    'event.stopImmediatePropagation()',
    'window.removeEventListener("keydown", closeArchiveViewOnEscape, true)',
    'fetchJSON(`${API}/watchlist/view-archived`',
    'snapshot: issue',
    'function archivedSummary(entry)',
    'title.split(" ").slice(0, 11)',
    'if (candidate.length > 65) break',
    '.git-comments-archived-summary{margin-top:7px;color:#22d3ee;font-size:15.6px;',
    'className: "git-comments-archived-content"',
    'className: "git-comments-archived-summary"',
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
issue_main = source.index('className: "git-comments-issue-main"')
issue_number = source.index('className: "git-comments-number-link"', issue_main)
issue_author = source.index('className: "git-comments-issue-author"', issue_number)
repo_line = source.index('className: "git-comments-repo-line"', issue_author)
watch_state = source.index('className: `git-comments-watch-state ${status}`', repo_line)
issue_title = source.index('className: "git-comments-issue-title"', watch_state)
context_row = source.index('className: "git-comments-issue-context-meta"', issue_title)
comment_pill = source.index('className: `git-comments-comment-label ${status}`', context_row)
status_cluster = source.index('className: "git-comments-status-cluster"', comment_pill)
current_state = source.index('className: `git-comments-current-state ${status}`', status_cluster)
status_text = source.index('className: "git-comments-status-text"', current_state)
updated = source.index('`Updated ${fmt(issue.updated_at)}`', status_text)
assert issue_main < issue_number < issue_author < repo_line < watch_state < issue_title < context_row < comment_pill < status_cluster < current_state < status_text < updated, "number/author first line, repository/WATCHING second line, then title; COMMENTS must sit left of one inline STATUS and metadata cluster"
assert 'alt: `${issueAuthor} profile picture` }) : null),\n          e("div", { className: "git-comments-repo-line" }' in source, "repository and WATCHING must be a separate line below issue number, author, and profile picture"
archived_map = source.index('archived.map((entry) =>')
archived_view = source.index('className: "git-comments-button view-archived"', archived_map)
archived_content = source.index('className: "git-comments-archived-content"', archived_view)
archived_primary = source.index('className: "git-comments-archived-primary"', archived_content)
archived_summary = source.index('className: "git-comments-archived-summary"', archived_primary)
archived_unarchive = source.index('className: "git-comments-button unarchive"', archived_summary)
archived_delete = source.index('className: "git-comments-button delete"', archived_unarchive)
assert archived_map < archived_view < archived_content < archived_primary < archived_summary < archived_unarchive < archived_delete, "VIEW must be far-left, followed by the two-line archive content, then UNARCHIVE and DELETE"
assert 'className: "git-comments-state-stack"' not in source, "old vertical state stack remains"
health_start = source.index('e("section", { className: "git-comments-health" }')
health_top = source.index('className: "git-comments-health-top"', health_start)
watched_start = source.index('e("section", { className: "git-comments-panel" }', health_start)
add_button = source.index('className: "git-comments-button add-toggle"')
health_title = source.index('className: "git-comments-health-title"', health_top)
export_button = source.index('className: "git-comments-button export-html"', health_title)
health_top_end = source.index('className: "git-comments-muted"', export_button)
assert health_start < health_top < health_title < export_button < health_top_end < watched_start < add_button, "export button must be top-right in the health header and add button in watched-panel heading"
for path in map(Path, sys.argv[2:4]):
    api = path.read_text(encoding="utf-8")
    assert '@router.post("/watchlist/delete")' in api, path
    assert 'for collection in ("active", "archived")' in api, path
    assert 'result["deleted_from"] = deleted_from' in api, path
    assert 'watchlist["active"].insert(0, entry)' in api, path
    assert '@router.post("/watchlist/view-archived")' in api, path
    assert 'entry["snapshot"] = _sanitize_snapshot(snapshot)' in api, path
    assert '"source": "github_live"' in api, path
for path in map(Path, sys.argv[4:6]):
    checker = path.read_text(encoding="utf-8")
    assert 'merged_at = (issue.get("pull_request") or {}).get("merged_at")' in checker, path
    assert '"merged_at": merged_at' in checker, path
    assert '"merged": bool(merged_at)' in checker, path
print("V27_UI_REFINEMENTS_LIVE_BUNDLE=PASS")
PY
rm -f "$LIVE_BUNDLE"

[[ "$(file_hash_or_missing "$PROD_LAUNCH")" == "$PROD_LAUNCH_BEFORE" ]] || { echo "Production launch-home Git Comments bundle changed" >&2; exit 1; }
[[ "$(file_hash_or_missing "$PROD_PROFILE")" == "$PROD_PROFILE_BEFORE" ]] || { echo "Production profile Git Comments bundle changed" >&2; exit 1; }

echo "PRODUCTION_GIT_COMMENTS_RUNTIME=UNTOUCHED"
echo "PRODUCTION_GIT_COMMENTS_SIDEBAR_LABEL=GIT WATCH"
echo "PRODUCTION_9119=NOT_RESTARTED"
echo "CANDIDATE_DATA_SOURCE=PROFILE_LINKED"
echo "BACKUP=$BACKUP"
echo "GIT_COMMENTS_V27_UI_REFINEMENTS=PASS"
open -a "Brave Browser" "http://127.0.0.1:$PORT/git-comments-v27-review?profile=$PROFILE&ui=305"
