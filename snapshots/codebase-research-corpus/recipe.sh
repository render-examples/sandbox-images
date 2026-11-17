#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
exec node "$HERE/node-recipe.ts" "${1:-}" "$HERE/recipe.json"
