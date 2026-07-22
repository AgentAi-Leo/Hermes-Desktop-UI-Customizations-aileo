#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
shasum -a 256 -c CHECKSUMS.sha256
PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 verify_ai_v34.py
echo "BRIEFS_AI_GOLD_MASTER_TEMPLATES_V34_VERIFY=PASS"
