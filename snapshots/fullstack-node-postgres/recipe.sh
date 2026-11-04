#!/usr/bin/env bash
set -euo pipefail
RECIPE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
LAB_DIR=/workspace/fullstack-node-postgres
source /opt/render/examples/typescript-api-postgres/common.sh
# Include wrapper precondition/startup/shutdown failures in receipt invalidation.
cleanup_recipe() {
  local status=$?
  trap - EXIT
  if ! stop_db; then status=1; fi
  if [[ "$status" != 0 ]]; then rm -f /workspace/output/verification.json; fi
  exit "$status"
}
trap cleanup_recipe EXIT
case "${1:-}" in
  prepare)
    [[ ! -e "$LAB_DIR/project" && ! -e "$LAB_DIR/baseline.json" ]] || { echo 'Refusing to overwrite prepared state' >&2; exit 1; }
    init_db
    start_db
    node "$RECIPE_DIR/recipe.mjs" prepare
    stop_db
    ;;
  analyze|verify|test)
    [[ -f "$LAB_DIR/baseline.json" ]] || { echo 'Prepare the recipe first' >&2; exit 1; }
    start_db
    node "$RECIPE_DIR/recipe.mjs" "$1"
    stop_db
    ;;
  *) echo 'Usage: recipe.sh prepare|analyze|verify|test' >&2; exit 2 ;;
esac
