#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="${1:-}"
[[ -n "$MODE" ]] && shift || true
PROFILE="${HERMES_PROFILE:-local-ai-assist1}"
BACKUP_OVERRIDE=""
YES=0

usage() {
  printf '%s\n' \
    "Usage: three-gold-production-manager.sh audit|candidate-install|install|verify [--profile NAME] [--yes]" \
    "       three-gold-production-manager.sh rollback --backup PATH [--profile NAME] --yes"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="${2:-}"; shift 2 ;;
    --backup) BACKUP_OVERRIDE="${2:-}"; shift 2 ;;
    --yes) YES=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$MODE" in
  package-verify|audit|candidate-install|install|verify|rollback) ;;
  *) usage >&2; exit 2 ;;
esac
[[ "$PROFILE" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "Invalid profile name" >&2; exit 2; }
if [[ "$MODE" == "candidate-install" || "$MODE" == "install" || "$MODE" == "rollback" ]]; then
  [[ "$YES" == 1 ]] || { echo "Confirmation missing: pass --yes" >&2; exit 2; }
fi

HERMES_HOME="${THREE_GOLD_HERMES_HOME:-${HERMES_HOME:-$HOME/.hermes}}"
AGENT_ROOT="${THREE_GOLD_AGENT_ROOT:-$HERMES_HOME/hermes-agent}"
PYTHON="${THREE_GOLD_PYTHON:-$AGENT_ROOT/venv/bin/python}"
NPM="${THREE_GOLD_NPM:-npm}"
[[ -x "$PYTHON" ]] || PYTHON="$(command -v python3 || true)"
[[ -n "$PYTHON" && -x "$PYTHON" ]] || { echo "Python 3 is required" >&2; exit 1; }
if [[ "$PROFILE" == "default" ]]; then PROFILE_HOME="$HERMES_HOME"; else PROFILE_HOME="$HERMES_HOME/profiles/$PROFILE"; fi
LAUNCH_HOME="$HERMES_HOME"
PROFILE_CONFIG="$PROFILE_HOME/config.yaml"
SAME_PROFILE=0
[[ "$PROFILE_HOME" == "$LAUNCH_HOME" ]] && SAME_PROFILE=1

PAYLOAD="$PACKAGE_DIR/payload"
BRIEFS_PAYLOAD="$PAYLOAD/briefs"
GIT_PAYLOAD="$PAYLOAD/git-watch"
GOLD_PAYLOAD="$PAYLOAD/gold-masters"
SYSTEM_ROOT="$PROFILE_HOME/production-systems/HERMES-THREE-GOLD-PRODUCTION-FINAL-V1"
SEALED_GOLD="$SYSTEM_ROOT/gold-masters"
RECEIPT="$SYSTEM_ROOT/receipt.json"
SCRIPTS="$PROFILE_HOME/scripts"
PROFILE_PLUGIN_ROOT="$PROFILE_HOME/plugins/git-comments-v27-review"
PROFILE_PLUGIN="$PROFILE_PLUGIN_ROOT/dashboard"
PROFILE_CHECKER="$SCRIPTS/github-comments-checker-v27-review.sh"
LAUNCH_PLUGIN_ROOT="$LAUNCH_HOME/plugins/git-comments-v27-review"
LAUNCH_PLUGIN="$LAUNCH_PLUGIN_ROOT/dashboard"
LAUNCH_CHECKER="$LAUNCH_HOME/scripts/github-comments-checker-v27-review.sh"
LAUNCH_OWNER="$LAUNCH_PLUGIN_ROOT/.three-gold-owner.json"
AI_ARCHIVE="$HERMES_HOME/zDownloads/__AI-DAILY-BRIEFS"
STOCK_ARCHIVE="$HERMES_HOME/zDownloads/_STOCK-BRIEFS"
WEB="$AGENT_ROOT/web"
DIST="$AGENT_ROOT/hermes_cli/web_dist"
BUILD_DIST="${THREE_GOLD_BUILD_DIST:-$DIST}"
SOURCE="$WEB/src/lib/briefs.ts"
TEST_SOURCE="$WEB/src/lib/briefs.test.ts"
PAGE_SOURCE="$WEB/src/pages/BriefsPage.tsx"
WEB_SERVER="$AGENT_ROOT/hermes_cli/web_server.py"
BRIEFS_API_PATCHER="$BRIEFS_PAYLOAD/server/patch_briefs_api.py"
BRIEFS_API_FRAGMENT="$BRIEFS_PAYLOAD/server/briefs_api_block.pyfrag"
NEW_SOURCE="$BRIEFS_PAYLOAD/dashboard/src/lib/briefs.ts"
NEW_TEST_SOURCE="$BRIEFS_PAYLOAD/dashboard/src/lib/briefs.test.ts"
NEW_PAGE_SOURCE="$BRIEFS_PAYLOAD/dashboard/src/pages/BriefsPage.tsx"
STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP_ROOT="$PROFILE_HOME/backups/hermes-three-gold-production-final-v1"
BACKUP="${BACKUP_OVERRIDE:-$BACKUP_ROOT/$STAMP-$MODE}"
TOUCHED=0
RESTORING=0
INJECT_FAILURE_AFTER_RUNTIME="${THREE_GOLD_INJECT_FAILURE_AFTER_RUNTIME:-0}"
SKIP_BUILD="${THREE_GOLD_SKIP_BUILD:-0}"
SKIP_SOURCE_REQUIREMENTS="${THREE_GOLD_SKIP_SOURCE_REQUIREMENTS:-0}"
ALLOW_ARCHIVE_SYMLINKS="${THREE_GOLD_ALLOW_ARCHIVE_SYMLINKS:-0}"
MANAGE_LAUNCH_ROOT="${THREE_GOLD_MANAGE_LAUNCH_ROOT:-1}"

RUNTIME_FILES=(
  brief_materializer.py
  brief_renderer.py
  materialize-briefs-ai.py
  materialize-briefs-stock.py
  stock_quote_collector.py
  config/portfolio-lots.json
  schemas/ai-brief-data-v1.schema.json
  schemas/stock-brief-data-v1.schema.json
  prompts/ai-generator-prompt.md
  prompts/stock-generator-prompt.md
)

sha256_file() { "$PYTHON" - "$1" <<'PY'
import hashlib, sys
h=hashlib.sha256()
with open(sys.argv[1], 'rb') as f:
    for chunk in iter(lambda:f.read(1024*1024), b''): h.update(chunk)
print(h.hexdigest())
PY
}
verify_checksum_ledger() { "$PYTHON" - "$1" "$2" <<'PY'
import hashlib,sys
from pathlib import Path
ledger=Path(sys.argv[1]); root=Path(sys.argv[2]).resolve()
for number,line in enumerate(ledger.read_text(encoding='utf-8').splitlines(),1):
    if not line.strip(): continue
    try: want,rel=line.split('  ',1)
    except ValueError: raise SystemExit(f'INVALID_CHECKSUM_LINE={number}')
    candidate=(root/rel).resolve()
    try: candidate.relative_to(root)
    except ValueError: raise SystemExit(f'CHECKSUM_PATH_ESCAPES_ROOT={rel}')
    if not candidate.is_file(): raise SystemExit(f'CHECKSUM_FILE_MISSING={rel}')
    got=hashlib.sha256(candidate.read_bytes()).hexdigest()
    if got != want: raise SystemExit(f'CHECKSUM_MISMATCH={rel}')
PY
}
exists_even_symlink() { [[ -e "$1" || -L "$1" ]]; }
atomic_copy() {
  local source="$1" destination="$2"
  mkdir -p "$(dirname "$destination")"
  cp "$source" "$destination.tmp.$$"
  chmod --reference="$source" "$destination.tmp.$$" 2>/dev/null || true
  mv -f "$destination.tmp.$$" "$destination"
}

verify_package() {
  local required
  for required in \
    "$PACKAGE_DIR/PRODUCTION-MANIFEST.json" \
    "$PACKAGE_DIR/CHECKSUMS.sha256" \
    "$NEW_SOURCE" "$NEW_TEST_SOURCE" "$NEW_PAGE_SOURCE" \
    "$BRIEFS_API_PATCHER" "$BRIEFS_API_FRAGMENT" \
    "$BRIEFS_PAYLOAD/server/legacy_briefs_api_block.pyfrag" \
    "$GIT_PAYLOAD/dashboard/dist/index.js" \
    "$GIT_PAYLOAD/dashboard/plugin_api.py" \
    "$GIT_PAYLOAD/dashboard/manifest.json" \
    "$GIT_PAYLOAD/scripts/github-comments-checker-v27-review.sh" \
    "$GIT_PAYLOAD/data/watchlist.clean.json" \
    "$GOLD_PAYLOAD/briefs-ai-v34/CHECKSUMS.sha256" \
    "$GOLD_PAYLOAD/briefs-stocks-v34/CHECKSUMS.sha256" \
    "$GOLD_PAYLOAD/git-watch-r52/RELEASE-MANIFEST.json"; do
    [[ -f "$required" ]] || { echo "PACKAGE_MISSING=$required" >&2; return 1; }
  done
  verify_checksum_ledger "$PACKAGE_DIR/CHECKSUMS.sha256" "$PACKAGE_DIR"
  (cd "$GOLD_PAYLOAD/briefs-ai-v34" && bash VERIFY_BRIEFS_AI_V34.command </dev/null >/dev/null)
  (cd "$GOLD_PAYLOAD/briefs-stocks-v34" && bash VERIFY_BRIEFS_STOCKS_V34.command </dev/null >/dev/null)
  (cd "$GOLD_PAYLOAD/git-watch-r52" && bash 4_VERIFY_GIT_WATCH_PACKAGE.command </dev/null >/dev/null)
  node --check "$GIT_PAYLOAD/dashboard/dist/index.js" >/dev/null
  "$PYTHON" -m py_compile "$GIT_PAYLOAD/dashboard/plugin_api.py" "$BRIEFS_API_PATCHER"
  bash -n "$GIT_PAYLOAD/scripts/github-comments-checker-v27-review.sh"
  "$PYTHON" - "$PACKAGE_DIR/PRODUCTION-MANIFEST.json" "$PACKAGE_DIR" <<'PY'
import hashlib,json,sys
from pathlib import Path
manifest=json.loads(Path(sys.argv[1]).read_text())
root=Path(sys.argv[2])
for rel,want in manifest['components']['git_watch']['frozen_payload_sha256'].items():
    got=hashlib.sha256((root/rel).read_bytes()).hexdigest()
    assert got==want,(rel,got,want)
assert manifest['state_contract']['downloads_dependency'] is False
print('PINNED_COMPONENT_HASHES=PASS')
PY
  echo "THREE_GOLD_PACKAGE_VERIFICATION=PASS"
}

archive_status() {
  local label="$1" path="$2"
  if [[ -L "$path" ]]; then
    echo "${label}_ARCHIVE_KIND=SYMLINK"
    echo "${label}_ARCHIVE_TARGET=$(readlink "$path")"
    [[ "$ALLOW_ARCHIVE_SYMLINKS" == 1 ]] || return 3
  elif [[ -d "$path" ]]; then
    echo "${label}_ARCHIVE_KIND=REAL_DIRECTORY"
  elif [[ -e "$path" ]]; then
    echo "${label}_ARCHIVE_KIND=INVALID_NON_DIRECTORY"
    return 1
  else
    echo "${label}_ARCHIVE_KIND=MISSING"
    return 2
  fi
}

read_only_audit() {
  verify_package
  echo "PROFILE=$PROFILE"
  echo "PROFILE_HOME=$PROFILE_HOME"
  echo "AGENT_ROOT=$AGENT_ROOT"
  echo "AI_ARCHIVE=$AI_ARCHIVE"
  echo "STOCK_ARCHIVE=$STOCK_ARCHIVE"
  local archive_rc=0
  archive_status AI "$AI_ARCHIVE" || archive_rc=$?
  archive_status STOCKS "$STOCK_ARCHIVE" || archive_rc=$?
  for path in "$SOURCE" "$TEST_SOURCE" "$PAGE_SOURCE" "$WEB_SERVER" "$DIST/index.html"; do
    if [[ -e "$path" ]]; then echo "EXISTS=$path SHA256=$(sha256_file "$path")"; else echo "MISSING=$path"; fi
  done
  for path in "$PROFILE_PLUGIN/dist/index.js" "$PROFILE_PLUGIN/plugin_api.py" "$PROFILE_PLUGIN/manifest.json" "$PROFILE_CHECKER"; do
    if [[ -e "$path" ]]; then echo "EXISTS=$path SHA256=$(sha256_file "$path")"; else echo "MISSING=$path"; fi
  done
  if [[ $archive_rc -eq 3 ]]; then
    echo "AUDIT_REQUIRES_ARCHIVE_SYMLINK_DECISION=YES"
  elif [[ $archive_rc -ne 0 ]]; then
    echo "AUDIT_ARCHIVE_PREREQUISITES=FAILED"
  else
    echo "AUDIT_ARCHIVE_PREREQUISITES=PASS"
  fi
  echo "THREE_GOLD_READ_ONLY_AUDIT=PASS"
}

backup_one() {
  local source="$1" label="$2"
  mkdir -p "$BACKUP/state"
  if exists_even_symlink "$source"; then
    cp -a "$source" "$BACKUP/state/$label"
    printf '%s\n' "$label" >> "$BACKUP/present.txt"
  else
    printf '%s\n' "$label" >> "$BACKUP/missing.txt"
  fi
}
was_present() { grep -Fqx "$1" "$BACKUP/present.txt" 2>/dev/null; }
restore_one() {
  local destination="$1" label="$2"
  rm -rf "$destination"
  if was_present "$label"; then
    mkdir -p "$(dirname "$destination")"
    cp -a "$BACKUP/state/$label" "$destination"
  fi
}

restore_from_backup() {
  RESTORING=1
  restore_one "$SOURCE" dashboard-briefs-source
  restore_one "$TEST_SOURCE" dashboard-briefs-test
  restore_one "$PAGE_SOURCE" dashboard-briefs-page
  restore_one "$WEB_SERVER" dashboard-web-server
  restore_one "$DIST" dashboard-web-dist
  restore_one "$PROFILE_PLUGIN_ROOT" profile-git-watch-plugin
  restore_one "$PROFILE_CHECKER" profile-git-watch-checker
  restore_one "$PROFILE_CONFIG" profile-config
  restore_one "$SYSTEM_ROOT" production-system-root
  if [[ "$SAME_PROFILE" == 0 && "$MANAGE_LAUNCH_ROOT" == 1 ]]; then
    restore_one "$LAUNCH_PLUGIN_ROOT" launch-git-watch-plugin
    restore_one "$LAUNCH_CHECKER" launch-git-watch-checker
  fi
  local rel label
  for rel in "${RUNTIME_FILES[@]}"; do
    label="runtime-$(printf '%s' "$rel" | tr '/' '_')"
    restore_one "$SCRIPTS/$rel" "$label"
  done
  RESTORING=0
}

on_exit() {
  local status=$?
  if [[ $status -ne 0 && "$TOUCHED" == 1 && "$RESTORING" == 0 ]]; then
    echo "INSTALL_VERIFICATION_FAILED_RESTORING=$BACKUP" >&2
    restore_from_backup || true
    echo "THREE_GOLD_AUTOMATIC_ROLLBACK=PASS" >&2
  fi
  exit "$status"
}
trap on_exit EXIT

install_git_watch_runtime() {
  local root="$1"
  atomic_copy "$GIT_PAYLOAD/dashboard/dist/index.js" "$root/dist/index.js"
  atomic_copy "$GIT_PAYLOAD/dashboard/plugin_api.py" "$root/plugin_api.py"
  atomic_copy "$GIT_PAYLOAD/dashboard/manifest.json" "$root/manifest.json"
}
install_checker() {
  local destination="$1"
  atomic_copy "$GIT_PAYLOAD/scripts/github-comments-checker-v27-review.sh" "$destination"
  chmod 755 "$destination"
}
install_briefs_runtime() {
  atomic_copy "$NEW_SOURCE" "$SOURCE"
  atomic_copy "$NEW_TEST_SOURCE" "$TEST_SOURCE"
  atomic_copy "$NEW_PAGE_SOURCE" "$PAGE_SOURCE"
  local rel
  for rel in "${RUNTIME_FILES[@]}"; do
    atomic_copy "$BRIEFS_PAYLOAD/materializer/$rel" "$SCRIPTS/$rel"
  done
  chmod 755 "$SCRIPTS/materialize-briefs-ai.py" "$SCRIPTS/materialize-briefs-stock.py"
}
install_briefs_server() {
  "$PYTHON" "$BRIEFS_API_PATCHER" apply "$WEB_SERVER" "$BRIEFS_API_FRAGMENT"
}
verify_briefs_server() {
  "$PYTHON" "$BRIEFS_API_PATCHER" verify "$WEB_SERVER" "$BRIEFS_API_FRAGMENT"
  "$PYTHON" -m py_compile "$WEB_SERVER"
}
install_dashboard_dist() {
  [[ -f "$BUILD_DIST/index.html" ]] || { echo "DASHBOARD_BUILD_MISSING=$BUILD_DIST/index.html" >&2; return 1; }
  [[ "$BUILD_DIST" == "$DIST" ]] && return 0
  local staged="$AGENT_ROOT/hermes_cli/web_dist.tmp.$$"
  rm -rf "$staged"
  cp -a "$BUILD_DIST" "$staged"
  rm -rf "$DIST"
  mv "$staged" "$DIST"
}
verify_dashboard_dist() {
  [[ -f "$DIST/index.html" ]] || { echo "DEPLOYED_DASHBOARD_MISSING=$DIST/index.html" >&2; return 1; }
  if [[ "$BUILD_DIST" != "$DIST" && -d "$BUILD_DIST" ]]; then
    "$PYTHON" - "$BUILD_DIST" "$DIST" <<'PY'
import hashlib,sys
from pathlib import Path
left,right=map(Path,sys.argv[1:])
def ledger(root):
    return {p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
assert ledger(left)==ledger(right),'DEPLOYED_DASHBOARD_DIFFERS_FROM_BUILD'
PY
  elif [[ "$BUILD_DIST" != "$DIST" && "$SKIP_BUILD" != 1 ]]; then
    echo "DASHBOARD_BUILD_TREE_MISSING=$BUILD_DIST" >&2
    return 1
  fi
}
install_gold_masters() {
  local staged="$SYSTEM_ROOT/gold-masters.tmp.$$"
  rm -rf "$staged"
  mkdir -p "$staged"
  cp -a "$GOLD_PAYLOAD/briefs-ai-v34" "$staged/briefs-ai-v34"
  cp -a "$GOLD_PAYLOAD/briefs-stocks-v34" "$staged/briefs-stocks-v34"
  cp -a "$GOLD_PAYLOAD/git-watch-r52" "$staged/git-watch-r52"
  rm -rf "$SEALED_GOLD"
  mv "$staged" "$SEALED_GOLD"
}
ensure_git_watch_data() {
  local data="$PROFILE_PLUGIN/data" watchlist="$PROFILE_PLUGIN/data/watchlist.json"
  if [[ "$SAME_PROFILE" == 0 && "$MANAGE_LAUNCH_ROOT" == 1 && ! -e "$data" && -d "$LAUNCH_PLUGIN/data" && ! -L "$LAUNCH_PLUGIN/data" ]]; then
    mkdir -p "$PROFILE_PLUGIN"
    cp -a "$LAUNCH_PLUGIN/data" "$data"
  fi
  mkdir -p "$data"
  if [[ ! -f "$watchlist" ]]; then
    atomic_copy "$GIT_PAYLOAD/data/watchlist.clean.json" "$watchlist"
    echo "GIT_WATCH_DATA=CREATED_CLEAN"
  else
    echo "GIT_WATCH_DATA=PRESERVED_EXISTING"
  fi
  if [[ "$SAME_PROFILE" == 0 && "$MANAGE_LAUNCH_ROOT" == 1 ]]; then
    rm -rf "$LAUNCH_PLUGIN/data"
    ln -s "$data" "$LAUNCH_PLUGIN/data"
  fi
}


check_launch_root_ownership() {
  [[ "$SAME_PROFILE" == 1 || "$MANAGE_LAUNCH_ROOT" != 1 ]] && return 0
  "$PYTHON" - "$LAUNCH_PLUGIN_ROOT" "$LAUNCH_OWNER" "$PROFILE" "$PROFILE_PLUGIN/data" <<'PY'
import hashlib,json,sys
from pathlib import Path
root=Path(sys.argv[1]); owner_path=Path(sys.argv[2]); profile=sys.argv[3]; authoritative=Path(sys.argv[4])
if owner_path.exists():
    owner=json.loads(owner_path.read_text())
    if owner.get('profile') != profile:
        raise SystemExit(f"LAUNCH_ROOT_OWNED_BY_OTHER_PROFILE={owner.get('profile')}")
data=root/'dashboard'/'data'
if data.is_symlink() and data.resolve() != authoritative.resolve():
    raise SystemExit(f"LAUNCH_DATA_POINTS_TO_OTHER_PROFILE={data.resolve()}")
def digest_tree(path):
    h=hashlib.sha256()
    if not path.exists(): return None
    for item in sorted(p for p in path.rglob('*') if p.is_file()):
        h.update(item.relative_to(path).as_posix().encode()); h.update(b'\0'); h.update(item.read_bytes())
    return h.hexdigest()
if data.is_dir() and not data.is_symlink() and authoritative.is_dir():
    if digest_tree(data) != digest_tree(authoritative):
        raise SystemExit('UNOWNED_LAUNCH_DATA_CONFLICTS_WITH_PROFILE_DATA')
print('LAUNCH_ROOT_OWNERSHIP=PASS')
PY
}

claim_launch_root() {
  [[ "$SAME_PROFILE" == 1 || "$MANAGE_LAUNCH_ROOT" != 1 ]] && return 0
  mkdir -p "$LAUNCH_PLUGIN_ROOT"
  "$PYTHON" - "$LAUNCH_OWNER" "$PROFILE" <<'PY'
import json,os,sys,tempfile
from pathlib import Path
path=Path(sys.argv[1]); profile=sys.argv[2]
payload={'schema_version':1,'release':'HERMES-THREE-GOLD-PRODUCTION-FINAL-V1','profile':profile}
fd,tmp=tempfile.mkstemp(prefix=f'.{path.name}.',dir=str(path.parent))
try:
    with os.fdopen(fd,'w') as f:
        json.dump(payload,f,indent=2); f.write('\n'); f.flush(); os.fsync(f.fileno())
    os.replace(tmp,path)
finally:
    if os.path.exists(tmp): os.unlink(tmp)
PY
}

verify_backup_metadata() {
  [[ -d "$BACKUP" && ! -L "$BACKUP" ]] || { echo "ROLLBACK_BACKUP_INVALID=$BACKUP" >&2; return 1; }
  "$PYTHON" - "$BACKUP/BACKUP-METADATA.json" "$PROFILE" "$HERMES_HOME" "$AGENT_ROOT" <<'PY'
import json,sys
from pathlib import Path
path,profile,home,agent=sys.argv[1:]
data=json.loads(Path(path).read_text())
assert data['release']=='HERMES-THREE-GOLD-PRODUCTION-FINAL-V1'
assert data['profile']==profile
assert data['hermes_home']==home
assert data['agent_root']==agent
PY
}

ensure_plugin_enabled() {
  mkdir -p "$PROFILE_HOME"
  HERMES_HOME="$PROFILE_HOME" PYTHONPATH="$AGENT_ROOT${PYTHONPATH:+:$PYTHONPATH}" "$PYTHON" - "$PROFILE_CONFIG" <<'PY'
import os,sys,tempfile
from pathlib import Path
import yaml
try:
    from utils import atomic_yaml_write
except ImportError:
    def atomic_yaml_write(path,data,sort_keys=False):
        path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
        fd,tmp=tempfile.mkstemp(prefix=f'.{path.name}.',dir=str(path.parent))
        try:
            with os.fdopen(fd,'w',encoding='utf-8') as f:
                yaml.safe_dump(data,f,sort_keys=sort_keys)
                f.flush(); os.fsync(f.fileno())
            os.replace(tmp,path)
        finally:
            if os.path.exists(tmp): os.unlink(tmp)
path=Path(sys.argv[1])
if path.exists():
    data=yaml.safe_load(path.read_text(encoding='utf-8')) or {}
else:
    data={}
if not isinstance(data,dict):
    raise SystemExit('PROFILE_CONFIG_ROOT_MUST_BE_MAPPING')
plugins=data.setdefault('plugins',{})
if not isinstance(plugins,dict):
    raise SystemExit('PROFILE_CONFIG_PLUGINS_MUST_BE_MAPPING')
enabled=plugins.get('enabled',[])
if enabled is None: enabled=[]
if not isinstance(enabled,list):
    raise SystemExit('PROFILE_CONFIG_PLUGINS_ENABLED_MUST_BE_LIST')
if 'git-comments-v27-review' not in enabled:
    enabled.append('git-comments-v27-review')
plugins['enabled']=enabled
disabled=plugins.get('disabled',[])
if isinstance(disabled,list) and 'git-comments-v27-review' in disabled:
    plugins['disabled']=[x for x in disabled if x!='git-comments-v27-review']
atomic_yaml_write(path,data,sort_keys=False)
print('GIT_WATCH_PLUGIN_ALLOWLIST=ENABLED')
PY
}

verify_plugin_enabled() {
  "$PYTHON" - "$PROFILE_CONFIG" <<'PY'
import sys,yaml
from pathlib import Path
data=yaml.safe_load(Path(sys.argv[1]).read_text(encoding='utf-8')) or {}
plugins=data.get('plugins',{})
assert isinstance(plugins,dict)
assert 'git-comments-v27-review' in plugins.get('enabled',[])
assert 'git-comments-v27-review' not in plugins.get('disabled',[])
PY
}

verify_installed() {
  verify_package >/dev/null
  verify_briefs_server
  verify_dashboard_dist
  local source destination rel
  for pair in \
    "$NEW_SOURCE|$SOURCE" \
    "$NEW_TEST_SOURCE|$TEST_SOURCE" \
    "$NEW_PAGE_SOURCE|$PAGE_SOURCE" \
    "$GIT_PAYLOAD/dashboard/dist/index.js|$PROFILE_PLUGIN/dist/index.js" \
    "$GIT_PAYLOAD/dashboard/plugin_api.py|$PROFILE_PLUGIN/plugin_api.py" \
    "$GIT_PAYLOAD/dashboard/manifest.json|$PROFILE_PLUGIN/manifest.json" \
    "$GIT_PAYLOAD/scripts/github-comments-checker-v27-review.sh|$PROFILE_CHECKER"; do
    source="${pair%%|*}"; destination="${pair#*|}"
    cmp -s "$source" "$destination" || { echo "INSTALLED_HASH_MISMATCH=$destination" >&2; return 1; }
  done
  for rel in "${RUNTIME_FILES[@]}"; do
    cmp -s "$BRIEFS_PAYLOAD/materializer/$rel" "$SCRIPTS/$rel" || { echo "INSTALLED_HASH_MISMATCH=$SCRIPTS/$rel" >&2; return 1; }
  done
  for rel in briefs-ai-v34 briefs-stocks-v34 git-watch-r52; do
    [[ -d "$SEALED_GOLD/$rel" ]] || { echo "SEALED_GOLD_MISSING=$rel" >&2; return 1; }
  done
  (cd "$SEALED_GOLD/briefs-ai-v34" && bash VERIFY_BRIEFS_AI_V34.command </dev/null >/dev/null)
  (cd "$SEALED_GOLD/briefs-stocks-v34" && bash VERIFY_BRIEFS_STOCKS_V34.command </dev/null >/dev/null)
  (cd "$SEALED_GOLD/git-watch-r52" && bash 4_VERIFY_GIT_WATCH_PACKAGE.command </dev/null >/dev/null)
  node --check "$PROFILE_PLUGIN/dist/index.js" >/dev/null
  "$PYTHON" -m py_compile "$PROFILE_PLUGIN/plugin_api.py" "$SCRIPTS/brief_materializer.py" "$SCRIPTS/brief_renderer.py" "$SCRIPTS/materialize-briefs-ai.py" "$SCRIPTS/materialize-briefs-stock.py" "$SCRIPTS/stock_quote_collector.py"
  bash -n "$PROFILE_CHECKER"
  "$PYTHON" - "$PROFILE_PLUGIN/data/watchlist.json" "$RECEIPT" <<'PY'
import json,sys
from pathlib import Path
watch=json.loads(Path(sys.argv[1]).read_text())
assert watch.get('schema_version')==1
assert isinstance(watch.get('active'),list) and isinstance(watch.get('archived'),list)
receipt=json.loads(Path(sys.argv[2]).read_text())
assert receipt['release']=='HERMES-THREE-GOLD-PRODUCTION-FINAL-V1'
assert receipt['downloads_dependency'] is False
PY
  verify_plugin_enabled
  if [[ "$SAME_PROFILE" == 0 && "$MANAGE_LAUNCH_ROOT" == 1 ]]; then
    cmp -s "$PROFILE_PLUGIN/dist/index.js" "$LAUNCH_PLUGIN/dist/index.js"
    cmp -s "$PROFILE_PLUGIN/plugin_api.py" "$LAUNCH_PLUGIN/plugin_api.py"
    cmp -s "$PROFILE_PLUGIN/manifest.json" "$LAUNCH_PLUGIN/manifest.json"
    [[ -L "$LAUNCH_PLUGIN/data" ]]
    "$PYTHON" - "$LAUNCH_OWNER" "$PROFILE" <<'PY'
import json,sys
from pathlib import Path
assert json.loads(Path(sys.argv[1]).read_text())['profile']==sys.argv[2]
PY
  fi
  echo "THREE_GOLD_INSTALLED_VERIFICATION=PASS"
}

if [[ "$MODE" == "package-verify" ]]; then verify_package; exit 0; fi
if [[ "$MODE" == "audit" ]]; then read_only_audit; exit 0; fi
if [[ "$MODE" == "verify" ]]; then verify_installed; exit 0; fi
if [[ "$MODE" == "rollback" ]]; then
  [[ -n "$BACKUP_OVERRIDE" && -d "$BACKUP" ]] || { echo "ROLLBACK_BACKUP_NOT_FOUND=$BACKUP" >&2; exit 1; }
  verify_backup_metadata
  restore_from_backup
  echo "THREE_GOLD_ROLLBACK=PASS"
  echo "RESTORED_BACKUP=$BACKUP"
  exit 0
fi

verify_package
if [[ "$MODE" == "candidate-install" ]]; then
  [[ -n "${THREE_GOLD_HERMES_HOME:-}" && -n "${THREE_GOLD_AGENT_ROOT:-}" ]] || { echo "candidate-install requires THREE_GOLD_HERMES_HOME and THREE_GOLD_AGENT_ROOT" >&2; exit 2; }
fi
if [[ "$SKIP_SOURCE_REQUIREMENTS" != 1 ]]; then
  for path in "$SOURCE" "$TEST_SOURCE" "$PAGE_SOURCE" "$WEB_SERVER" "$WEB/package.json" "$DIST/index.html"; do
    [[ -e "$path" ]] || { echo "SOURCE_PREREQUISITE_MISSING=$path" >&2; exit 1; }
  done
fi
check_launch_root_ownership
archive_status AI "$AI_ARCHIVE" || archive_rc=$?
archive_rc="${archive_rc:-0}"
[[ "$archive_rc" == 0 ]] || { echo "AI_ARCHIVE_PREREQUISITE_FAILED=$archive_rc" >&2; exit 1; }
archive_status STOCKS "$STOCK_ARCHIVE" || archive_rc=$?
[[ "$archive_rc" == 0 ]] || { echo "STOCKS_ARCHIVE_PREREQUISITE_FAILED=$archive_rc" >&2; exit 1; }

[[ ! -L "$BACKUP_ROOT" ]] || { echo "BACKUP_ROOT_MUST_NOT_BE_SYMLINK=$BACKUP_ROOT" >&2; exit 1; }
mkdir -p "$BACKUP_ROOT"
[[ ! -e "$BACKUP" ]] || { echo "BACKUP_ALREADY_EXISTS=$BACKUP" >&2; exit 1; }
mkdir "$BACKUP"
: > "$BACKUP/present.txt"
: > "$BACKUP/missing.txt"
backup_one "$SOURCE" dashboard-briefs-source
backup_one "$TEST_SOURCE" dashboard-briefs-test
backup_one "$PAGE_SOURCE" dashboard-briefs-page
backup_one "$WEB_SERVER" dashboard-web-server
backup_one "$DIST" dashboard-web-dist
backup_one "$PROFILE_PLUGIN_ROOT" profile-git-watch-plugin
backup_one "$PROFILE_CHECKER" profile-git-watch-checker
backup_one "$PROFILE_CONFIG" profile-config
backup_one "$SYSTEM_ROOT" production-system-root
if [[ "$SAME_PROFILE" == 0 && "$MANAGE_LAUNCH_ROOT" == 1 ]]; then
  backup_one "$LAUNCH_PLUGIN_ROOT" launch-git-watch-plugin
  backup_one "$LAUNCH_CHECKER" launch-git-watch-checker
fi
for rel in "${RUNTIME_FILES[@]}"; do
  backup_one "$SCRIPTS/$rel" "runtime-$(printf '%s' "$rel" | tr '/' '_')"
done
"$PYTHON" - "$BACKUP/BACKUP-METADATA.json" "$PROFILE" "$HERMES_HOME" "$AGENT_ROOT" <<'PY'
import json,sys
from pathlib import Path
out,profile,home,agent=sys.argv[1:]
Path(out).write_text(json.dumps({'schema_version':1,'release':'HERMES-THREE-GOLD-PRODUCTION-FINAL-V1','profile':profile,'hermes_home':home,'agent_root':agent},indent=2)+'\n')
PY
cp "$0" "$BACKUP/three-gold-production-manager.sh"
chmod 755 "$BACKUP/three-gold-production-manager.sh"
"$PYTHON" - "$BACKUP/RESTORE_THIS_BACKUP.command" "$PROFILE" "$BACKUP" "$HERMES_HOME" "$AGENT_ROOT" <<'PY'
import shlex,sys
from pathlib import Path
out,profile,backup,home,agent=sys.argv[1:]
text='#!/usr/bin/env bash\nset -euo pipefail\nDIR="$(cd "$(dirname "$0")" && pwd)"\n'
text+=f'export THREE_GOLD_HERMES_HOME={shlex.quote(home)}\nexport THREE_GOLD_AGENT_ROOT={shlex.quote(agent)}\n'
text+=f'exec bash "$DIR/three-gold-production-manager.sh" rollback --profile {shlex.quote(profile)} --backup "$DIR" --yes\n'
Path(out).write_text(text)
PY
chmod 755 "$BACKUP/RESTORE_THIS_BACKUP.command"
TOUCHED=1

install_briefs_runtime
install_briefs_server
if [[ "$SKIP_BUILD" != 1 ]]; then
  (cd "$WEB" && "$NPM" run typecheck && "$NPM" test -- --run src/lib/briefs.test.ts && "$NPM" run build)
  install_dashboard_dist
fi
install_git_watch_runtime "$PROFILE_PLUGIN"
install_checker "$PROFILE_CHECKER"
if [[ "$SAME_PROFILE" == 0 && "$MANAGE_LAUNCH_ROOT" == 1 ]]; then
  install_git_watch_runtime "$LAUNCH_PLUGIN"
  install_checker "$LAUNCH_CHECKER"
fi
ensure_git_watch_data
claim_launch_root
ensure_plugin_enabled
install_gold_masters

if [[ "$INJECT_FAILURE_AFTER_RUNTIME" == 1 ]]; then
  echo "INJECTED_FAILURE_AFTER_RUNTIME" >&2
  exit 97
fi

mkdir -p "$SYSTEM_ROOT"
"$PYTHON" - "$RECEIPT" "$PROFILE" "$PROFILE_HOME" "$BACKUP" "$MODE" <<'PY'
import json,sys
from datetime import datetime,timezone
from pathlib import Path
out,profile,profile_home,backup,mode=sys.argv[1:]
payload={
 'schema_version':1,
 'release':'HERMES-THREE-GOLD-PRODUCTION-FINAL-V1',
 'profile':profile,
 'profile_home':profile_home,
 'installed_at':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),
 'backup':backup,
 'operation':mode,
 'components':{'briefs_ai':'V34','briefs_stocks':'V34','git_watch':'Revision 52'},
 'git_watch_runtime_identity':'git-comments-v27-review',
 'downloads_dependency':False,
 'cron_wiring_required':{'job':'03_Git-COMMENTS','script':'github-comments-checker-v27-review.sh'}
}
Path(out).write_text(json.dumps(payload,indent=2)+'\n')
PY

verify_installed
TOUCHED=0
MODE_LABEL="$(printf '%s' "$MODE" | tr '[:lower:]-' '[:upper:]_')"
echo "THREE_GOLD_${MODE_LABEL}=PASS"
echo "PROFILE=$PROFILE"
echo "PROFILE_HOME=$PROFILE_HOME"
echo "SYSTEM_ROOT=$SYSTEM_ROOT"
echo "BACKUP=$BACKUP"
echo "ROLLBACK=$BACKUP/RESTORE_THIS_BACKUP.command"
echo "DOWNLOAD_LOCATION_DEPENDENCY=NONE"
echo "CRON_WIRING_PENDING=03_Git-COMMENTS:github-comments-checker-v27-review.sh"
echo "DESKTOP_RESTART_REQUIRED=YES"

