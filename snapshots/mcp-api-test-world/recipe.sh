#!/usr/bin/env bash
set -euo pipefail
RECIPE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
cleanup() {
  status=$?
  if [[ $status != 0 ]]; then rm -f /workspace/output/verification.json; fi
  exit "$status"
}
trap cleanup EXIT
node "$RECIPE_DIR/recipe.mjs" "${1:-}"
