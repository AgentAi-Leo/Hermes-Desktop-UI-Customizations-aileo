#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
README="$DIR/README-FIRST.md"
MANAGER="$DIR/scripts/git-watch-golden-manager.sh"

echo "GIT WATCH — FACTORY RESET"
echo "WARNING: this replaces the installed watchlist/archive with an empty list."
echo "A recovery backup is created first. Instructions: $README"
echo
if [[ ! -t 0 ]]; then
  echo "Factory reset requires an interactive Terminal confirmation. Nothing changed." >&2
  echo "Advanced users should read README-FIRST.md before using the manager directly." >&2
  exit 2
fi
DEFAULT_PROFILE="${HERMES_PROFILE:-default}"
PROFILE="$DEFAULT_PROFILE"
OWNER=""
read -r -p "Hermes profile name [$DEFAULT_PROFILE]: " ANSWER
PROFILE="${ANSWER:-$DEFAULT_PROFILE}"
read -r -p "GitHub username: " OWNER
read -r -p "Type RESET to continue: " CONFIRM
[[ "$CONFIRM" == "RESET" ]] || { echo "Cancelled. Nothing changed."; exit 0; }
OWNER="${OWNER:-GitHub-User}"
bash "$MANAGER" "factory-reset" --profile "$PROFILE" --owner "$OWNER" --yes
echo
echo "Factory reset complete. Restart Hermes Desktop, then open GIT WATCH."
if [[ -t 0 ]]; then read -r -p "Press Return to close…" _; fi
