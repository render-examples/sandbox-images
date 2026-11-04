#!/usr/bin/env bash
set -euo pipefail
RECIPE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
cleanup() { local status=$?; trap - EXIT; if [[ "$status" != 0 ]]; then rm -f /workspace/output/verification.json; fi; exit "$status"; }
trap cleanup EXIT
case "${1:-}" in prepare|analyze|grade|verify|test) node "$RECIPE_DIR/recipe.mjs" "$1" ;; *) echo 'Usage: recipe.sh prepare|analyze|grade|verify|test' >&2; exit 2 ;; esac
