#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec node /opt/render/runtime/node-recipe.mjs "${1:-analyze}" recipe.json
