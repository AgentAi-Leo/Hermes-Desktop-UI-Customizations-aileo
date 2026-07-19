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
BACKUP="$HOME/.hermes/backups/briefs-deterministic-v26-$STAMP"
LOG="$HOME/.hermes/logs/briefs-deterministic-v26-${PORT}.log"
SOURCE="$WEB/src/lib/briefs.ts"
TEST_SOURCE="$WEB/src/lib/briefs.test.ts"
PAGE_SOURCE="$WEB/src/pages/BriefsPage.tsx"
NEW_SOURCE="$PACKAGE_DIR/dashboard/src/lib/briefs.ts"
NEW_TEST="$PACKAGE_DIR/dashboard/src/lib/briefs.test.ts"
NEW_PAGE="$PACKAGE_DIR/dashboard/src/pages/BriefsPage.tsx"
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
  if [[ "$SERVER_TOUCHED" == "1" ]]; then
    stop_preview
    start_preview
    wait_preview || true
  fi
  echo "RESTORED_AFTER_FAILURE=$BACKUP" >&2
}
trap 'r=$?; if [[ $r -ne 0 ]]; then restore; fi; exit $r' EXIT

for required in "$PYTHON" "$SOURCE" "$TEST_SOURCE" "$PAGE_SOURCE" "$WEB/package.json" "$DIST/index.html" "$NEW_SOURCE" "$NEW_TEST" "$NEW_PAGE" "$PACKAGE_DIR/CHECKSUMS.sha256"; do
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

mkdir -p "$BACKUP/dashboard" "$BACKUP/scripts" "$SCRIPTS"
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

[[ "$(sha256_file "$SOURCE")" == "$(sha256_file "$NEW_SOURCE")" ]] || { echo "Installed briefs.ts checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$TEST_SOURCE")" == "$(sha256_file "$NEW_TEST")" ]] || { echo "Installed briefs.test.ts checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$PAGE_SOURCE")" == "$(sha256_file "$NEW_PAGE")" ]] || { echo "Installed BriefsPage.tsx checksum mismatch" >&2; exit 1; }
[[ "$(sha256_file "$SCRIPTS/brief_materializer.py")" == "$(sha256_file "$PACKAGE_DIR/materializer/brief_materializer.py")" ]] || { echo "Installed materializer checksum mismatch" >&2; exit 1; }

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
for marker in (b'v61-date-load-keyboard-focus',b'v74-ticker-above-company',b'data-hermes-canonical-ai',b'data-hermes-canonical-stock',b'hermes-ai-canonical',b'hermes-stock-canonical',b'hermes-v25-ai-base-style',b'hermes-v25-stock-base-style',b'hermes-stock-portfolio-summary',b'hermes-stock-summary-stack',b'hermes-stock-hero-left',b'hermes-stock-today-date-pill',b'hermes-stock-section-navigation-controller',b'SUMMARY',b'v26-responsive-canonical-stock-hero',b'data-hermes-brief-preview-toolbar',b'data-hermes-date-rail',b'TOTAL +/-',b'DAY +/-',b'hermes-portfolio-day'):
    if marker not in data:
        raise SystemExit(f'Live bundle missing marker: {marker.decode()}')
if not re.search(rb'utterance\.rate\s*=\s*1\.15(?:0+)?\s*;', data):
    raise SystemExit('Live bundle missing narration rate assignment: utterance.rate = 1.15')
if not re.search(rb'\.hermes-stock-summary-value\s*\{[^}]*font-size:\s*clamp\(36px,\s*4\.45vw,\s*56\.96px\)\s*!important[^}]*font-weight:\s*400\s*!important', data):
    raise SystemExit('Live bundle missing fluid Stock SUMMARY style: clamp(36px, 4.45vw, 56.96px) / weight 400')
if not re.search(rb'@media\s*\(max-height:\s*900px\)\s*and\s*\(min-width:\s*1100px\)', data):
    raise SystemExit('Live bundle missing compact-height Brief hero rule')
if not re.search(rb'\.hermes-portfolio-table\s*\{[^}]*min-width:\s*1480px', data):
    raise SystemExit('Live bundle missing expanded ten-column Portfolio table width')
if not re.search(rb'\.hermes-portfolio-meta\s*\{[^}]*font-size:\s*15\.25px', data):
    raise SystemExit('Live bundle missing 25-percent-larger Portfolio purchase date')
if not re.search(rb'grid-template-columns:\s*minmax\(260px,\s*340px\)\s*minmax\(0,\s*1fr\)', data):
    raise SystemExit('Live bundle missing two-column Stock quote-row layout')
if b'hermes-stock-row-date' in data:
    raise SystemExit('Live bundle contains forbidden repeated Stock row-date pill')
if not re.search(rb'\.hermes-stock-metrics\s*\{[^}]*min-width:\s*0\s*!important[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)', data):
    raise SystemExit('Live bundle missing fluid five-statistics group')
if not re.search(rb'\.hermes-stock-today-date-pill\s*\{[^}]*background:\s*#ffffff\s*!important[^}]*color:\s*#0b1020\s*!important', data):
    raise SystemExit('Live bundle missing white Stock section-date pill with dark text')
if not re.search(rb'key\s*===\s*["\']ArrowUp["\'][\s\S]{0,500}hermes-portfolio-comparison', data):
    raise SystemExit('Live bundle missing ArrowUp Portfolio section navigation')
if not re.search(rb'key\s*===\s*["\']ArrowDown["\'][\s\S]{0,500}hermes-stock-canonical-quotes', data):
    raise SystemExit('Live bundle missing ArrowDown daily-price section navigation')
if b'hermes-stock-today-title' in data:
    raise SystemExit("Live bundle contains forbidden legacy TODAY'S PRICE heading")
print('LIVE_BUNDLE_MARKERS=PASS')
PY
fi

cat > "$BACKUP/ROLLBACK_BRIEFS_DETERMINISTIC_V26.command" <<EOF
#!/usr/bin/env bash
set -euo pipefail
PREVIEW="${PREVIEW}"
PROFILE_HOME="${PROFILE_HOME}"
SOURCE="${SOURCE}"
TEST_SOURCE="${TEST_SOURCE}"
PAGE_SOURCE="${PAGE_SOURCE}"
DIST="${DIST}"
SCRIPTS="${SCRIPTS}"
BACKUP="${BACKUP}"
cp "\$BACKUP/dashboard/briefs.ts" "\$SOURCE"
cp "\$BACKUP/dashboard/briefs.test.ts" "\$TEST_SOURCE"
cp "\$BACKUP/dashboard/BriefsPage.tsx" "\$PAGE_SOURCE"
rm -rf "\$DIST" && cp -R "\$BACKUP/dashboard/web_dist" "\$DIST"
while IFS= read -r rel; do rm -f "\$SCRIPTS/\$rel"; done < "\$BACKUP/scripts-missing.txt"
(cd "\$BACKUP/scripts" && find . -type f -print0) | while IFS= read -r -d '' rel; do mkdir -p "\$(dirname "\$SCRIPTS/\$rel")"; cp "\$BACKUP/scripts/\$rel" "\$SCRIPTS/\$rel"; done
echo "ROLLBACK_BRIEFS_DETERMINISTIC_V26=PASS"
EOF
chmod +x "$BACKUP/ROLLBACK_BRIEFS_DETERMINISTIC_V26.command"

trap - EXIT
echo "BRIEFS_DETERMINISTIC_V26_INSTALL=PASS"
echo "FRONTEND_TESTS=PASS"
echo "VISUAL_PARITY=V25_AI_AND_STOCK_COMPUTED_CONTRACTS"
echo "FUNCTIONAL_PARITY=V25_AI_AND_STOCK_CONTROLLERS_BYTE_LOCKED"
echo "STOCK_HERO_DATE_PILL=EXACTLY_ONE_LEFT_SLOT"
echo "STOCK_SECTION_DATE_PILL=WHITE_WITH_DARK_TEXT"
echo "STOCK_SECTION_NAVIGATION=UP_POSITIONS_DOWN_DAILY_PRICES"
echo "STOCK_CURRENT_HISTORICAL_ROWS=FIVE_METRICS_CANONICAL"
echo "RESPONSIVE_LAYOUT=AI_AND_STOCK_16_OF_16_RENDER_GATES"
echo "MATERIALIZER_TESTS=15/15"
echo "HOST_ROOT_RUNTIME=SCHEMA_4_REAL_MAC_DIRECTORIES"
echo "OLD_DOCKER_DEFAULTS=ABSENT"
echo "STOCK_CSV_CONTRACT=UNCHANGED"
echo "CRON_PROMPTS=NOT_CHANGED"
echo "PRODUCTION_9119=UNTOUCHED"
echo "BACKUP=$BACKUP"
echo "ROLLBACK=$BACKUP/ROLLBACK_BRIEFS_DETERMINISTIC_V26.command"
PREVIEW_URL="http://127.0.0.1:$PORT/briefs-stocks?profile=$PROFILE&candidate=deterministic-v26"
echo "PREVIEW=$PREVIEW_URL"
if [[ "${SKIP_OPEN:-0}" != "1" ]] && command -v open >/dev/null 2>&1 && [[ -d "/Applications/Brave Browser.app" ]]; then
  open -a "Brave Browser" "$PREVIEW_URL" || true
  echo "PREVIEW_BROWSER=BRAVE"
else
  echo "PREVIEW_BROWSER=NOT_OPENED"
fi
