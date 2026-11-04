#!/bin/sh
set -eu
# This option is implemented by the pinned upstream CLI; vendor files are unchanged.
exec /opt/cursor/2026.10.22-27dcf5f/cursor-agent --disable-auto-update "$@"
