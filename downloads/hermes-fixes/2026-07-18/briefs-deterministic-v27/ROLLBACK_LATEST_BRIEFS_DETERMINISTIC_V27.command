#!/usr/bin/env bash
set -euo pipefail
BACKUP="$(printf '%s\n' "$HOME"/.hermes/backups/briefs-deterministic-v27-* | sort | tail -n 1)"
ROLLBACK="$BACKUP/ROLLBACK_BRIEFS_DETERMINISTIC_V27.command"
[[ -x "$ROLLBACK" ]] || { echo "No executable v27 rollback found" >&2; exit 1; }
exec "$ROLLBACK"
