#!/bin/bash
set -Eeuo pipefail
HERE="$(cd "$(/usr/bin/dirname "$0")" && pwd -P)"
exec /bin/bash "$HERE/scripts/install-shortcuts.sh" install
