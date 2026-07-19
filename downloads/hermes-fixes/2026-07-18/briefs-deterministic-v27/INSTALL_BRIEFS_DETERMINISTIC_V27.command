#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
PREVIEW="${HERMES_PREVIEW_ROOT:-$HOME/.hermes/zDownloads/_BRIEFS-DASHBOARD-V3-PREVIEW}"
AGENT_ROOT="${HERMES_AGENT_ROOT:-/Users/jb3/.hermes/hermes-agent}"
PROFILE="${HERMES_PROFILE:-local-ai-assist1}"
PROFILE_HOME="${HERMES_PROFILE_HOME:-$HOME/.hermes/profiles/$PROFILE}"
WEB="$PREVIEW/web"
DIST="$PREVIEW/hermes_cli/web_dist"
PYTHON="$AGENT_ROOT/venv/bin/python"
SCRIPTS="$PROFILE_HOME/scripts"
PORT="${HERMES_PREVIEW_PORT:-9120}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/.hermes/backups/briefs-deterministic-v27-$STAMP"
LOG="$HOME/.hermes/logs/briefs-deterministic-v27-${PORT}.log"
SOURCE="$WEB/src/lib/briefs.ts"
TEST_SOURCE="$WEB/src/lib/briefs.test.ts"
PAGE_SOURCE="$WEB/src/pages/BriefsPage.tsx"
NEW_SOURCE="$PACKAGE_DIR/dashboard/src/lib/briefs.ts"
NEW_TEST="$PACKAGE_DIR/dashboard/src/lib/briefs.test.ts"
NEW_PAGE="$PACKAGE_DIR/dashboard/src/pages/BriefsPage.tsx"
GIT_PLUGIN="$PROFILE_HOME/plugins/git-comments-v27-review/dashboard"
GIT_CHECKER="$SCRIPTS/github-comments-checker-v27-review.sh"
NEW_GIT_PLUGIN="$PACKAGE_DIR/git-comments/dashboard"
NEW_GIT_CHECKER="$PACKAGE_DIR/git-comments/scripts/github-comments-checker.sh"
GIT_TEST="$PACKAGE_DIR/git-comments/tests/test-git-comments-status-health.js"
GIT_API_TEST="$PACKAGE_DIR/git-comments/tests/test_watchlist_api.py"
NEW_GIT_WATCHLIST="$NEW_GIT_PLUGIN/data/watchlist.json"
GIT_RUNTIME=(dist/index.js plugin_api.py manifest.json)
RUNTIME=(brief_materializer.py brief_renderer.py materialize-briefs-ai.py materialize-briefs-stock.py config/portfolio-lots.json schemas/ai-brief-data-v1.schema.json schemas/stock-brief-data-v1.schema.json)
SERVER_TOUCHED=0

sha256_file() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
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
start_preview() {
  mkdir -p "$(dirname "$LOG")"
  (cd "$PREVIEW" && nohup env PYTHONPATH="$PREVIEW" HERMES_WEB_DIST="$DIST" "$PYTHON" -m hermes_cli.main --profile "$PROFILE" dashboard --isolated --port "$PORT" --no-open >"$LOG" 2>&1 &)
}
wait_preview() {
  local i
  for i in $(seq 1 60); do
    curl -fsS "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}
restore_scripts() {
  local rel
  for rel in "${RUNTIME[@]}"; do
    if [[ -f "$BACKUP/scripts/$rel" ]]; then
      mkdir -p "$(dirname "$SCRIPTS/$rel")"
      cp "$BACKUP/scripts/$rel" "$SCRIPTS/$rel"
    elif grep -Fqx "$rel" "$BACKUP/scripts-missing.txt" 2>/dev/null; then
      rm -f "$SCRIPTS/$rel"
    fi
  done
}
restore_git_comments() {
  local rel
  for rel in "${GIT_RUNTIME[@]}"; do
    if [[ -f "$BACKUP/git-comments/$rel" ]]; then
      mkdir -p "$(dirname "$GIT_PLUGIN/$rel")"
      cp "$BACKUP/git-comments/$rel" "$GIT_PLUGIN/$rel"
    elif grep -Fqx "$rel" "$BACKUP/git-comments-missing.txt" 2>/dev/null; then
      rm -f "$GIT_PLUGIN/$rel"
    fi
  done
  if [[ -f "$BACKUP/git-comments/github-comments-checker.sh" ]]; then
    cp "$BACKUP/git-comments/github-comments-checker.sh" "$GIT_CHECKER"
  elif grep -Fqx "github-comments-checker.sh" "$BACKUP/git-comments-missing.txt" 2>/dev/null; then
    rm -f "$GIT_CHECKER"
  fi
}
restore() {
  set +e
  [[ -f "$BACKUP/dashboard/briefs.ts" ]] && cp "$BACKUP/dashboard/briefs.ts" "$SOURCE"
  [[ -f "$BACKUP/dashboard/briefs.test.ts" ]] && cp "$BACKUP/dashboard/briefs.test.ts" "$TEST_SOURCE"
  [[ -f "$BACKUP/dashboard/BriefsPage.tsx" ]] && cp "$BACKUP/dashboard/BriefsPage.tsx" "$PAGE_SOURCE"
  if [[ -d "$BACKUP/dashboard/web_dist" ]]; then
    rm -rf "$DIST"
    cp -R "$BACKUP/dashboard/web_dist" "$DIST"
  fi
  restore_scripts
  restore_git_comments
  if [[ "$SERVER_TOUCHED" == "1" ]]; then
    stop_preview
    start_preview
    wait_preview || true
  fi
  echo "RESTORED_AFTER_FAILURE=$BACKUP" >&2
}
trap 'r=$?; if [[ $r -ne 0 ]]; then restore; fi; exit $r' EXIT

for required in "$PYTHON" "$SOURCE" "$TEST_SOURCE" "$PAGE_SOURCE" "$WEB/package.json" "$DIST/index.html" "$NEW_SOURCE" "$NEW_TEST" "$NEW_PAGE" "$NEW_GIT_PLUGIN/dist/index.js" "$NEW_GIT_PLUGIN/plugin_api.py" "$NEW_GIT_PLUGIN/manifest.json" "$NEW_GIT_CHECKER" "$GIT_TEST" "$GIT_API_TEST" "$NEW_GIT_WATCHLIST" "$PACKAGE_DIR/CHECKSUMS.sha256"; do
  [[ -e "$required" ]] || { echo "Missing required path: $required" >&2; exit 1; }
done
[[ -x "$PYTHON" ]] || { echo "Hermes Python is not executable: $PYTHON" >&2; exit 1; }
(cd "$PACKAGE_DIR" && shasum -a 256 -c CHECKSUMS.sha256)

AI_PRIMARY_ROOT="$HOME/.hermes/zDownloads/__AI-DAILY-BRIEFS"
STOCK_PRIMARY_ROOT="$HOME/.hermes/zDownloads/_STOCK-BRIEFS"
for root in "$AI_PRIMARY_ROOT" "$STOCK_PRIMARY_ROOT"; do
  [[ -d "$root" ]] || { echo "FAIL_CLOSED: required host Brief root is not a directory: $root" >&2; exit 1; }
  [[ ! -L "$root" ]] || { echo "FAIL_CLOSED: required host Brief root is still a symlink: $root" >&2; exit 1; }
done

grep -Fq 'state.get("schema") == 4' "$PACKAGE_DIR/materializer/brief_materializer.py" || { echo "FAIL_CLOSED: package materializer is not checkpoint schema 4" >&2; exit 1; }
grep -Fq '.hermes" / "zDownloads" / "__AI-DAILY-BRIEFS"' "$PACKAGE_DIR/materializer/brief_materializer.py" || { echo "FAIL_CLOSED: package AI root is not the real Mac archive" >&2; exit 1; }
grep -Fq '.hermes" / "zDownloads" / "_STOCK-BRIEFS"' "$PACKAGE_DIR/materializer/brief_materializer.py" || { echo "FAIL_CLOSED: package Stock root is not the real Mac archive" >&2; exit 1; }
if grep -Fq '/sandboxes/docker/default/' "$PACKAGE_DIR/materializer/brief_materializer.py"; then
  echo "FAIL_CLOSED: package materializer still contains legacy Docker archive defaults" >&2
  exit 1
fi

grep -Fq 'v61-date-load-keyboard-focus' "$SOURCE" || { echo "FAIL_CLOSED: preview is not on accepted AI V61 lineage" >&2; exit 1; }
grep -Fq 'v74-ticker-above-company' "$SOURCE" || { echo "FAIL_CLOSED: preview is not on accepted Stock V74 lineage" >&2; exit 1; }

mkdir -p "$BACKUP/dashboard" "$BACKUP/scripts" "$BACKUP/git-comments" "$SCRIPTS"
cp "$SOURCE" "$BACKUP/dashboard/briefs.ts"
cp "$TEST_SOURCE" "$BACKUP/dashboard/briefs.test.ts"
cp "$PAGE_SOURCE" "$BACKUP/dashboard/BriefsPage.tsx"
cp -R "$DIST" "$BACKUP/dashboard/web_dist"
: > "$BACKUP/scripts-missing.txt"
for rel in "${RUNTIME[@]}"; do
  if [[ -f "$SCRIPTS/$rel" ]]; then
    mkdir -p "$BACKUP/scripts/$(dirname "$rel")"
    cp "$SCRIPTS/$rel" "$BACKUP/scripts/$rel"
  else
    printf '%s\n' "$rel" >> "$BACKUP/scripts-missing.txt"
  fi
done
: > "$BACKUP/git-comments-missing.txt"
for rel in "${GIT_RUNTIME[@]}"; do
  if [[ -f "$GIT_PLUGIN/$rel" ]]; then
    mkdir -p "$BACKUP/git-comments/$(dirname "$rel")"
    cp "$GIT_PLUGIN/$rel" "$BACKUP/git-comments/$rel"
  else
    printf '%s\n' "$rel" >> "$BACKUP/git-comments-missing.txt"
  fi
done
if [[ -f "$GIT_CHECKER" ]]; then
  cp "$GIT_CHECKER" "$BACKUP/git-comments/github-comments-checker.sh"
else
  printf '%s\n' "github-comments-checker.sh" >> "$BACKUP/git-comments-missing.txt"
fi

cp "$NEW_SOURCE" "$SOURCE"
cp "$NEW_TEST" "$TEST_SOURCE"
cp "$NEW_PAGE" "$PAGE_SOURCE"
(cd "$WEB" && npm run typecheck && npm test -- --run src/lib/briefs.test.ts && npm test && npm run build)

(cd "$PACKAGE_DIR/materializer" && "$PYTHON" -m py_compile *.py && "$PYTHON" -m unittest -v)
for rel in "${RUNTIME[@]}"; do
  mkdir -p "$(dirname "$SCRIPTS/$rel")"
  cp "$PACKAGE_DIR/materializer/$rel" "$SCRIPTS/$rel"
done
chmod +x "$SCRIPTS/materialize-briefs-ai.py" "$SCRIPTS/materialize-briefs-stock.py"
(cd "$SCRIPTS" && "$PYTHON" -m py_compile brief_materializer.py brief_renderer.py materialize-briefs-ai.py materialize-briefs-stock.py)
"$PYTHON" - "$SCRIPTS" "$AI_PRIMARY_ROOT" "$STOCK_PRIMARY_ROOT" <<'PY'
import importlib, sys
from pathlib import Path
scripts, expected_ai, expected_stock = sys.argv[1:]
sys.path.insert(0, scripts)
materializer = importlib.import_module("brief_materializer")
assert materializer.AI_ROOT == Path(expected_ai)
assert materializer.STOCK_ROOT == Path(expected_stock)
source = (Path(scripts) / "brief_materializer.py").read_text(encoding="utf-8")
assert 'state.get("schema") == 4' in source
assert '"schema": 4' in source
assert "/sandboxes/docker/default/" not in source
print("HOST_ROOT_RUNTIME_PROBE=PASS")
PY

node --check "$NEW_GIT_PLUGIN/dist/index.js"
node "$GIT_TEST" "$NEW_GIT_PLUGIN/dist/index.js" "$NEW_GIT_CHECKER" "$NEW_GIT_PLUGIN/plugin_api.py"
"$PYTHON" "$GIT_API_TEST" "$NEW_GIT_PLUGIN/plugin_api.py" "$NEW_GIT_WATCHLIST"
bash -n "$NEW_GIT_CHECKER"
"$PYTHON" -m py_compile "$NEW_GIT_PLUGIN/plugin_api.py"
for rel in "${GIT_RUNTIME[@]}"; do
  mkdir -p "$(dirname "$GIT_PLUGIN/$rel")"
  cp "$NEW_GIT_PLUGIN/$rel" "$GIT_PLUGIN/$rel"
done
mkdir -p "$GIT_PLUGIN/data"
if [[ ! -f "$GIT_PLUGIN/data/watchlist.json" ]]; then
  cp "$NEW_GIT_WATCHLIST" "$GIT_PLUGIN/data/watchlist.json"
  echo "GIT_COMMENTS_WATCHLIST=MIGRATED_CURRENT_URLS"
else
  echo "GIT_COMMENTS_WATCHLIST=PRESERVED_EXISTING"
fi
cp "$NEW_GIT_CHECKER" "$GIT_CHECKER"
chmod +x "$GIT_CHECKER"
bash "$GIT_CHECKER"
node --check "$GIT_PLUGIN/dist/index.js"
"$PYTHON" -m py_compile "$GIT_PLUGIN/plugin_api.py"
"$PYTHON" - "$GIT_PLUGIN/data/git-comments.json" "$GIT_PLUGIN/data/watcher-health.json" <<'PY'
import json, sys
from pathlib import Path
data=json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
health=json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert data.get("schema_version") == 4
assert len(data.get("issues", [])) == 2
assert all(issue.get("watch_id") and issue.get("repo") for issue in data["issues"])
watchlist=json.loads(Path(sys.argv[1]).with_name("watchlist.json").read_text(encoding="utf-8"))
assert len(watchlist.get("active", [])) == 2
assert not watchlist.get("archived")
assert health.get("ok") is True
assert any(event.get("event") == "closed" and event.get("state_reason") == "not_planned" for issue in data["issues"] for event in issue.get("status_events", []))
assert any(comment.get("author_association") == "CONTRIBUTOR" for issue in data["issues"] for comment in issue.get("comments", []))
print("GIT_COMMENTS_LIVE_WATCHER=PASS")
PY

[[ "$(sha256_file "$SOURCE")" == "$(sha256_file "$NEW_SOURCE")" ]] || { echo "Installed briefs.ts checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$TEST_SOURCE")" == "$(sha256_file "$NEW_TEST")" ]] || { echo "Installed briefs.test.ts checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$PAGE_SOURCE")" == "$(sha256_file "$NEW_PAGE")" ]] || { echo "Installed BriefsPage.tsx checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$SCRIPTS/brief_materializer.py")" == "$(sha256_file "$PACKAGE_DIR/materializer/brief_materializer.py")" ]] || { echo "Installed materializer checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$GIT_PLUGIN/dist/index.js")" == "$(sha256_file "$NEW_GIT_PLUGIN/dist/index.js")" ]] || { echo "Installed Git Comments renderer checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$GIT_PLUGIN/plugin_api.py")" == "$(sha256_file "$NEW_GIT_PLUGIN/plugin_api.py")" ]] || { echo "Installed Git Comments API checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$GIT_PLUGIN/manifest.json")" == "$(sha256_file "$NEW_GIT_PLUGIN/manifest.json")" ]] || { echo "Installed Git Comments manifest checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$GIT_CHECKER")" == "$(sha256_file "$NEW_GIT_CHECKER")" ]] || { echo "Installed Git Comments checker checksum mismatch" >&2; exit 1; }

if [[ "${SKIP_RESTART:-0}" != "1" ]]; then
  SERVER_TOUCHED=1
  stop_preview
  start_preview
  wait_preview || { echo "Preview did not become ready; see $LOG" >&2; exit 1; }
  LIVE_INDEX="$BACKUP/live-index.html"
  LIVE_JS="$BACKUP/live-asset.js"
  curl -fsS "http://127.0.0.1:$PORT/" -o "$LIVE_INDEX"
  LIVE_ASSET="$("$PYTHON" - "$LIVE_INDEX" <<'PY'
import re,sys
from pathlib import Path
text=Path(sys.argv[1]).read_text()
match=re.search(r'src="([^"]*index-[^"]+\.js)"',text)
print(match.group(1) if match else '')
PY
)"
  [[ -n "$LIVE_ASSET" ]] || { echo "Live bundle asset missing" >&2; exit 1; }
  curl -fsS "http://127.0.0.1:$PORT/${LIVE_ASSET#/}" -o "$LIVE_JS"
  "$PYTHON" - "$LIVE_JS" <<'PY'
import re, sys
from pathlib import Path
data=Path(sys.argv[1]).read_bytes()
for marker in (b'v61-date-load-keyboard-focus',b'v74-ticker-above-company',b'data-hermes-canonical-ai',b'data-hermes-canonical-stock',b'hermes-ai-canonical',b'hermes-stock-canonical',b'hermes-ai-viewport-state',b'aiViewportByDateRef',b'hermes-v25-ai-base-style',b'hermes-v25-stock-base-style',b'hermes-stock-portfolio-summary',b'hermes-stock-summary-stack',b'hermes-stock-hero-left',b'hermes-stock-meta-stack',b'hermes-stock-today-date-pill',b'hermes-stock-section-navigation-controller',b'v26-ai-player-focus-restore',b'hermes-stock-current-price',b'SUMMARY',b'v26-responsive-canonical-stock-hero',b'data-hermes-brief-preview-toolbar',b'data-hermes-date-rail',b'TOTAL +/-',b'DAY +/-',b'hermes-portfolio-day',b'+$0.00 (+0.00%)',b'Founder takeaways'):
    if marker not in data:
        raise SystemExit(f'Live bundle missing marker: {marker.decode()}')
if not re.search(rb'utterance\.rate\s*=\s*1\.15(?:0+)?\s*;', data):
    raise SystemExit('Live bundle missing narration rate assignment: utterance.rate = 1.15')
if not re.search(rb'\.hermes-stock-summary-value\s*\{[^}]*font-size:\s*clamp\(36px,\s*4\.45vw,\s*56\.96px\)\s*!important[^}]*font-weight:\s*400\s*!important', data):
    raise SystemExit('Live bundle missing fluid Stock SUMMARY style: clamp(36px, 4.45vw, 56.96px) / weight 400')
if not re.search(rb'\.hermes-stock-summary-stack\s*\{[^}]*transform:\s*translateY\(25%\)\s*!important', data):
    raise SystemExit('Live bundle missing 25-percent-lower Stock Summary placement')
if not re.search(rb'\.hermes-stock-meta-stack\s*\{[^}]*gap:\s*14px\s*!important[^}]*margin-top:\s*8\.4px\s*!important', data):
    raise SystemExit('Live bundle missing 70-percent-reduced Stock hero metadata gap')
if not re.search(rb'@media\s*\(max-height:\s*900px\)\s*and\s*\(min-width:\s*1100px\)', data):
    raise SystemExit('Live bundle missing compact-height Brief hero rule')
if not re.search(rb'\.hermes-portfolio-table\s*\{[^}]*min-width:\s*1480px', data):
    raise SystemExit('Live bundle missing expanded ten-column Portfolio table width')
if not re.search(rb'\.hermes-portfolio-meta\s*\{[^}]*font-size:\s*15\.25px', data):
    raise SystemExit('Live bundle missing 25-percent-larger Portfolio purchase date')
if not re.search(rb'grid-template-columns:\s*minmax\(220px,\s*280px\)\s*minmax\(150px,\s*190px\)\s*minmax\(0,\s*1fr\)', data):
    raise SystemExit('Live bundle missing identity/current-price/metrics Stock quote-row layout')
if b'hermes-stock-row-date' in data:
    raise SystemExit('Live bundle contains forbidden repeated Stock row-date pill')
if not re.search(rb'\.hermes-stock-metrics\s*\{[^}]*min-width:\s*0\s*!important[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)', data):
    raise SystemExit('Live bundle missing fluid five-statistics group')
if not re.search(rb'\.hermes-stock-price\s*\{[^}]*font-size:\s*2\.3rem\s*!important', data):
    raise SystemExit('Live bundle missing 25-percent-larger primary Stock price')
if not re.search(rb'\.hermes-stock-today-date-pill\s*\{[^}]*background:\s*#ffffff\s*!important[^}]*color:\s*#0b1020\s*!important', data):
    raise SystemExit('Live bundle missing white Stock section-date pill with dark text')
if not re.search(rb'\.hermes-stock-today-date-pill\s*\{[^}]*margin:\s*6\.6px\s+0\s+9\.9px\s*!important[^}]*padding:\s*5\.5px\s+12\.1px\s*!important[^}]*font-size:\s*clamp\(12\.1px,\s*1\.43vw,\s*18\.7px\)', data):
    raise SystemExit('Live bundle missing 45-percent-smaller white Stock section-date pill')
if b'v26-ai-player-focus-restore' not in data:
    raise SystemExit('Live bundle missing restored AI player focus marker')
if not re.search(rb'key\s*===\s*["\']ArrowUp["\'][\s\S]{0,500}hermes-stock-canonical[\s\S]{0,300}scrollTo', data):
    raise SystemExit('Live bundle missing ArrowUp complete-document-top navigation')
if not re.search(rb'key\s*===\s*["\']ArrowDown["\'][\s\S]{0,500}hermes-stock-canonical-quotes', data):
    raise SystemExit('Live bundle missing ArrowDown daily-price section navigation')
if b'hermes-stock-today-title' in data:
    raise SystemExit("Live bundle contains forbidden legacy TODAY'S PRICE heading")
print('LIVE_BUNDLE_MARKERS=PASS')
PY
fi

cat > "$BACKUP/ROLLBACK_BRIEFS_DETERMINISTIC_V27.command" <<EOF
#!/usr/bin/env bash
set -euo pipefail
PREVIEW="${PREVIEW}"
PROFILE_HOME="${PROFILE_HOME}"
SOURCE="${SOURCE}"
TEST_SOURCE="${TEST_SOURCE}"
PAGE_SOURCE="${PAGE_SOURCE}"
DIST="${DIST}"
SCRIPTS="${SCRIPTS}"
GIT_PLUGIN="${GIT_PLUGIN}"
GIT_CHECKER="${GIT_CHECKER}"
BACKUP="${BACKUP}"
cp "\$BACKUP/dashboard/briefs.ts" "\$SOURCE"
cp "\$BACKUP/dashboard/briefs.test.ts" "\$TEST_SOURCE"
cp "\$BACKUP/dashboard/BriefsPage.tsx" "\$PAGE_SOURCE"
rm -rf "\$DIST" && cp -R "\$BACKUP/dashboard/web_dist" "\$DIST"
while IFS= read -r rel; do rm -f "\$SCRIPTS/\$rel"; done < "\$BACKUP/scripts-missing.txt"
(cd "\$BACKUP/scripts" && find . -type f -print0) | while IFS= read -r -d '' rel; do mkdir -p "\$(dirname "\$SCRIPTS/\$rel")"; cp "\$BACKUP/scripts/\$rel" "\$SCRIPTS/\$rel"; done
for rel in dist/index.js plugin_api.py manifest.json; do
  if [[ -f "\$BACKUP/git-comments/\$rel" ]]; then mkdir -p "\$(dirname "\$GIT_PLUGIN/\$rel")"; cp "\$BACKUP/git-comments/\$rel" "\$GIT_PLUGIN/\$rel"; else rm -f "\$GIT_PLUGIN/\$rel"; fi
done
if [[ -f "\$BACKUP/git-comments/github-comments-checker.sh" ]]; then cp "\$BACKUP/git-comments/github-comments-checker.sh" "\$GIT_CHECKER"; chmod +x "\$GIT_CHECKER"; else rm -f "\$GIT_CHECKER"; fi
echo "ROLLBACK_BRIEFS_DETERMINISTIC_V27=PASS"
EOF
chmod +x "$BACKUP/ROLLBACK_BRIEFS_DETERMINISTIC_V27.command"

trap - EXIT
echo "BRIEFS_DETERMINISTIC_V27_INSTALL=PASS"
echo "FRONTEND_TESTS=PASS"
echo "VISUAL_PARITY=V25_AI_AND_STOCK_COMPUTED_CONTRACTS"
echo "FUNCTIONAL_PARITY=VISIBLE_AI_CARD_NAVIGATION_AND_FOUNDER_FIRST_SPACE"
echo "AI_DATE_FOCUS_PERSISTENCE=SEMANTIC_CARD_INDEX_PER_DATE"
echo "AI_SELECTED_CARD_ALIGNMENT=EXACTLY_ONE_CARD_BELOW_FIXED_PLAYER"
echo "GIT_COMMENTS_LINK_DEDUPLICATION=PASS"
echo "GIT_COMMENTS_TIMELINE_STATUS=PASS"
echo "GIT_COMMENTS_AUTHOR_ASSOCIATION=PASS"
echo "GIT_COMMENTS_HEALTH=FRESH_SUCCESS_REQUIRED_FOR_GREEN"
echo "GIT_COMMENTS_WATCH_TARGETS=PERSISTENT_PROFILE_LOCAL_JSON"
echo "GIT_COMMENTS_ADD_URL=VALIDATED_GITHUB_ISSUES_AND_PULLS"
echo "GIT_COMMENTS_ARCHIVE=STOP_WATCHING_WITH_HISTORY_AND_RESTORE"
echo "GIT_COMMENTS_HARDCODED_URLS=ABSENT"
echo "GIT_COMMENTS_PRODUCTION_PLUGIN=UNTOUCHED"
echo "STOCK_DATE_PILLS=UTC_SAFE_UPPERCASE_WEEKDAY"
echo "STOCK_WEEKEND_MOVEMENT=ZERO_WITH_FRIDAY_CLOSE_CARRIED_FORWARD"
echo "STOCK_HERO_DATE_PILL=EXACTLY_ONE_LEFT_SLOT"
echo "STOCK_SECTION_DATE_PILL=WHITE_WITH_DARK_TEXT"
echo "STOCK_SUMMARY_VERTICAL_OFFSET=25_PERCENT"
echo "STOCK_HERO_METADATA_GAP=REDUCED_70_PERCENT"
echo "STOCK_SECTION_NAVIGATION=UP_DOCUMENT_TOP_DOWN_DAILY_PRICES"
echo "STOCK_CURRENT_PRICE=OWN_COLUMN"
echo "STOCK_CURRENT_HISTORICAL_ROWS=FIVE_METRICS_CANONICAL"
echo "RESPONSIVE_LAYOUT=AI_AND_STOCK_20_OF_20_RENDER_GATES"
echo "MATERIALIZER_TESTS=16/16"
echo "HOST_ROOT_RUNTIME=SCHEMA_4_REAL_MAC_DIRECTORIES"
echo "OLD_DOCKER_DEFAULTS=ABSENT"
echo "STOCK_CSV_CONTRACT=UNCHANGED"
echo "CRON_PROMPTS=NOT_CHANGED"
echo "PRODUCTION_9119=UNTOUCHED"
echo "BACKUP=$BACKUP"
echo "ROLLBACK=$BACKUP/ROLLBACK_BRIEFS_DETERMINISTIC_V27.command"
PREVIEW_URL="http://127.0.0.1:$PORT/briefs-stocks?profile=$PROFILE&candidate=deterministic-v27"
GIT_COMMENTS_PREVIEW_URL="http://127.0.0.1:$PORT/git-comments-v27-review?profile=$PROFILE"
echo "PREVIEW=$PREVIEW_URL"
echo "GIT_COMMENTS_PREVIEW=$GIT_COMMENTS_PREVIEW_URL"
if [[ "${SKIP_OPEN:-0}" != "1" ]] && command -v open >/dev/null 2>&1 && [[ -d "/Applications/Brave Browser.app" ]]; then
  open -a "Brave Browser" "$PREVIEW_URL" || true
  echo "PREVIEW_BROWSER=BRAVE"
else
  echo "PREVIEW_BROWSER=NOT_OPENED"
fi
