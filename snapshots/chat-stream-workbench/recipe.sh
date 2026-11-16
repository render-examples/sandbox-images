#!/usr/bin/env bash
set -euo pipefail
exec node /opt/render/runtime/node-recipe.ts "$1" "$(dirname "$0")/recipe.json"
