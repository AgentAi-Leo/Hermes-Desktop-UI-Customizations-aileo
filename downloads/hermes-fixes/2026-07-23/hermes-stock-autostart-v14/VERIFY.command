#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd -P)"
EXPECTED="INSTALL.command
README.md
SHA256SUMS
VERIFY.command"
ACTUAL="$(cd "$ROOT" && /usr/bin/find . -type f -print | /usr/bin/sed 's#^./##' | /usr/bin/sort)"
[[ "$ACTUAL" == "$EXPECTED" ]] || { echo "PACKAGE_FILE_SET_INVALID"; exit 1; }
(cd "$ROOT" && /usr/bin/shasum -a 256 -c SHA256SUMS)
/bin/zsh -n "$ROOT/INSTALL.command"
printf 'HERMES_STOCK_AUTOSTART_PACKAGE=PASS
'
