#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PAYLOAD="$PACKAGE_DIR/payload"
MODE="${1:-}"
[[ -n "$MODE" ]] && shift || true
PROFILE="${HERMES_PROFILE:-default}"
OWNER=""
YES=0
BACKUP_OVERRIDE=""
FAIL_AT="${GIT_WATCH_GOLDEN_FAIL_AT:-}"

usage() {
  cat <<'EOF'
Usage: git-watch-golden-manager.sh install|factory-reset|uninstall [options]
       git-watch-golden-manager.sh rollback --backup PATH [options]

Options:
  --profile NAME   Hermes profile name (default: default)
  --owner NAME     GitHub username used to highlight owner comments
  --backup PATH    Backup folder used by rollback mode
  --yes            Confirm the requested operation
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="${2:-}"; shift 2 ;;
    --owner) OWNER="${2:-}"; shift 2 ;;
    --backup) BACKUP_OVERRIDE="${2:-}"; shift 2 ;;
    --yes) YES=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$MODE" in
  install|factory-reset|uninstall|rollback) ;;
  *) usage >&2; exit 2 ;;
esac
[[ "$PROFILE" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "Profile names may contain only letters, numbers, dot, underscore, and hyphen." >&2; exit 2; }
[[ "$YES" == 1 ]] || { echo "Confirmation missing. Use one of the numbered beginner launchers or pass --yes." >&2; exit 2; }
if [[ -n "$OWNER" && ! "$OWNER" =~ ^[A-Za-z0-9-]+$ ]]; then
  echo "GitHub username may contain only letters, numbers, and hyphens." >&2
  exit 2
fi

HERMES_HOME="${GIT_WATCH_GOLDEN_HOME:-${HERMES_HOME:-$HOME/.hermes}}"
if [[ "$PROFILE" == "default" ]]; then
  PROFILE_HOME="$HERMES_HOME"
else
  PROFILE_HOME="$HERMES_HOME/profiles/$PROFILE"
fi
LAUNCH_HOME="$HERMES_HOME"
PLUGIN_REL="plugins/git-comments-v27-review/dashboard"
CHECKER_REL="scripts/github-comments-checker-v27-review.sh"
LAUNCH_PLUGIN="$LAUNCH_HOME/$PLUGIN_REL"
PROFILE_PLUGIN="$PROFILE_HOME/$PLUGIN_REL"
LAUNCH_CHECKER="$LAUNCH_HOME/$CHECKER_REL"
PROFILE_CHECKER="$PROFILE_HOME/$CHECKER_REL"
RECEIPT="$PROFILE_HOME/git-watch-golden-install.json"
BACKUP_ROOT="$PROFILE_HOME/backups/git-watch-golden"
SAME_PROFILE=0
[[ "$PROFILE_HOME" == "$LAUNCH_HOME" ]] && SAME_PROFILE=1
STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP="${BACKUP_OVERRIDE:-$BACKUP_ROOT/$STAMP-$MODE}"
TOUCHED=0
RESTORING=0

exists_even_symlink() { [[ -e "$1" || -L "$1" ]]; }

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

was_present() {
  grep -Fqx "$1" "$BACKUP/present.txt" 2>/dev/null
}

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
  restore_one "$PROFILE_PLUGIN" profile-plugin
  restore_one "$PROFILE_CHECKER" profile-checker
  restore_one "$RECEIPT" receipt
  if [[ "$SAME_PROFILE" == 0 ]]; then
    restore_one "$LAUNCH_PLUGIN" launch-plugin
    restore_one "$LAUNCH_CHECKER" launch-checker
  fi
  RESTORING=0
}

on_exit() {
  local status=$?
  if [[ $status -ne 0 && "$TOUCHED" == 1 && "$RESTORING" == 0 ]]; then
    echo "A verification failed; restoring the previous Git Watch installation…" >&2
    restore_from_backup || true
    echo "AUTOMATIC_ROLLBACK=PASS" >&2
  fi
  exit "$status"
}
trap on_exit EXIT

if [[ "$MODE" != "rollback" ]]; then
  for required in \
    "$PAYLOAD/dashboard/dist/index.js" \
    "$PAYLOAD/dashboard/plugin_api.py" \
    "$PAYLOAD/dashboard/manifest.json" \
    "$PAYLOAD/scripts/github-comments-checker-v27-review.sh" \
    "$PAYLOAD/data/watchlist.clean.json"; do
    [[ -f "$required" ]] || { echo "Golden payload is incomplete: $required" >&2; exit 1; }
  done
  if [[ -f "$PACKAGE_DIR/CHECKSUMS.sha256" ]]; then
    (cd "$PACKAGE_DIR" && shasum -a 256 -c CHECKSUMS.sha256 >/dev/null)
  fi
fi

if [[ "$MODE" == "rollback" ]]; then
  [[ -n "$BACKUP_OVERRIDE" && -d "$BACKUP" ]] || { echo "Rollback backup not found: $BACKUP" >&2; exit 1; }
  restore_from_backup
  echo "GIT_WATCH_GOLDEN_ROLLBACK=PASS"
  echo "RESTORED_BACKUP=$BACKUP"
  exit 0
fi

mkdir -p "$BACKUP"
: > "$BACKUP/present.txt"
: > "$BACKUP/missing.txt"
backup_one "$PROFILE_PLUGIN" profile-plugin
backup_one "$PROFILE_CHECKER" profile-checker
backup_one "$RECEIPT" receipt
if [[ "$SAME_PROFILE" == 0 ]]; then
  backup_one "$LAUNCH_PLUGIN" launch-plugin
  backup_one "$LAUNCH_CHECKER" launch-checker
fi
cp "$0" "$BACKUP/git-watch-golden-manager.sh"
chmod 755 "$BACKUP/git-watch-golden-manager.sh"
printf '#!/usr/bin/env bash\nset -euo pipefail\nSCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"\nexec bash "$SCRIPT_DIR/git-watch-golden-manager.sh" rollback --profile %q --backup "$SCRIPT_DIR" --yes\n' "$PROFILE" > "$BACKUP/RESTORE_THIS_BACKUP.command"
chmod 755 "$BACKUP/RESTORE_THIS_BACKUP.command"
TOUCHED=1

if [[ "$MODE" == "uninstall" ]]; then
  rm -rf "$PROFILE_HOME/plugins/git-comments-v27-review"
  rm -f "$PROFILE_CHECKER" "$RECEIPT"
  if [[ "$SAME_PROFILE" == 0 ]]; then
    rm -rf "$LAUNCH_HOME/plugins/git-comments-v27-review"
    rm -f "$LAUNCH_CHECKER"
  fi
  TOUCHED=0
  echo "GIT_WATCH_GOLDEN_UNINSTALL=PASS"
  echo "RECOVERY_BACKUP=$BACKUP"
  echo "Nothing in Briefs or the production git-comments plugin was changed."
  exit 0
fi

# If an older launch-only installation has real data, adopt it before making
# the named profile copy authoritative.
if [[ "$SAME_PROFILE" == 0 && ! -e "$PROFILE_PLUGIN/data" && -d "$LAUNCH_PLUGIN/data" && ! -L "$LAUNCH_PLUGIN/data" ]]; then
  mkdir -p "$PROFILE_PLUGIN"
  cp -a "$LAUNCH_PLUGIN/data" "$PROFILE_PLUGIN/data"
fi

install_runtime() {
  local root="$1"
  mkdir -p "$root/dist"
  cp "$PAYLOAD/dashboard/dist/index.js" "$root/dist/index.js.tmp.$$"
  mv -f "$root/dist/index.js.tmp.$$" "$root/dist/index.js"
  cp "$PAYLOAD/dashboard/plugin_api.py" "$root/plugin_api.py.tmp.$$"
  mv -f "$root/plugin_api.py.tmp.$$" "$root/plugin_api.py"
  cp "$PAYLOAD/dashboard/manifest.json" "$root/manifest.json.tmp.$$"
  mv -f "$root/manifest.json.tmp.$$" "$root/manifest.json"
}
install_checker() {
  local destination="$1"
  mkdir -p "$(dirname "$destination")"
  cp "$PAYLOAD/scripts/github-comments-checker-v27-review.sh" "$destination.tmp.$$"
  chmod 755 "$destination.tmp.$$"
  mv -f "$destination.tmp.$$" "$destination"
}

install_runtime "$PROFILE_PLUGIN"
install_checker "$PROFILE_CHECKER"
if [[ "$SAME_PROFILE" == 0 ]]; then
  install_runtime "$LAUNCH_PLUGIN"
  install_checker "$LAUNCH_CHECKER"
fi

if [[ "$FAIL_AT" == "after-runtime" ]]; then
  echo "Injected test failure after runtime installation." >&2
  exit 97
fi

DATA_DIR="$PROFILE_PLUGIN/data"
WATCHLIST="$DATA_DIR/watchlist.json"
mkdir -p "$DATA_DIR"
if [[ "$MODE" == "factory-reset" ]]; then
  [[ -n "$OWNER" ]] || { echo "Factory reset requires --owner GITHUB_USERNAME." >&2; exit 2; }
  rm -f "$DATA_DIR/git-comments.json" "$DATA_DIR/watcher-health.json"
  python3 - "$PAYLOAD/data/watchlist.clean.json" "$WATCHLIST" "$OWNER" <<'PY'
import json, sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
payload["comment_owner"] = sys.argv[3]
Path(sys.argv[2]).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY
  echo "FACTORY_RESET_DATA=PASS"
elif [[ -f "$WATCHLIST" ]]; then
  echo "PRESERVED_EXISTING_DATA=PASS"
else
  [[ -n "$OWNER" ]] || OWNER="GitHub-User"
  python3 - "$PAYLOAD/data/watchlist.clean.json" "$WATCHLIST" "$OWNER" <<'PY'
import json, sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
payload["comment_owner"] = sys.argv[3]
Path(sys.argv[2]).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY
  echo "CREATED_CLEAN_DATA=PASS"
fi

if [[ "$SAME_PROFILE" == 0 ]]; then
  rm -rf "$LAUNCH_PLUGIN/data"
  ln -s "$DATA_DIR" "$LAUNCH_PLUGIN/data"
fi

if command -v node >/dev/null 2>&1; then
  node --check "$PROFILE_PLUGIN/dist/index.js" >/dev/null
fi
python3 - "$PROFILE_PLUGIN/plugin_api.py" "$WATCHLIST" <<'PY'
import json, sys
from pathlib import Path
compile(Path(sys.argv[1]).read_text(encoding="utf-8"), sys.argv[1], "exec")
watch = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert watch.get("schema_version") == 1
assert isinstance(watch.get("active"), list) and isinstance(watch.get("archived"), list)
assert isinstance(watch.get("comment_owner"), str) and watch["comment_owner"].strip()
PY
bash -n "$PROFILE_CHECKER"
if [[ "$SAME_PROFILE" == 0 ]]; then
  cmp -s "$PROFILE_PLUGIN/dist/index.js" "$LAUNCH_PLUGIN/dist/index.js"
  cmp -s "$PROFILE_PLUGIN/plugin_api.py" "$LAUNCH_PLUGIN/plugin_api.py"
  cmp -s "$PROFILE_PLUGIN/manifest.json" "$LAUNCH_PLUGIN/manifest.json"
fi

python3 - "$RECEIPT" "$PROFILE" "$PROFILE_HOME" "$BACKUP" "$MODE" <<'PY'
import json, sys
from datetime import datetime, timezone
from pathlib import Path
payload = {
  "schema_version": 1,
  "release": "Git Watch Golden Release R52",
  "profile": sys.argv[2],
  "profile_home": sys.argv[3],
  "installed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
  "backup": sys.argv[4],
  "operation": sys.argv[5],
  "runtime_identity": "git-comments-v27-review",
  "display_label": "GIT WATCH"
}
path = Path(sys.argv[1]); path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY

if [[ "${GIT_WATCH_GOLDEN_SKIP_ENABLE:-0}" != 1 ]] && command -v hermes >/dev/null 2>&1; then
  if [[ "$PROFILE" == "default" ]]; then
    hermes plugins enable git-comments-v27-review --no-allow-tool-override >/dev/null 2>&1 || echo "NOTE: Restart Hermes Desktop and enable git-comments-v27-review if the GIT WATCH tab is not visible."
  else
    hermes -p "$PROFILE" plugins enable git-comments-v27-review --no-allow-tool-override >/dev/null 2>&1 || echo "NOTE: Restart Hermes Desktop and enable git-comments-v27-review for profile $PROFILE if the GIT WATCH tab is not visible."
  fi
fi

TOUCHED=0
echo "GIT_WATCH_GOLDEN_INSTALL=PASS"
echo "PROFILE=$PROFILE"
echo "PROFILE_PLUGIN=$PROFILE_PLUGIN"
echo "BACKUP=$BACKUP"
echo "ROLLBACK=$BACKUP/RESTORE_THIS_BACKUP.command"
echo "Restart Hermes Desktop, then open the GIT WATCH tab."
