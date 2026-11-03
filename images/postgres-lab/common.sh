#!/usr/bin/env bash
# Sourced by the fixed smoke workload and snapshot recipe. No TCP listener.
set -euo pipefail
: "${LAB_DIR:?Set the owned lab directory before sourcing common.sh}"
export PATH=/usr/lib/postgresql/18/bin:/usr/local/bin:/usr/bin:/bin
export PGDATA="$LAB_DIR/pgdata" PGHOST="$LAB_DIR/socket" PGPORT=5432 PGUSER=postgres PGDATABASE=postgres

as_postgres() {
  if [[ $(id -u) == 0 ]]; then gosu postgres "$@"; else "$@"; fi
}

init_db() {
  [[ ! -e "$PGDATA/PG_VERSION" ]] || { echo "Refusing to replace an existing database" >&2; return 1; }
  mkdir -p "$LAB_DIR" "$PGHOST"
  if [[ $(id -u) == 0 ]]; then chown postgres:postgres "$LAB_DIR" "$PGHOST"; fi
  as_postgres initdb -D "$PGDATA" --username=postgres --encoding=UTF8 --locale=C --auth-local=trust --auth-host=reject > "$LAB_DIR/init.log"
}

start_db() {
  mkdir -p "$PGHOST"
  if [[ $(id -u) == 0 ]]; then chown postgres:postgres "$PGHOST"; fi
  as_postgres pg_ctl -D "$PGDATA" -l "$LAB_DIR/server.log" -w -t 20 \
    -o "-c listen_addresses='' -c unix_socket_directories='$PGHOST' -c unix_socket_permissions=0700 -c max_connections=10 -c shared_buffers=32MB" start >/dev/null
}

stop_db() {
  if [[ -f "$PGDATA/postmaster.pid" ]]; then
    as_postgres pg_ctl -D "$PGDATA" -w -t 20 -m fast stop >/dev/null
  fi
  [[ ! -f "$PGDATA/postmaster.pid" ]] || { echo "Database did not stop cleanly" >&2; return 1; }
  rmdir "$PGHOST" 2>/dev/null || true
}

sql() { as_postgres psql -X -v ON_ERROR_STOP=1 -qAt "$@"; }

cleanup_db() {
  local status=$?
  trap - EXIT
  if ! stop_db; then exit 1; fi
  exit "$status"
}
