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
mkdir -p "$BIN_DIR" "$LOG_DIR" "$HOME_DIR/Library/LaunchAgents" "$HOME_DIR/Applications" "$BACKUP"

for path in "$PLIST" "$SERVICE" "$OPENER"; do
  if [[ -e "$path" ]]; then /bin/cp -p "$path" "$BACKUP/$(basename "$path")"; fi
done
if [[ -d "$APP" ]]; then /usr/bin/ditto "$APP" "$BACKUP/$(basename "$APP")"; fi

"$PYTHON" - "$PLIST" "$SERVICE" "$OPENER" <<'PY'
import os, plistlib, sys
plist_path, service_path, opener_path = sys.argv[1:]
home = "/Users/jb3"
profile = "local-ai-assist1"
profile_home = f"{home}/.hermes/profiles/{profile}"
agent_root = f"{home}/.hermes/hermes-agent"
python = f"{agent_root}/venv/bin/python"
url = f"http://127.0.0.1:9120/brief-stock?profile={profile}"

opener = f'''#!/bin/zsh
set -u
URL="{url}"
BRAVE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
ENCODED="$({python} -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$URL")"
if /usr/bin/curl -fsS -X PUT "http://127.0.0.1:9222/json/new?$ENCODED" >/dev/null 2>&1; then
  exit 0
fi
"$BRAVE" --remote-debugging-port=9222 --user-data-dir="$HOME/.hermes/brave-debug" --no-first-run --no-default-browser-check "$URL" >>"{profile_home}/logs/brave-debug.log" 2>&1 &
exit 0
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
    "EnvironmentVariables": {"HOME": home, "HERMES_HOME": f"{home}/.hermes", "HERMES_PROFILE": profile},
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
