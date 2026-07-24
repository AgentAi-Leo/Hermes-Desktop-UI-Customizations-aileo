#!/bin/bash
set -Eeuo pipefail
HERE="$(cd "$(/usr/bin/dirname "$0")" && pwd -P)"
AGENT_ROOT="${HERMES_AGENT_ROOT:-$HOME/.hermes/hermes-agent}"
PYTHON="$AGENT_ROOT/venv/bin/python"
exec /bin/bash "$HERE/scripts/install-shortcuts.sh" verify
