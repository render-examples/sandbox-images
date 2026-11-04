#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
LAB_DIR=/workspace/postgres-outbox
source /opt/render/examples/typescript-api-postgres/common.sh
cleanup() {
  local status=$?
  trap - EXIT
  if ! stop_db; then status=1; fi
  if [[ "$status" != 0 ]]; then rm -f /workspace/output/verification.json; fi
  exit "$status"
}
trap cleanup EXIT
case "${1:-}" in
 prepare) [[ ! -e "$LAB_DIR/baseline.json" && ! -e "$LAB_DIR/pgdata" ]] || exit 1; init_db ;;
 analyze|verify|test) [[ -f "$LAB_DIR/baseline.json" ]] || exit 1 ;;
 *) exit 2 ;;
esac
start_db
node "$HERE/node-recipe.mjs" "$1" "$HERE/recipe.json"
stop_db
