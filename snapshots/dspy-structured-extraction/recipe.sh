#!/usr/bin/env bash
set -euo pipefail
exec python /opt/render/runtime/python-recipe.py "$1" "$(dirname "$0")/recipe.json"
