#!/usr/bin/env bash
set -euo pipefail
RECIPE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
exec python "$RECIPE_DIR/recipe.py" "$@"
