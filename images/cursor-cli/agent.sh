#!/bin/sh
set -eu
# Cursor prewarms DNS even for metadata commands. Bound resolver retries so
# these commands can exit when a deny-all sandbox drops external DNS packets.
if [ "$#" -eq 1 ]; then
    case "$1" in
        --version|-v|--help|-h)
            export RES_OPTIONS="${RES_OPTIONS:+$RES_OPTIONS }attempts:1 timeout:1"
            ;;
    esac
fi
# This option is implemented by the pinned upstream CLI; vendor files are unchanged.
exec /opt/cursor/2026.10.22-27dcf5f/cursor-agent --disable-auto-update "$@"
