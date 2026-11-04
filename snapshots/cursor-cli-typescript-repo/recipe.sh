#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
node /opt/render/runtime/node-recipe.mjs "$1" "$HERE/recipe.json"
