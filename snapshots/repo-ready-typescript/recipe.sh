#!/usr/bin/env bash
set -euo pipefail
exec node "$(dirname "$0")/recipe.mjs" "${1:?Expected prepare, analyze, verify, or test}"
