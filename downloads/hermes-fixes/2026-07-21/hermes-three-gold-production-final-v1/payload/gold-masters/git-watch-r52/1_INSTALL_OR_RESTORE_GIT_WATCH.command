#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
README="$DIR/README-FIRST.md"
MANAGER="$DIR/scripts/git-watch-golden-manager.sh"

echo "GIT WATCH — SAFE INSTALL OR RESTORE"
echo "This keeps any existing watchlist and archive data."
echo "Instructions: $README"
echo
DEFAULT_PROFILE="${HERMES_PROFILE:-default}"
PROFILE="$DEFAULT_PROFILE"
if [[ -t 0 ]]; then
  read -r -p "Hermes profile name [$DEFAULT_PROFILE]: " ANSWER
  PROFILE="${ANSWER:-$DEFAULT_PROFILE}"
fi
OWNER=""
if command -v gh >/dev/null 2>&1; then OWNER="$(gh api user --jq .login 2>/dev/null || true)"; fi
if [[ -z "$OWNER" && -t 0 ]]; then
  read -r -p "GitHub username (used only for a brand-new clean install): " OWNER
fi
OWNER="${OWNER:-GitHub-User}"
bash "$MANAGER" "install" --profile "$PROFILE" --owner "$OWNER" --yes
echo
echo "Done. Restart Hermes Desktop, then open GIT WATCH."
if [[ -t 0 ]]; then read -r -p "Press Return to close…" _; fi
