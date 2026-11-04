#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec python /opt/render/runtime/python-recipe.py "${1:-analyze}" recipe.json
