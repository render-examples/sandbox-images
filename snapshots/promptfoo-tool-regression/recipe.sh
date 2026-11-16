#!/bin/sh
set -eu
exec node /opt/render/runtime/node-recipe.mjs "$1" "$(dirname "$0")/recipe.json"
