#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec node /opt/render/runtime/node-recipe.ts "${1:-analyze}" recipe.json
