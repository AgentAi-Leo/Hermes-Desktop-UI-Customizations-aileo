#!/bin/bash
set -Eeuo pipefail

MODE="${1:-install}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
PKG="$(cd "$SCRIPT_DIR/.." && pwd -P)"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
PROFILE="${HERMES_PROFILE:-local-ai-assist1}"
AGENT_ROOT="${HERMES_AGENT_ROOT:-$HERMES_HOME/hermes-agent}"
PROFILE_HOME="$HERMES_HOME/profiles/$PROFILE"
WEB="$AGENT_ROOT/web"
DIST="$AGENT_ROOT/hermes_cli/web_dist"
PYTHON="${THREE_GOLD_PYTHON:-$AGENT_ROOT/venv/bin/python}"
BACKUP_ROOT="$PROFILE_HOME/backups/hermes-three-gold-live-acceptance-hotfix-v14"
STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP="${BACKUP_OVERRIDE:-$BACKUP_ROOT/$STAMP-install}"
TOUCHED=0
RESTORING=0

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
    listed.add(rel)
    p=root/rel
    if not p.is_file() or p.is_symlink(): raise SystemExit(f'CHECKSUM_INVALID_FILE={rel}')
    got=hashlib.sha256(p.read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'CHECKSUM_MISMATCH={rel}')
actual={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and p.resolve()!=ledger}
if actual!=listed:
    for rel in sorted(actual-listed): print(f'CHECKSUM_UNLEDGERED_FILE={rel}')
    for rel in sorted(listed-actual): print(f'CHECKSUM_LEDGER_MISSING_FILE={rel}')
    raise SystemExit(1)
print('LIVE_ACCEPTANCE_HOTFIX_PACKAGE=PASS')
PY
}

preflight() {
  verify_package
  [[ -x "$PYTHON" ]] || { echo "MISSING_HERMES_VENV_PYTHON=$PYTHON"; return 1; }
  [[ -f "$WEB/package.json" ]] || { echo "MISSING_WEB_PACKAGE_JSON=$WEB/package.json"; return 1; }
  "$PYTHON" - "$PKG" "$AGENT_ROOT" <<'PY'
import hashlib,sys
from pathlib import Path
pkg,root=map(Path,sys.argv[1:])
files={
 'web/src/App.tsx':('84a63a05097b1fd3fd4ab97f293638b265fc1df61120f324b3a2f33ca4594d7c','89eb319eff3638088d6328eb619ecd2d26bb857c93324cad53e3235848e7aa2a',False),
 'web/src/lib/api.ts':('cd2d7af4732554c2a7f5191a7f4294d3fbdef1ca506637168ddc8d8cd1410ce9','3945dc787a6410d0064c906e0f992b5994786322019543095ed1c7ce62124793',False),
 'web/src/plugins/usePlugins.ts':('641a710ee83a430c34901f309a3b08a9cb24d5bba1c06e91d3690a66c73de35b','59433403c800981e3b44823218618a3a93fc3ae6e5803fb97b2a11eb22ad7779',False),
 'web/src/plugins/registry.ts':('430fb8428d3fe542ca270301f138c0dfe6c2a93ba41582f4080aaa641b8a7b4c','d313fe3e398d69a6350649ef6766d09ca243eb376448ac30041ae0a08c0bdcc7',False),
 'web/src/lib/api.test.ts':('9827acc01187a602cc9a337db3b8fb0931a4446b4396d288fefcbe630a87f526','9a66baadc13d71b21621c32b315cfd0f663640e19564169fb4a4b1f9ccbbfb7e',False),
 'web/src/plugins/usePlugins.test.ts':(None,'3fddc92dd209389cb96f333150cd1c6b325374edd06b8c5575cb3e1c6f5db6ba',True),
}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
for rel,(old,new,may_missing) in files.items():
    payload=pkg/'payload'/rel; target=root/rel
    if not payload.is_file() or sha(payload)!=new: raise SystemExit(f'INVALID_HOTFIX_PAYLOAD={rel}')
    if not target.exists():
        if may_missing: print(f'HOTFIX_PREDECESSOR_MISSING={rel}'); continue
        raise SystemExit(f'MISSING_REQUIRED_TARGET={rel}')
    got=sha(target)
    if got not in {old,new}: raise SystemExit(f'UNKNOWN_HOTFIX_PREDECESSOR={rel} SHA256={got}')
    print(f'HOTFIX_PREDECESSOR_ACCEPTED={rel} SHA256={got}')
print('LIVE_ACCEPTANCE_HOTFIX_PREFLIGHT=PASS')
PY
}

create_backup() {
  mkdir -p "$BACKUP/state"
  "$PYTHON" - "$AGENT_ROOT" "$BACKUP" <<'PY'
import hashlib,json,os,shutil,stat,sys
from pathlib import Path
root,backup=map(Path,sys.argv[1:]); state=backup/'state'
rels=['web/src/App.tsx','web/src/lib/api.ts','web/src/plugins/usePlugins.ts','web/src/plugins/registry.ts','web/src/lib/api.test.ts','web/src/plugins/usePlugins.test.ts','hermes_cli/web_dist']
missing=[]
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
inventory={'schema_version':1,'agent_root':str(root),'missing':missing,'entries':snapshot(state)}
(backup/'BACKUP-INVENTORY.json').write_text(json.dumps(inventory,sort_keys=True,indent=2)+'\n')
print(f'LIVE_ACCEPTANCE_HOTFIX_BACKUP={backup}')
PY
  cp "$SCRIPT_DIR/live-acceptance-hotfix.sh" "$BACKUP/live-acceptance-hotfix.sh"
  chmod 700 "$BACKUP/live-acceptance-hotfix.sh"
  printf '%s\n' '#!/bin/bash' \
    'HERE="$(cd "$(dirname "$0")" && pwd -P)"' \
    'exec /bin/bash "$HERE/live-acceptance-hotfix.sh" rollback "$HERE"' \
    > "$BACKUP/RESTORE_THIS_BACKUP.command"
  chmod 700 "$BACKUP/RESTORE_THIS_BACKUP.command"
}

validate_backup() {
  local selected="$1"
  "$PYTHON" - "$selected" <<'PY'
import hashlib,json,os,stat,sys
from pathlib import Path
b=Path(sys.argv[1]); state=b/'state'; inv=json.loads((b/'BACKUP-INVENTORY.json').read_text())
expected={'web/src/App.tsx','web/src/lib/api.ts','web/src/plugins/usePlugins.ts','web/src/plugins/registry.ts','web/src/lib/api.test.ts','web/src/plugins/usePlugins.test.ts','hermes_cli/web_dist'}
def snapshot(path):
    out=[]
    for p in sorted(path.rglob('*')):
        rel=p.relative_to(path).as_posix(); mode=stat.S_IMODE(p.lstat().st_mode)
        if p.is_symlink(): out.append({'path':rel,'kind':'symlink','mode':mode,'target':os.readlink(p)})
        elif p.is_dir(): out.append({'path':rel,'kind':'dir','mode':mode})
        elif p.is_file(): out.append({'path':rel,'kind':'file','mode':mode,'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    return out
missing=set(inv.get('missing',[])); entries=inv.get('entries',[])
if not missing <= expected: raise SystemExit('HOTFIX_BACKUP_INVENTORY_UNKNOWN_MISSING_PATH')
covered=missing | {item.get('path') for item in entries if isinstance(item,dict)}
if not expected <= covered: raise SystemExit('HOTFIX_BACKUP_INVENTORY_INCOMPLETE')
if inv.get('schema_version')!=1 or snapshot(state)!=entries: raise SystemExit('HOTFIX_BACKUP_INVENTORY_INVALID')
print('LIVE_ACCEPTANCE_HOTFIX_BACKUP_INVENTORY=PASS')
PY
}

restore_backup() {
  local selected="$1"
  RESTORING=1
  if ! validate_backup "$selected"; then
    echo "HOTFIX_BACKUP_VALIDATION_FAILED=$selected"
    RESTORING=0
    return 1
  fi
  "$PYTHON" - "$AGENT_ROOT" "$selected" <<'PY'
import json,os,shutil,sys,tempfile
from pathlib import Path
root,backup=map(Path,sys.argv[1:]); state=backup/'state'; inv=json.loads((backup/'BACKUP-INVENTORY.json').read_text())
rels=['web/src/App.tsx','web/src/lib/api.ts','web/src/plugins/usePlugins.ts','web/src/plugins/registry.ts','web/src/lib/api.test.ts','web/src/plugins/usePlugins.test.ts','hermes_cli/web_dist']
missing=set(inv['missing'])
for rel in rels:
    dst=root/rel; src=state/rel
    if dst.is_dir() and not dst.is_symlink(): shutil.rmtree(dst)
    elif dst.exists() or dst.is_symlink(): dst.unlink()
    if rel in missing: continue
    dst.parent.mkdir(parents=True,exist_ok=True)
    if src.is_dir(): shutil.copytree(src,dst,symlinks=True)
    else: shutil.copy2(src,dst,follow_symlinks=False)
print('LIVE_ACCEPTANCE_HOTFIX_ROLLBACK=PASS')
PY
  RESTORING=0
}

apply_sources() {
  "$PYTHON" - "$PKG" "$AGENT_ROOT" <<'PY'
import os,shutil,stat,sys,tempfile
from pathlib import Path
pkg,root=map(Path,sys.argv[1:])
rels=['web/src/App.tsx','web/src/lib/api.ts','web/src/plugins/usePlugins.ts','web/src/plugins/registry.ts','web/src/lib/api.test.ts','web/src/plugins/usePlugins.test.ts']
for rel in rels:
    src=pkg/'payload'/rel; dst=root/rel; dst.parent.mkdir(parents=True,exist_ok=True)
    mode=stat.S_IMODE(dst.stat().st_mode) if dst.exists() else 0o644
    fd,tmp=tempfile.mkstemp(prefix='.'+dst.name+'.',dir=dst.parent)
    try:
        with os.fdopen(fd,'wb') as f:
            f.write(src.read_bytes()); f.flush(); os.fsync(f.fileno())
        os.chmod(tmp,mode); os.replace(tmp,dst)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
print('LIVE_ACCEPTANCE_HOTFIX_SOURCES=INSTALLED')
PY
}

verify_installed() {
  "$PYTHON" - "$AGENT_ROOT" <<'PY'
import hashlib,re,sys
from pathlib import Path
root=Path(sys.argv[1])
expected={
 'web/src/App.tsx':'89eb319eff3638088d6328eb619ecd2d26bb857c93324cad53e3235848e7aa2a',
 'web/src/lib/api.ts':'3945dc787a6410d0064c906e0f992b5994786322019543095ed1c7ce62124793',
 'web/src/plugins/usePlugins.ts':'59433403c800981e3b44823218618a3a93fc3ae6e5803fb97b2a11eb22ad7779',
 'web/src/plugins/registry.ts':'d313fe3e398d69a6350649ef6766d09ca243eb376448ac30041ae0a08c0bdcc7',
 'web/src/lib/api.test.ts':'9a66baadc13d71b21621c32b315cfd0f663640e19564169fb4a4b1f9ccbbfb7e',
 'web/src/plugins/usePlugins.test.ts':'3fddc92dd209389cb96f333150cd1c6b325374edd06b8c5575cb3e1c6f5db6ba',
}
for rel,want in expected.items():
    p=root/rel; got=hashlib.sha256(p.read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'HOTFIX_INSTALLED_HASH_MISMATCH={rel}')
app=(root/'web/src/App.tsx').read_text()
api=(root/'web/src/lib/api.ts').read_text()
plugins=(root/'web/src/plugins/usePlugins.ts').read_text()
registry=(root/'web/src/plugins/registry.ts').read_text()
if 'id="hermes-sidebar-custom-nav-heading"' not in app or '>\n                    CUSTOM\n' not in app: raise SystemExit('CUSTOM_LABEL_CONTRACT_FAILED')
for required in ('getPlugins: (profile = getManagementProfile())','appendProfileParam("/api/dashboard/plugins", profile)'):
    if required not in api: raise SystemExit('PLUGIN_API_PROFILE_CONTRACT_FAILED')
for required in ('useLocation','dashboardPluginProfile(search)','.getPlugins(selectedProfile)','beginPluginGeneration(generation)','generationRef.current','isCurrentPluginBatch(','visiblePluginState(','return visiblePluginState(','setManifestProfile(null)','setManifestGeneration(null)','setManifests([])','setPlugins([])','setLoading(true)','data-hermes-profile-plugin','data-hermes-plugin-generation','encodeURIComponent(selectedProfile)','  }, [selectedProfile]);','[manifests, manifestProfile, manifestGeneration, selectedProfile]'):
    if required not in plugins: raise SystemExit('PLUGIN_PROFILE_GENERATION_CONTRACT_FAILED')
for required in ('export function clearPluginRegistry()','export function beginPluginGeneration(','export function registerPlugin(','document.currentScript','scriptGeneration !== _activeGeneration','_registered.clear()','_loadErrors.clear()'):
    if required not in registry: raise SystemExit('PLUGIN_REGISTRY_GENERATION_CONTRACT_FAILED')
index=root/'hermes_cli/web_dist/index.html'
if not index.is_file(): raise SystemExit('MISSING_BUILT_DASHBOARD_INDEX')
match=re.search(r'src="([^"]+\.js)"',index.read_text())
if not match: raise SystemExit('MISSING_BUILT_DASHBOARD_JS')
bundle=root/'hermes_cli/web_dist'/match.group(1).lstrip('/')
text=bundle.read_text(errors='replace')
for required in ('CUSTOM','BRIEFS-AI','BRIEF-STOCK','git-comments-v27-review'):
    if required not in text: raise SystemExit(f'BUILT_DASHBOARD_CONTRACT_MISSING={required}')
print('LIVE_ACCEPTANCE_HOTFIX_INSTALLED_VERIFICATION=PASS')
PY
}

automatic_rollback() {
  local rc="${1:-1}"
  local restore_rc=0
  trap - ERR INT TERM
  set +e
  if [[ "$TOUCHED" == 1 && "$RESTORING" == 0 ]]; then
    echo "HOTFIX_INSTALL_FAILED_RESTORING=$BACKUP"
    (
      trap - ERR INT TERM
      set -Eeuo pipefail
      restore_backup "$BACKUP"
    )
    restore_rc=$?
    if [[ "$restore_rc" != 0 ]]; then
      echo "HOTFIX_AUTOMATIC_ROLLBACK_FAILED=$BACKUP RC=$restore_rc"
    fi
  fi
  exit "$rc"
}

case "$MODE" in
  verify)
    verify_package
    ;;
  audit)
    preflight
    ;;
  verify-installed)
    verify_installed
    ;;
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
    echo "HOTFIX_INSTALLER_PID=$$"
    TOUCHED=1
    apply_sources
    if [[ "${HOTFIX_INJECT_FAILURE_AFTER_SOURCES:-0}" == 1 ]]; then
      echo "HOTFIX_INJECTED_FAILURE_AFTER_SOURCES=YES"
      false
    fi
    (
      trap - ERR
      set +E
      cd "$WEB"
      npm run typecheck
      npm test -- --run
      npm run build
    )
    verify_installed
    TOUCHED=0
    trap - ERR INT TERM
    echo "LIVE_ACCEPTANCE_HOTFIX_INSTALL=PASS"
    echo "ROLLBACK=$BACKUP/RESTORE_THIS_BACKUP.command"
    echo "DASHBOARD_RESTART_REQUIRED=YES"
    printf 'DASHBOARD_RESTART_COMMAND=cd %q && %q -m hermes_cli.main -p %q dashboard --isolated --port 9120 --no-open\n' "$AGENT_ROOT" "$PYTHON" "$PROFILE"
    ;;
  *)
    echo "UNKNOWN_MODE=$MODE"
    exit 2
    ;;
esac
