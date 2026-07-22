#!/usr/bin/env bash
set -euo pipefail
: "${THREE_GOLD_HERMES_HOME:?Set THREE_GOLD_HERMES_HOME to a disposable candidate root}"
: "${THREE_GOLD_AGENT_ROOT:?Set THREE_GOLD_AGENT_ROOT to a disposable agent fixture}"
DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$DIR/scripts/three-gold-production-manager.sh" candidate-install --profile local-ai-assist1 --yes
