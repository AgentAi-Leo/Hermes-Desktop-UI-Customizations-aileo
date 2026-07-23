#!/bin/bash
set -Eeuo pipefail

MODE="${1:-install}"
SCRIPT_DIR="$(cd "$(/usr/bin/dirname "$0")" && pwd -P)"
PKG="$(cd "$SCRIPT_DIR/.." && pwd -P)"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
PROFILE="${HERMES_PROFILE:-local-ai-assist1}"
AGENT_ROOT="${HERMES_AGENT_ROOT:-$HERMES_HOME/hermes-agent}"
PROFILE_HOME="$HERMES_HOME/profiles/$PROFILE"
WEB="$AGENT_ROOT/web"
DIST="$AGENT_ROOT/hermes_cli/web_dist"
PYTHON="$AGENT_ROOT/venv/bin/python"
NPM="$(command -v npm || true)"
LABEL="com.aileo.hermes-local-ai-assist1-dashboard"
DOMAIN="gui/$(/usr/bin/id -u)"
BACKUP_ROOT="$PROFILE_HOME/backups/hermes-dynamic-custom-number-shortcuts-v15"
STAMP="$(/bin/date +%Y%m%d-%H%M%S)-$$"
BACKUP="${BACKUP_OVERRIDE:-$BACKUP_ROOT/$STAMP-install}"
TOUCHED=0
RESTORING=0

SOURCE_RELS=(
  "web/src/App.tsx"
  "web/src/lib/three-gold-shortcuts.ts"
  "web/src/lib/three-gold-shortcuts.test.ts"
  "web/src/lib/briefs.ts"
  "web/src/lib/briefs.test.ts"
)
BACKUP_RELS=("${SOURCE_RELS[@]}" "hermes_cli/web_dist")

verify_package() {
  "$PYTHON" - "$PKG/CHECKSUMS.sha256" "$PKG" <<'PY'
import hashlib,sys
from pathlib import Path
ledger=Path(sys.argv[1]).resolve(); root=Path(sys.argv[2]).resolve(); listed=set()
for number,line in enumerate(ledger.read_text(encoding='utf-8').splitlines(),1):
    if not line.strip(): continue
    try: want,rel=line.split('  ',1)
    except ValueError: raise SystemExit(f'INVALID_CHECKSUM_LINE={number}')
    if rel in listed: raise SystemExit(f'DUPLICATE_CHECKSUM_PATH={rel}')
    listed.add(rel); p=root/rel
    if not p.is_file() or p.is_symlink(): raise SystemExit(f'CHECKSUM_INVALID_FILE={rel}')
    if hashlib.sha256(p.read_bytes()).hexdigest()!=want: raise SystemExit(f'CHECKSUM_MISMATCH={rel}')
actual={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and p.resolve()!=ledger}
if actual!=listed:
    for rel in sorted(actual-listed): print(f'CHECKSUM_UNLEDGERED_FILE={rel}')
    for rel in sorted(listed-actual): print(f'CHECKSUM_LEDGER_MISSING_FILE={rel}')
    raise SystemExit(1)
print('DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_PACKAGE=PASS')
PY
}

preflight() {
  verify_package
  [[ -x "$PYTHON" ]] || { echo "MISSING_HERMES_VENV_PYTHON=$PYTHON"; return 1; }
  [[ -n "$NPM" && -x "$NPM" ]] || { echo "MISSING_NPM=YES"; return 1; }
  [[ -f "$WEB/package.json" ]] || { echo "MISSING_WEB_PACKAGE_JSON=$WEB/package.json"; return 1; }
  "$PYTHON" - "$PKG" "$AGENT_ROOT" <<'PY'
import hashlib,sys
from pathlib import Path
pkg,root=map(Path,sys.argv[1:])
expected={
 'web/src/App.tsx':('9bdbf9a04260cd2eccb34be0568b8f8832d4f13147f4746accd31d3342cb6ffc','1b51a2aeaaa82e6f79e8e03f57885ce905ff91f00d3441d38a31c63d2d503bbc',False),
 'web/src/lib/three-gold-shortcuts.ts':('afe54a65e7216454c45e61e0f386cb9a16368a2bad42550b1eb2603d7d4d9cb0','85f9b2f9446327c42a43d383c2f667d6b49e8f4e541de290b5c2f0fb303085e7',False),
 'web/src/lib/three-gold-shortcuts.test.ts':('ea47f2bffc11e3acce13ac6ec3ebfc59fb31f0c14b8da534378391c3e376a8d2','a17ca242d7e414a584ca9bbf27f75b988077a1aa01d3197b286aabfba944f916',False),
 'web/src/lib/briefs.ts':('2e0762a52856fd2b1846cf6e21aeeadeca4d23991e0c2db79f466ae0b40aba24','3ff34af34f186a7a1052c5d6bf52180ae23fb0a954ea3a67bfca49ec412d5281',False),
 'web/src/lib/briefs.test.ts':('0a69161af59a6c6645203c8a7382fac71b079664078b8d36e4b9e43f527dd8eb','00fd00e6b0f5f9262afe72e1648999a79c9861f42e477885f9082732aca4f721',False),
}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
for rel,(old,new,may_missing) in expected.items():
    payload=pkg/'payload'/rel
    if not payload.is_file() or sha(payload)!=new: raise SystemExit(f'INVALID_DYNAMIC_SHORTCUT_PAYLOAD={rel}')
    target=root/rel
    if not target.exists():
        if may_missing: print(f'DYNAMIC_SHORTCUT_PREDECESSOR_MISSING={rel}'); continue
        raise SystemExit(f'MISSING_REQUIRED_TARGET={rel}')
    got=sha(target)
    accepted={new} | ({old} if old else set())
    if got not in accepted: raise SystemExit(f'UNKNOWN_DYNAMIC_SHORTCUT_PREDECESSOR={rel} SHA256={got}')
    print(f'DYNAMIC_SHORTCUT_PREDECESSOR_ACCEPTED={rel} SHA256={got}')
print('DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_PREFLIGHT=PASS')
PY
}

create_backup() {
  /bin/mkdir -p "$BACKUP/state"
  "$PYTHON" - "$AGENT_ROOT" "$BACKUP" "${BACKUP_RELS[@]}" <<'PY'
import hashlib,json,os,shutil,stat,sys
from pathlib import Path
root=Path(sys.argv[1]); backup=Path(sys.argv[2]); rels=sys.argv[3:]; state=backup/'state'; missing=[]
for rel in rels:
    src=root/rel; dst=state/rel
    if not src.exists() and not src.is_symlink(): missing.append(rel); continue
    dst.parent.mkdir(parents=True,exist_ok=True)
    if src.is_dir(): shutil.copytree(src,dst,symlinks=True)
    else: shutil.copy2(src,dst,follow_symlinks=False)
def snapshot(path):
    out=[]
    for p in sorted(path.rglob('*')):
        rel=p.relative_to(path).as_posix(); mode=stat.S_IMODE(p.lstat().st_mode)
        if p.is_symlink(): out.append({'path':rel,'kind':'symlink','mode':mode,'target':os.readlink(p)})
        elif p.is_dir(): out.append({'path':rel,'kind':'dir','mode':mode})
        elif p.is_file(): out.append({'path':rel,'kind':'file','mode':mode,'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    return out
(backup/'BACKUP-INVENTORY.json').write_text(json.dumps({'schema_version':1,'agent_root':str(root),'rels':rels,'missing':missing,'entries':snapshot(state)},sort_keys=True,indent=2)+'\n')
print(f'DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_BACKUP={backup}')
PY
  /bin/cp -p "$SCRIPT_DIR/install-shortcuts.sh" "$BACKUP/install-shortcuts.sh"
  /bin/chmod 700 "$BACKUP/install-shortcuts.sh"
  /usr/bin/printf '%s\n' '#!/bin/bash' 'HERE="$(cd "$(/usr/bin/dirname "$0")" && pwd -P)"' 'exec /bin/bash "$HERE/install-shortcuts.sh" rollback "$HERE"' > "$BACKUP/RESTORE_THIS_BACKUP.command"
  /bin/chmod 700 "$BACKUP/RESTORE_THIS_BACKUP.command"
}

restore_backup() {
  local selected="$1"
  RESTORING=1
  if ! "$PYTHON" - "$AGENT_ROOT" "$selected" <<'PY'
import hashlib,json,os,shutil,stat,sys
from pathlib import Path
root=Path(sys.argv[1]); backup=Path(sys.argv[2]); state=backup/'state'
inv=json.loads((backup/'BACKUP-INVENTORY.json').read_text())
if inv.get('schema_version')!=1: raise SystemExit('DYNAMIC_SHORTCUT_BACKUP_SCHEMA_INVALID')
expected=['web/src/App.tsx','web/src/lib/three-gold-shortcuts.ts','web/src/lib/three-gold-shortcuts.test.ts','web/src/lib/briefs.ts','web/src/lib/briefs.test.ts','hermes_cli/web_dist']
if inv.get('rels')!=expected: raise SystemExit('DYNAMIC_SHORTCUT_BACKUP_RELS_INVALID')
def snapshot(path):
    out=[]
    for p in sorted(path.rglob('*')):
        rel=p.relative_to(path).as_posix(); mode=stat.S_IMODE(p.lstat().st_mode)
        if p.is_symlink(): out.append({'path':rel,'kind':'symlink','mode':mode,'target':os.readlink(p)})
        elif p.is_dir(): out.append({'path':rel,'kind':'dir','mode':mode})
        elif p.is_file(): out.append({'path':rel,'kind':'file','mode':mode,'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    return out
if snapshot(state)!=inv.get('entries'): raise SystemExit('DYNAMIC_SHORTCUT_BACKUP_INVENTORY_INVALID')
missing=set(inv.get('missing',[]))
if not missing.issubset(set(expected)): raise SystemExit('DYNAMIC_SHORTCUT_BACKUP_MISSING_SET_INVALID')
for rel in inv.get('rels',[]):
    dst=root/rel; src=state/rel
    if dst.is_dir() and not dst.is_symlink(): shutil.rmtree(dst)
    elif dst.exists() or dst.is_symlink(): dst.unlink()
    if rel in missing: continue
    dst.parent.mkdir(parents=True,exist_ok=True)
    if src.is_dir(): shutil.copytree(src,dst,symlinks=True)
    else: shutil.copy2(src,dst,follow_symlinks=False)
print('DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_ROLLBACK=PASS')
PY
  then
    RESTORING=0
    return 1
  fi
  RESTORING=0
}

apply_sources() {
  "$PYTHON" - "$PKG" "$AGENT_ROOT" "${SOURCE_RELS[@]}" <<'PY'
import os,stat,sys,tempfile
from pathlib import Path
pkg=Path(sys.argv[1]); root=Path(sys.argv[2]); rels=sys.argv[3:]
for rel in rels:
    src=pkg/'payload'/rel; dst=root/rel; dst.parent.mkdir(parents=True,exist_ok=True)
    mode=stat.S_IMODE(dst.stat().st_mode) if dst.exists() else 0o644
    fd,tmp=tempfile.mkstemp(prefix='.'+dst.name+'.',dir=dst.parent)
    try:
        with os.fdopen(fd,'wb') as f: f.write(src.read_bytes()); f.flush(); os.fsync(f.fileno())
        os.chmod(tmp,mode); os.replace(tmp,dst)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
print('DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_SOURCES=INSTALLED')
PY
}

verify_installed() {
  "$PYTHON" - "$AGENT_ROOT" <<'PY'
import hashlib,re,sys
from pathlib import Path
root=Path(sys.argv[1]); expected={
 'web/src/App.tsx':'1b51a2aeaaa82e6f79e8e03f57885ce905ff91f00d3441d38a31c63d2d503bbc',
 'web/src/lib/three-gold-shortcuts.ts':'85f9b2f9446327c42a43d383c2f667d6b49e8f4e541de290b5c2f0fb303085e7',
 'web/src/lib/three-gold-shortcuts.test.ts':'a17ca242d7e414a584ca9bbf27f75b988077a1aa01d3197b286aabfba944f916',
 'web/src/lib/briefs.ts':'3ff34af34f186a7a1052c5d6bf52180ae23fb0a954ea3a67bfca49ec412d5281',
 'web/src/lib/briefs.test.ts':'00fd00e6b0f5f9262afe72e1648999a79c9861f42e477885f9082732aca4f721',
}
for rel,want in expected.items():
    got=hashlib.sha256((root/rel).read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'DYNAMIC_SHORTCUT_INSTALLED_HASH_MISMATCH={rel}')
app=(root/'web/src/App.tsx').read_text(); helper=(root/'web/src/lib/three-gold-shortcuts.ts').read_text(); briefs=(root/'web/src/lib/briefs.ts').read_text()
for required in ('customShortcutPaths','sidebarNav.customItems.map((item) => item.path)','customTabIndexForShortcut(key, customShortcutPaths.length)','CUSTOM_TAB_SHORTCUT_MESSAGE_TYPE','handleBriefIframeShortcut','iframe.contentWindow === event.source'):
    if required not in app: raise SystemExit(f'DYNAMIC_SHORTCUT_APP_CONTRACT_MISSING={required}')
for forbidden in ('GIT_WATCH_KEYBOARD_CARD_SELECTOR','wrappedKeyboardIndex','THREE_GOLD_KEYBOARD_ROUTES'):
    if forbidden in app or forbidden in helper: raise SystemExit(f'REMOVED_SHORTCUT_CONTRACT_PRESENT={forbidden}')
for required in ('CUSTOM_TAB_SHORTCUT_MESSAGE_TYPE = "hermes-custom-tab-shortcut"','/^[1-9]$/','Number(key) - 1','index < itemCount ? index : null'):
    if required not in helper: raise SystemExit(f'DYNAMIC_SHORTCUT_HELPER_CONTRACT_MISSING={required}')
if briefs.count('type: "hermes-custom-tab-shortcut", key: event.key') != 2: raise SystemExit('BRIEF_IFRAME_FORWARDER_COUNT_INVALID')
for required in ('window.parent === window','event.metaKey || event.ctrlKey || event.altKey || event.shiftKey','event.key === "[" ? "newer"','event.key === "ArrowLeft" || event.key === "["'):
    if required not in briefs: raise SystemExit(f'BRIEF_SHORTCUT_CONTRACT_MISSING={required}')
index=root/'hermes_cli/web_dist/index.html'
match=re.search(r'src="([^"]+\.js)"',index.read_text()) if index.is_file() else None
if not match: raise SystemExit('DYNAMIC_SHORTCUT_BUILT_JS_MISSING')
bundle=root/'hermes_cli/web_dist'/match.group(1).lstrip('/'); text=bundle.read_text(errors='replace')
for required in ('/briefs-ai','/brief-stock','/git-comments-v27-review','hermes-custom-tab-shortcut'):
    if required not in text: raise SystemExit(f'DYNAMIC_SHORTCUT_BUILT_CONTRACT_MISSING={required}')
print('DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_INSTALLED_VERIFICATION=PASS')
PY
}

automatic_rollback() {
  local rc="${1:-1}"
  local restore_rc=0
  trap - ERR INT TERM
  set +e
  if [[ "$TOUCHED" == 1 && "$RESTORING" == 0 ]]; then
    echo "DYNAMIC_SHORTCUT_INSTALL_FAILED_RESTORING=$BACKUP"
    restore_backup "$BACKUP"
    restore_rc=$?
    if [[ "$restore_rc" != 0 ]]; then
      echo "DYNAMIC_SHORTCUT_AUTOMATIC_ROLLBACK_FAILED=$BACKUP RC=$restore_rc"
    elif /bin/launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
      /bin/launchctl kickstart -k "$DOMAIN/$LABEL" >/dev/null 2>&1 || true
    fi
  fi
  exit "$rc"
}

restart_dashboard() {
  if [[ "${HERMES_DYNAMIC_SHORTCUT_TEST_MODE:-0}" == 1 && "${DYNAMIC_SHORTCUT_SKIP_LIVE_RESTART:-0}" == 1 ]]; then
    echo 'DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_DASHBOARD_RESTART=SKIPPED_TEST_MODE'
    return 0
  fi
  if ! /bin/launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then echo "DYNAMIC_SHORTCUT_LAUNCH_AGENT_NOT_LOADED=$LABEL"; return 1; fi
  /bin/launchctl kickstart -k "$DOMAIN/$LABEL"
  local ready=0
  for _ in {1..120}; do
    if /usr/bin/curl -fsS http://127.0.0.1:9120/ >/dev/null 2>&1; then ready=1; break; fi
    /bin/sleep 0.5
  done
  [[ "$ready" == 1 ]] || { echo 'DYNAMIC_SHORTCUT_DASHBOARD_RESTART_TIMEOUT'; return 1; }
  echo 'DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_DASHBOARD_RESTART=PASS'
}

case "$MODE" in
  verify) verify_package ;;
  audit) preflight ;;
  verify-installed) verify_installed ;;
  rollback)
    selected="${2:-}"
    [[ -n "$selected" ]] || { echo 'ROLLBACK_BACKUP_REQUIRED'; exit 2; }
    restore_backup "$selected"
    ;;
  install)
    preflight
    create_backup
    trap 'automatic_rollback $?' ERR
    trap 'automatic_rollback 130' INT
    trap 'automatic_rollback 143' TERM
    TOUCHED=1
    apply_sources
    if [[ "${HERMES_DYNAMIC_SHORTCUT_TEST_MODE:-0}" == 1 && "${DYNAMIC_SHORTCUT_TEST_WAIT_AFTER_SOURCES:-0}" == 1 ]]; then
      echo "DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_SIGNAL_READY_PID=$$"
      while [[ ! -e "${DYNAMIC_SHORTCUT_TEST_RELEASE_FILE:-/tmp/hermes-shortcut-test-release}" ]]; do
        /bin/sleep 0.2
      done
    fi
    if [[ "${HERMES_DYNAMIC_SHORTCUT_TEST_MODE:-0}" == 1 && "${DYNAMIC_SHORTCUT_INJECT_FAILURE_AFTER_SOURCES:-0}" == 1 ]]; then
      echo 'DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_INJECTED_FAILURE=YES'
      false
    fi
    (
      trap - ERR
      set +E
      cd "$AGENT_ROOT"
      "$NPM" run typecheck --workspace web
      "$NPM" run test --workspace web -- --run src/lib/three-gold-shortcuts.test.ts src/lib/briefs.test.ts --testTimeout=15000
      "$NPM" run test --workspace web -- --testTimeout=15000
      "$NPM" run build --workspace web
    )
    verify_installed
    restart_dashboard
    TOUCHED=0
    trap - ERR INT TERM
    echo 'DYNAMIC_CUSTOM_NUMBER_SHORTCUTS_INSTALL=PASS'
    echo "ROLLBACK=$BACKUP/RESTORE_THIS_BACKUP.command"
    ;;
  *) echo "UNKNOWN_MODE=$MODE"; exit 2 ;;
esac
