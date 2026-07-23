#!/bin/zsh
set -euo pipefail

HOME_DIR="/Users/jb3"
HERMES_HOME="$HOME_DIR/.hermes"
PROFILE="local-ai-assist1"
PROFILE_HOME="$HERMES_HOME/profiles/$PROFILE"
AGENT_ROOT="$HERMES_HOME/hermes-agent"
PYTHON="$AGENT_ROOT/venv/bin/python"
LABEL="com.aileo.hermes-local-ai-assist1-dashboard"
PLIST="$HOME_DIR/Library/LaunchAgents/$LABEL.plist"
BIN_DIR="$PROFILE_HOME/bin"
LOG_DIR="$PROFILE_HOME/logs"
SERVICE="$BIN_DIR/hermes-stock-dashboard-service"
OPENER="$BIN_DIR/open-hermes-brief-stock"
APP="$HOME_DIR/Applications/Hermes Dash-CUSTOM.app"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$PROFILE_HOME/backups/hermes-stock-launchagent/$STAMP"
DOMAIN="gui/$(id -u)"
URL="http://127.0.0.1:9120/brief-stock?profile=$PROFILE"

[[ -x "$PYTHON" ]] || { echo "PYTHON_MISSING=$PYTHON"; exit 1; }
[[ -x "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" ]] || { echo "BRAVE_MISSING=YES"; exit 1; }
NPM_PATH="$(command -v npm || true)"
[[ -n "$NPM_PATH" && -x "$NPM_PATH" ]] || { echo "NPM_MISSING_IN_INTERACTIVE_PATH=YES"; exit 1; }
NPM_DIR="$(dirname "$NPM_PATH")"
mkdir -p "$BIN_DIR" "$LOG_DIR" "$HOME_DIR/Library/LaunchAgents" "$HOME_DIR/Applications" "$BACKUP"

for path in "$PLIST" "$SERVICE" "$OPENER"; do
  if [[ -e "$path" ]]; then /bin/cp -p "$path" "$BACKUP/$(basename "$path")"; fi
done
if [[ -d "$APP" ]]; then /usr/bin/ditto "$APP" "$BACKUP/$(basename "$APP")"; fi

"$PYTHON" - "$PLIST" "$SERVICE" "$OPENER" "$NPM_DIR" <<'PY'
import os, plistlib, sys
plist_path, service_path, opener_path, npm_dir = sys.argv[1:]
home = "/Users/jb3"
profile = "local-ai-assist1"
profile_home = f"{home}/.hermes/profiles/{profile}"
agent_root = f"{home}/.hermes/hermes-agent"
python = f"{agent_root}/venv/bin/python"
url = f"http://127.0.0.1:9120/brief-stock?profile={profile}"

opener = f'''#!/bin/zsh
set -u
URL="{url}"
PYTHON="{python}"
BRAVE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
PROFILE_DIR="{profile_home}/runtime/brave-dash-custom"
LOG="{profile_home}/logs/brave-debug.log"

if ! /usr/bin/curl -fsS http://127.0.0.1:9222/json/version >/dev/null 2>&1; then
  /bin/rm -rf "$PROFILE_DIR"
  /bin/mkdir -p "$PROFILE_DIR"
  "$BRAVE" --remote-debugging-port=9222 --user-data-dir="$PROFILE_DIR" --no-first-run --no-default-browser-check --disable-session-crashed-bubble about:blank >>"$LOG" 2>&1 &
  ready=0
  for _ in {{1..120}}; do
    if /usr/bin/curl -fsS http://127.0.0.1:9222/json/version >/dev/null 2>&1; then ready=1; break; fi
    /bin/sleep 0.25
  done
  [[ "$ready" == "1" ]] || {{ echo "BRAVE_CDP_READY_TIMEOUT" >>"$LOG"; exit 1; }}
fi

"$PYTHON" - "$URL" >>"$LOG" 2>&1 <<'PYOPEN'
import json, sys, time, urllib.parse, urllib.request
base = "http://127.0.0.1:9222"
url = sys.argv[1]
new_request = urllib.request.Request(base + "/json/new?" + urllib.parse.quote(url, safe=""), method="PUT")
with urllib.request.urlopen(new_request, timeout=5) as response:
    keep = json.load(response)["id"]
with urllib.request.urlopen(base + "/json/list", timeout=5) as response:
    targets = json.load(response)
for target in targets:
    if target.get("type") == "page" and target.get("id") != keep:
        close_url = base + "/json/close/" + urllib.parse.quote(target["id"], safe="")
        try:
            urllib.request.urlopen(close_url, timeout=5).read()
        except Exception:
            close_request = urllib.request.Request(close_url, method="PUT")
            urllib.request.urlopen(close_request, timeout=5).read()
time.sleep(0.25)
with urllib.request.urlopen(base + "/json/list", timeout=5) as response:
    pages = [target for target in json.load(response) if target.get("type") == "page"]
if len(pages) != 1 or pages[0].get("id") != keep or pages[0].get("url") != url:
    raise SystemExit("BRAVE_SINGLE_FRESH_TAB_VERIFY_FAILED")
print("BRAVE_SINGLE_FRESH_TAB=PASS")
PYOPEN
'''

service = f'''#!/bin/zsh
set -u
PYTHON="{python}"
AGENT_ROOT="{agent_root}"
PROFILE="{profile}"
OPENER="{opener_path}"
cd "$AGENT_ROOT" || exit 1
"$PYTHON" -m hermes_cli.main -p "$PROFILE" dashboard --isolated --port 9120 --no-open &
DASHBOARD_PID=$!
cleanup() {{ /bin/kill "$DASHBOARD_PID" 2>/dev/null || true; }}
trap cleanup EXIT INT TERM
ready=0
for _ in {{1..120}}; do
  if /usr/bin/curl -fsS http://127.0.0.1:9120/ >/dev/null 2>&1; then ready=1; break; fi
  /bin/kill -0 "$DASHBOARD_PID" 2>/dev/null || {{ wait "$DASHBOARD_PID"; exit $?; }}
  /bin/sleep 0.5
done
[[ "$ready" == "1" ]] || {{ echo "DASHBOARD_READY_TIMEOUT"; exit 1; }}
"$OPENER" || true
wait "$DASHBOARD_PID"
'''

for path, content in [(opener_path, opener), (service_path, service)]:
    with open(path, "w", encoding="utf-8", newline="\n") as f: f.write(content)
    os.chmod(path, 0o755)

plist = {
    "Label": "com.aileo.hermes-local-ai-assist1-dashboard",
    "ProgramArguments": ["/bin/zsh", service_path],
    "WorkingDirectory": agent_root,
    "EnvironmentVariables": {
        "HOME": home,
        "HERMES_HOME": f"{home}/.hermes",
        "HERMES_PROFILE": profile,
        "PATH": f"{npm_dir}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    },
    "RunAtLoad": True,
    "KeepAlive": True,
    "ThrottleInterval": 10,
    "ProcessType": "Interactive",
    "StandardOutPath": f"{profile_home}/logs/dashboard-launchagent.log",
    "StandardErrorPath": f"{profile_home}/logs/dashboard-launchagent-error.log",
}
with open(plist_path, "wb") as f: plistlib.dump(plist, f, sort_keys=True)
os.chmod(plist_path, 0o644)
PY

/usr/bin/plutil -lint "$PLIST"

APP_TMP="$APP.installing"
/bin/rm -rf "$APP_TMP"
/usr/bin/osacompile -o "$APP_TMP" -e "do shell script \"$OPENER >/dev/null 2>&1 &\""
/bin/rm -rf "$APP"
/bin/mv "$APP_TMP" "$APP"

/bin/launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true

PIDS="$(/usr/sbin/lsof -tiTCP:9120 -sTCP:LISTEN 2>/dev/null || true)"
for pid in $PIDS; do
  cmd="$(/bin/ps -p "$pid" -o command= 2>/dev/null || true)"
  if [[ "$cmd" == *"hermes_cli.main"* && "$cmd" == *"dashboard"* && "$cmd" == *"local-ai-assist1"* ]]; then
    /bin/kill -TERM "$pid"
  else
    echo "PORT_9120_OCCUPIED_BY_UNEXPECTED_PROCESS=$pid"
    exit 1
  fi
done
for _ in {1..40}; do
  [[ -z "$(/usr/sbin/lsof -tiTCP:9120 -sTCP:LISTEN 2>/dev/null || true)" ]] && break
  /bin/sleep 0.25
done
[[ -z "$(/usr/sbin/lsof -tiTCP:9120 -sTCP:LISTEN 2>/dev/null || true)" ]] || { echo "PORT_9120_DID_NOT_STOP"; exit 1; }

/bin/launchctl bootstrap "$DOMAIN" "$PLIST"
/bin/launchctl enable "$DOMAIN/$LABEL"
/bin/launchctl kickstart -k "$DOMAIN/$LABEL"

ready=0
for _ in {1..120}; do
  if /usr/bin/curl -fsS http://127.0.0.1:9120/ >/dev/null 2>&1; then ready=1; break; fi
  /bin/sleep 0.5
done
[[ "$ready" == "1" ]] || { echo "LAUNCH_AGENT_DASHBOARD_TIMEOUT"; exit 1; }
/bin/launchctl print "$DOMAIN/$LABEL" >/dev/null
/bin/sleep 1

printf 'HERMES_STOCK_LAUNCH_AGENT=PASS\n'
printf 'DASHBOARD_URL=%s\n' "$URL"
printf 'LAUNCHER_APP=%s\n' "$APP"
printf 'BACKUP=%s\n' "$BACKUP"
printf 'OPEN_FROM_SPOTLIGHT=Hermes Dash-CUSTOM\n'
