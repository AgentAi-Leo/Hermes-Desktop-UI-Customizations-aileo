#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$DIR/scripts/three-gold-production-manager.sh" install --profile local-ai-assist1 --yes
