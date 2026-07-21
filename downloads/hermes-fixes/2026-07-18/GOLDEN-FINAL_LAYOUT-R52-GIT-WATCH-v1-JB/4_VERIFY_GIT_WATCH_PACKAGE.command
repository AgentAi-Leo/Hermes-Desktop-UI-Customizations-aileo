#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
README="$DIR/README-FIRST.md"
echo "GIT WATCH — VERIFY GOLDEN RELEASE"
echo "Instructions: $README"
echo
cd "$DIR"
shasum -a 256 -c CHECKSUMS.sha256
echo
echo "GIT_WATCH_GOLDEN_PACKAGE_VERIFICATION=PASS"
if [[ -t 0 ]]; then read -r -p "Press Return to close…" _; fi
