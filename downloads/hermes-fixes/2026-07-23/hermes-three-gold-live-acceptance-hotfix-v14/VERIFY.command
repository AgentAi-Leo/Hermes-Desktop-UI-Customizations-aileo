#!/bin/bash
set -Eeuo pipefail
HERE="$(cd "$(dirname "$0")" && pwd -P)"
exec /bin/bash "$HERE/scripts/live-acceptance-hotfix.sh" verify
