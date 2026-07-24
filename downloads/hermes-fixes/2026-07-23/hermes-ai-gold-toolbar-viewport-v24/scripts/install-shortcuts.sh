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
BACKUP_ROOT="$PROFILE_HOME/backups/hermes-ai-gold-toolbar-viewport-v24"
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
  "web/src/pages/BriefsPage.tsx"
  "web/src/lib/persistent-fullscreen.ts"
  "web/src/lib/persistent-fullscreen.test.ts"
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
print('PERSISTENT_CUSTOM_FULLSCREEN_PACKAGE=PASS')
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
 'web/src/App.tsx':('b48e001813e8af2949cb5d62f545519d152c28769812b7066ccd758579305309',{'9bdbf9a04260cd2eccb34be0568b8f8832d4f13147f4746accd31d3342cb6ffc','1b51a2aeaaa82e6f79e8e03f57885ce905ff91f00d3441d38a31c63d2d503bbc','738460661a74426b4e4da2fde482aee5a54b17e6f575d5dde1c1702161620faf','880c7de7b1304c8b6a4527f6717aceb4f9ad9f80ff66590252bfc55beeef964a','c5a92c30dcf036a931aa4830fe0b0de5c72d949abbf22aeb788bb214a5f7522b','a865d956ad935c137063f2f2790f22ac2c44f678632d648cbcd26ea1e79a4956','b48e001813e8af2949cb5d62f545519d152c28769812b7066ccd758579305309'},False),
 'web/src/lib/three-gold-shortcuts.ts':('85f9b2f9446327c42a43d383c2f667d6b49e8f4e541de290b5c2f0fb303085e7',{'afe54a65e7216454c45e61e0f386cb9a16368a2bad42550b1eb2603d7d4d9cb0','85f9b2f9446327c42a43d383c2f667d6b49e8f4e541de290b5c2f0fb303085e7'},False),
 'web/src/lib/three-gold-shortcuts.test.ts':('a17ca242d7e414a584ca9bbf27f75b988077a1aa01d3197b286aabfba944f916',{'ea47f2bffc11e3acce13ac6ec3ebfc59fb31f0c14b8da534378391c3e376a8d2','a17ca242d7e414a584ca9bbf27f75b988077a1aa01d3197b286aabfba944f916'},False),
 'web/src/lib/briefs.ts':('37cc33f66a9067b05ead8924b9070ac3b17d9315120a08a047937dcfd4b80491',{'2e0762a52856fd2b1846cf6e21aeeadeca4d23991e0c2db79f466ae0b40aba24','3ff34af34f186a7a1052c5d6bf52180ae23fb0a954ea3a67bfca49ec412d5281','4970b6c4e916c7f3b45a23406ed1357b4b6c96d1df9526964cd4fcf1065a490b','37cc33f66a9067b05ead8924b9070ac3b17d9315120a08a047937dcfd4b80491'},False),
 'web/src/lib/briefs.test.ts':('8be86980b2f6dce5c991ec9227fc3a7dadd435d989ddeb0ea0e607686023a5e3',{'0a69161af59a6c6645203c8a7382fac71b079664078b8d36e4b9e43f527dd8eb','00fd00e6b0f5f9262afe72e1648999a79c9861f42e477885f9082732aca4f721','f56c565336117cab5838b6b915cf4fe9244086e8063f7bbe0bce4f5a3c076dfe','9bbb9d0736215e97683384ea79cb23d1be14414806e5a73665917d37030db475','9d8aab9c42b58d881df022607e846db79877ac495c2ef4ed648ea5d938097903'},False),
 'web/src/pages/BriefsPage.tsx':('009232d9ea2deb23789bf7d6a231bcf1c15fedc875ae7b43f0fa6f7ab1082300',{'4de05bc3cad0c087324de7e247f5afe639a74351d1348974237503a948ad10e7','646cd3df8467f6f2adee3d2bec89397af3c8849d7872938adf81c3e405445238','23a01c959d66972c5b64d22598ed227f130534a76b3f61824769e83b25e3aa8c','74f64a9ba3b5d29d3eb0aff95cf685812cf951a8139754e27293b1d8f74f0a0d','3d4e9854a66f03bb56e76a6a2873092fe64c22ad9aea0e209c7fa009a8a3db62','05b04f77528d19122247e127223a8cc9314ddbc6da8ce4731c5b51cda1a2ccb0'},False),
 'web/src/lib/persistent-fullscreen.ts':('ae4e029dc9a57c0894d6b38fadb2251a1b9a7c7600adcd7774288343367e66f2',{'f029c30327f8f4011d864308c992a13653c79cad557536c42a662da9b6ff347e','fc536fb1115332a19c4ac22ac5f3931a66cb7b593dfc1c5e967df43e5e835b56','ae4e029dc9a57c0894d6b38fadb2251a1b9a7c7600adcd7774288343367e66f2'},True),
 'web/src/lib/persistent-fullscreen.test.ts':('d65f218af30db472a9f27eaa1a5343dbe98a5bcc4851f39e35fe72babe9ecc34',{'b96273d36626fefe2577b566d8e918a67d14c0eb5c7de200cd3dc21ad8b70197','9534e015c8db54f0eda623cc20809f120ad764fddf9d3e37301a352b3c208eb9','20230544658dfdadfb4cf838034a270998ac4c1fef5b18fd6d91ad7e91194c42','9e2d9a138f1a04a6d8f5c1d601148fde1c55ea3c252e7389b3eb2edb375f02f9','d63384c84da979a26da6641cca3152a77a98de92a29e0fcafb49f786f758734a','3e14ec9e56e42b20ff1f0feee1209f3fe54471a6279bb985fdeb6b11f2959310'},True),
}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
for rel,(new,accepted,may_missing) in expected.items():
    payload=pkg/'payload'/rel
    if not payload.is_file() or sha(payload)!=new: raise SystemExit(f'INVALID_PERSISTENT_FULLSCREEN_PAYLOAD={rel}')
    target=root/rel
    if not target.exists():
        if may_missing: print(f'PERSISTENT_FULLSCREEN_PREDECESSOR_MISSING={rel}'); continue
        raise SystemExit(f'MISSING_REQUIRED_TARGET={rel}')
    got=sha(target)
    if got not in accepted: raise SystemExit(f'UNKNOWN_PERSISTENT_FULLSCREEN_PREDECESSOR={rel} SHA256={got}')
    print(f'PERSISTENT_FULLSCREEN_PREDECESSOR_ACCEPTED={rel} SHA256={got}')
print('PERSISTENT_CUSTOM_FULLSCREEN_PREFLIGHT=PASS')
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
print(f'PERSISTENT_CUSTOM_FULLSCREEN_BACKUP={backup}')
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
if inv.get('schema_version')!=1: raise SystemExit('PERSISTENT_FULLSCREEN_BACKUP_SCHEMA_INVALID')
expected=['web/src/App.tsx','web/src/lib/three-gold-shortcuts.ts','web/src/lib/three-gold-shortcuts.test.ts','web/src/lib/briefs.ts','web/src/lib/briefs.test.ts','web/src/pages/BriefsPage.tsx','web/src/lib/persistent-fullscreen.ts','web/src/lib/persistent-fullscreen.test.ts','hermes_cli/web_dist']
if inv.get('rels')!=expected: raise SystemExit('PERSISTENT_FULLSCREEN_BACKUP_RELS_INVALID')
def snapshot(path):
    out=[]
    for p in sorted(path.rglob('*')):
        rel=p.relative_to(path).as_posix(); mode=stat.S_IMODE(p.lstat().st_mode)
        if p.is_symlink(): out.append({'path':rel,'kind':'symlink','mode':mode,'target':os.readlink(p)})
        elif p.is_dir(): out.append({'path':rel,'kind':'dir','mode':mode})
        elif p.is_file(): out.append({'path':rel,'kind':'file','mode':mode,'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    return out
if snapshot(state)!=inv.get('entries'): raise SystemExit('PERSISTENT_FULLSCREEN_BACKUP_INVENTORY_INVALID')
missing=set(inv.get('missing',[]))
if not missing.issubset(set(expected)): raise SystemExit('PERSISTENT_FULLSCREEN_BACKUP_MISSING_SET_INVALID')
for rel in inv.get('rels',[]):
    dst=root/rel; src=state/rel
    if dst.is_dir() and not dst.is_symlink(): shutil.rmtree(dst)
    elif dst.exists() or dst.is_symlink(): dst.unlink()
    if rel in missing: continue
    dst.parent.mkdir(parents=True,exist_ok=True)
    if src.is_dir(): shutil.copytree(src,dst,symlinks=True)
    else: shutil.copy2(src,dst,follow_symlinks=False)
print('PERSISTENT_CUSTOM_FULLSCREEN_ROLLBACK=PASS')
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
print('PERSISTENT_CUSTOM_FULLSCREEN_SOURCES=INSTALLED')
PY
}

verify_installed() {
  "$PYTHON" - "$AGENT_ROOT" <<'PY'
import hashlib,re,sys
from pathlib import Path
root=Path(sys.argv[1]); expected={
 'web/src/App.tsx':'b48e001813e8af2949cb5d62f545519d152c28769812b7066ccd758579305309',
 'web/src/lib/three-gold-shortcuts.ts':'85f9b2f9446327c42a43d383c2f667d6b49e8f4e541de290b5c2f0fb303085e7',
 'web/src/lib/three-gold-shortcuts.test.ts':'a17ca242d7e414a584ca9bbf27f75b988077a1aa01d3197b286aabfba944f916',
 'web/src/lib/briefs.ts':'37cc33f66a9067b05ead8924b9070ac3b17d9315120a08a047937dcfd4b80491',
 'web/src/lib/briefs.test.ts':'8be86980b2f6dce5c991ec9227fc3a7dadd435d989ddeb0ea0e607686023a5e3',
 'web/src/pages/BriefsPage.tsx':'009232d9ea2deb23789bf7d6a231bcf1c15fedc875ae7b43f0fa6f7ab1082300',
 'web/src/lib/persistent-fullscreen.ts':'ae4e029dc9a57c0894d6b38fadb2251a1b9a7c7600adcd7774288343367e66f2',
 'web/src/lib/persistent-fullscreen.test.ts':'d65f218af30db472a9f27eaa1a5343dbe98a5bcc4851f39e35fe72babe9ecc34',
}
for rel,want in expected.items():
    got=hashlib.sha256((root/rel).read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'PERSISTENT_FULLSCREEN_INSTALLED_HASH_MISMATCH={rel}')
app=(root/'web/src/App.tsx').read_text(); helper=(root/'web/src/lib/three-gold-shortcuts.ts').read_text(); briefs=(root/'web/src/lib/briefs.ts').read_text(); briefs_test=(root/'web/src/lib/briefs.test.ts').read_text(); page=(root/'web/src/pages/BriefsPage.tsx').read_text(); fullscreen=(root/'web/src/lib/persistent-fullscreen.ts').read_text(); fullscreen_test=(root/'web/src/lib/persistent-fullscreen.test.ts').read_text()
for required in ('customShortcutPaths','PERSISTENT_FULLSCREEN_SHELL_ID','PersistentFullscreenContext.Provider','h-dvh overflow-hidden bg-background-base p-0','data-hermes-persistent-fullscreen-control','isBriefFullscreenToggleMessage(event.data?.type)','event.key === "Enter" && customShortcutPaths.includes(normalizedPath)','settlePersistentFullscreenShellScroll(shell)'):
    if required not in app: raise SystemExit(f'PERSISTENT_FULLSCREEN_APP_CONTRACT_MISSING={required}')
if 'h-dvh overflow-auto bg-background-base p-3 sm:p-6' in app: raise SystemExit('REGRESSED_FULLSCREEN_SHELL_PADDING_PRESENT')
if 'h-[125dvh] w-[125%] flex-none origin-top-left scale-[0.8]' in page: raise SystemExit('REGRESSED_SHARED_BRIEF_FULLSCREEN_FIT_PRESENT')
if '!isPersistentFullscreen &&\n                  !isChatRoute &&\n                    "pb-[calc(2rem+env(safe-area-inset-bottom,0px))] lg:pb-8"' not in app: raise SystemExit('FULLSCREEN_BOTTOM_PADDING_GUARD_MISSING')
for required in ('if (!isPersistentFullscreen) return;','shell.scrollTop = 0;','requestAnimationFrame(resetFullscreenShellScroll)'):
    if required not in app: raise SystemExit(f'FULLSCREEN_SHELL_SCROLL_RESET_MISSING={required}')
for required in ('usePersistentFullscreen()','data-hermes-brief-route-chrome','data-hermes-brief-archive-rail','data-hermes-brief-preview-card','data-hermes-brief-preview-toolbar','data-hermes-ai-persistent-toolbar','const aiPersistentToolbar = kind === "ai" ? (','document.getElementById(PERSISTENT_FULLSCREEN_SHELL_ID)','createPortal(aiPersistentToolbar, aiPersistentToolbarPortalTarget)','fixed inset-x-0 top-0 z-[80]','h-[138.889dvh] w-[138.889%] flex-none origin-top-left scale-[0.72] gap-0 overflow-hidden pt-[105.556px]','h-[113.636dvh] w-[113.636%] flex-none origin-top-left scale-[0.88] gap-0 overflow-hidden','h-full min-h-0 rounded-none border-0 shadow-none'):
    if required not in page: raise SystemExit(f'BRIEF_FULLSCREEN_VISUAL_PARITY_CONTRACT_MISSING={required}')
for forbidden in ('iframe.requestFullscreen()','document.fullscreenElement === iframe','handlePreviewFullscreenShortcut','handleBriefFullscreen','{isPersistentFullscreen && kind === "ai" && (','data-hermes-ai-export-overlay','renderExportButtons("preview")'):
    if forbidden in page: raise SystemExit(f'IFRAME_FULLSCREEN_OWNER_PRESENT={forbidden}')
for required in ('PersistentFullscreenContext','usePersistentFullscreen','hermes-persistent-route-shell','hermes-ai-fullscreen-toggle','hermes-stock-fullscreen-toggle','settlePersistentFullscreenShellScroll','requestFrame(reset)'):
    if required not in fullscreen: raise SystemExit(f'PERSISTENT_FULLSCREEN_HELPER_CONTRACT_MISSING={required}')
for required in ('resets stale fullscreen-shell scroll after an iframe load and across two layout frames','shell.scrollTop = 101.5','frames.shift()?.(16)','createPortal(aiPersistentToolbar, aiPersistentToolbarPortalTarget)'):
    if required not in fullscreen_test: raise SystemExit(f'PERSISTENT_FULLSCREEN_LIFECYCLE_TEST_MISSING={required}')
for required in ('keeps one AI toolbar mounted when fullscreen state and date-loaded content change','uses one complete AI rail in every mode','not.toContain(\'{isPersistentFullscreen && kind === "ai" && (\')'):
    if required not in briefs_test: raise SystemExit(f'AI_TOOLBAR_LIFECYCLE_TEST_MISSING={required}')
for required in ('const playerRail = `<div class="hermes-brief-player-placeholder" style="height: 66px;"></div><nav id="hermes-brief-player"','<body>${playerRail}<main id="hermes-ai-canonical">'):
    if required not in briefs: raise SystemExit(f'AI_STATIC_PLAYER_RAIL_CONTRACT_MISSING={required}')
for required in ('briefDateNavigationWraps','parentOwnsAiToolbar = false','#hermes-brief-player,.hermes-brief-player-placeholder{display:none!important}','hermes-ai-player-state','hermes-ai-playback-rate-restore'):
    if required not in briefs: raise SystemExit(f'AI_GOLD_TOOLBAR_BRIEFS_CONTRACT_MISSING={required}')
for required in ('data-hermes-ai-persistent-toolbar','renderExportButtons("ai-persistent-toolbar")','aria-label="Previous AI topic"','aria-label="Next AI topic"','aria-label="AI narration volume"','aria-label="AI playback speed"','aria-label="Load newer AI brief date"','aria-label="Load older AI brief date"','pendingAiViewportPositionRef.current = wraps ? null'):
    if required not in page: raise SystemExit(f'AI_GOLD_TOOLBAR_PAGE_CONTRACT_MISSING={required}')
if briefs.count('type: "hermes-custom-tab-shortcut", key: event.key') != 2: raise SystemExit('BRIEF_IFRAME_FORWARDER_COUNT_INVALID')
index=root/'hermes_cli/web_dist/index.html';match=re.search(r'src="([^"]+\.js)"',index.read_text()) if index.is_file() else None
if not match: raise SystemExit('PERSISTENT_FULLSCREEN_BUILT_JS_MISSING')
bundle=root/'hermes_cli/web_dist'/match.group(1).lstrip('/');text=bundle.read_text(errors='replace')
for required in ('/briefs-ai','/brief-stock','/git-comments-v27-review','hermes-persistent-route-shell','data-hermes-brief-route-chrome','data-hermes-brief-preview-card','<div class="hermes-brief-player-placeholder" style="height: 66px;"></div><nav id="hermes-brief-player"','data-hermes-ai-persistent-toolbar','ai-persistent-toolbar','Load older AI brief date','Download Markdown'):
    if required not in text: raise SystemExit(f'PERSISTENT_FULLSCREEN_BUILT_CONTRACT_MISSING={required}')
if text.count('scrollLeft=0') < 2: raise SystemExit('PERSISTENT_FULLSCREEN_BUILT_POST_LOAD_SCROLL_RESET_MISSING')
css_match=re.search(r'href="([^"]+\.css)"',index.read_text()); css=(root/'hermes_cli/web_dist'/css_match.group(1).lstrip('/')).read_text() if css_match else ''
for required in ('h-\\[138\\.889dvh\\]{height:138.889dvh}','w-\\[138\\.889\\%\\]{width:138.889%}','scale-\\[0\\.72\\]{scale:.72}','pt-\\[105\\.556px\\]{padding-top:105.556px}','z-\\[80\\]{z-index:80}','h-\\[113\\.636dvh\\]{height:113.636dvh}','w-\\[113\\.636\\%\\]{width:113.636%}','scale-\\[0\\.88\\]{scale:.88}'):
    if required not in css: raise SystemExit(f'PERSISTENT_FULLSCREEN_BUILT_CSS_CONTRACT_MISSING={required}')
print('PERSISTENT_CUSTOM_FULLSCREEN_INSTALLED_VERIFICATION=PASS')
PY
}

automatic_rollback() {
  local rc="${1:-1}"
  local restore_rc=0
  trap - ERR INT TERM
  set +e
  if [[ "$TOUCHED" == 1 && "$RESTORING" == 0 ]]; then
    echo "PERSISTENT_FULLSCREEN_INSTALL_FAILED_RESTORING=$BACKUP"
    restore_backup "$BACKUP"
    restore_rc=$?
    if [[ "$restore_rc" != 0 ]]; then
      echo "PERSISTENT_FULLSCREEN_AUTOMATIC_ROLLBACK_FAILED=$BACKUP RC=$restore_rc"
    elif /bin/launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
      /bin/launchctl kickstart -k "$DOMAIN/$LABEL" >/dev/null 2>&1 || true
    fi
  fi
  exit "$rc"
}

restart_dashboard() {
  if [[ "${HERMES_PERSISTENT_FULLSCREEN_TEST_MODE:-0}" == 1 && "${PERSISTENT_FULLSCREEN_SKIP_LIVE_RESTART:-0}" == 1 ]]; then
    echo 'PERSISTENT_CUSTOM_FULLSCREEN_DASHBOARD_RESTART=SKIPPED_TEST_MODE'
    return 0
  fi
  if ! /bin/launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then echo "PERSISTENT_FULLSCREEN_LAUNCH_AGENT_NOT_LOADED=$LABEL"; return 1; fi
  /bin/launchctl kickstart -k "$DOMAIN/$LABEL"
  local ready=0
  for _ in {1..120}; do
    if /usr/bin/curl -fsS http://127.0.0.1:9120/ >/dev/null 2>&1; then ready=1; break; fi
    /bin/sleep 0.5
  done
  [[ "$ready" == 1 ]] || { echo 'PERSISTENT_FULLSCREEN_DASHBOARD_RESTART_TIMEOUT'; return 1; }
  echo 'PERSISTENT_CUSTOM_FULLSCREEN_DASHBOARD_RESTART=PASS'
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
    if [[ "${HERMES_PERSISTENT_FULLSCREEN_TEST_MODE:-0}" == 1 && "${PERSISTENT_FULLSCREEN_TEST_WAIT_AFTER_SOURCES:-0}" == 1 ]]; then
      echo "PERSISTENT_CUSTOM_FULLSCREEN_SIGNAL_READY_PID=$$"
      while [[ ! -e "${PERSISTENT_FULLSCREEN_TEST_RELEASE_FILE:-/tmp/hermes-shortcut-test-release}" ]]; do
        /bin/sleep 0.2
      done
    fi
    if [[ "${HERMES_PERSISTENT_FULLSCREEN_TEST_MODE:-0}" == 1 && "${PERSISTENT_FULLSCREEN_INJECT_FAILURE_AFTER_SOURCES:-0}" == 1 ]]; then
      echo 'PERSISTENT_CUSTOM_FULLSCREEN_INJECTED_FAILURE=YES'
      false
    fi
    (
      trap - ERR
      set +E
      cd "$AGENT_ROOT"
      "$NPM" run typecheck --workspace web
      "$NPM" run test --workspace web -- --run src/lib/persistent-fullscreen.test.ts src/lib/three-gold-shortcuts.test.ts src/lib/briefs.test.ts --testTimeout=15000
      "$NPM" run test --workspace web -- --testTimeout=15000 --maxWorkers=1
      "$NPM" run build --workspace web
    )
    verify_installed
    restart_dashboard
    TOUCHED=0
    trap - ERR INT TERM
    echo 'PERSISTENT_CUSTOM_FULLSCREEN_INSTALL=PASS'
    echo "ROLLBACK=$BACKUP/RESTORE_THIS_BACKUP.command"
    ;;
  *) echo "UNKNOWN_MODE=$MODE"; exit 2 ;;
esac
