#!/usr/bin/env bash
set -euo pipefail
if [[ ! -f "src/styles.css" ]]; then
  echo "Run from apps/desktop."
  exit 1
fi

echo "Checking known UI customization markers..."
grep -n "composer-width" src/styles.css || true
grep -n "group/composer" src/styles.css || true
grep -R "Escape" src/app/chat/composer src/lib src/store 2>/dev/null || true
echo "Manual UI verification still required: composer responsiveness, Esc stop, playback controls, prompt copy."
