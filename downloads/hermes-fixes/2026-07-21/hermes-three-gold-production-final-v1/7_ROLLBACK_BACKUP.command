#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 1 ]]; then echo "Usage: $0 /absolute/path/to/backup" >&2; exit 2; fi
DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$DIR/scripts/three-gold-production-manager.sh" rollback --profile local-ai-assist1 --backup "$1" --yes
