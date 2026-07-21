#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
README="$DIR/README-FIRST.md"
MANAGER="$DIR/scripts/git-watch-golden-manager.sh"

echo "GIT WATCH — UNINSTALL"
echo "This removes only the namespaced Golden Release installation."
echo "A recovery backup is created first. Instructions: $README"
echo
if [[ ! -t 0 ]]; then
  echo "Uninstall requires an interactive Terminal confirmation. Nothing changed." >&2
  echo "Advanced users should read README-FIRST.md before using the manager directly." >&2
  exit 2
fi
DEFAULT_PROFILE="${HERMES_PROFILE:-default}"
PROFILE="$DEFAULT_PROFILE"
read -r -p "Hermes profile name [$DEFAULT_PROFILE]: " ANSWER
PROFILE="${ANSWER:-$DEFAULT_PROFILE}"
read -r -p "Type REMOVE to continue: " CONFIRM
[[ "$CONFIRM" == "REMOVE" ]] || { echo "Cancelled. Nothing changed."; exit 0; }
bash "$MANAGER" "uninstall" --profile "$PROFILE" --yes
echo
echo "Uninstall complete. Restart Hermes Desktop."
if [[ -t 0 ]]; then read -r -p "Press Return to close…" _; fi
