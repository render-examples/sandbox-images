#!/usr/bin/env bash
set -euo pipefail
RECIPE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
LAB_DIR=/workspace/migration-lab
OUTPUT=/workspace/output
source /opt/render/examples/postgres-lab/common.sh
export PGOPTIONS='-c statement_timeout=5000 -c lock_timeout=2000'
EXPECTED='{"customers":2,"rows":4,"totalCents":12750,"backfilledRows":4,"constraintRejections":3,"failedMigrationRolledBack":true,"downgradePreserved":true}'
ARTIFACTS=(summary.json stages.csv upgraded.csv constraints.csv downgraded.csv)

baseline_csv() {
  printf 'id,customer_id,total,status\n1,1,20.00,paid\n2,1,15.00,paid\n3,2,10.00,pending\n4,2,82.50,paid\n'
}
upgraded_csv() {
  printf 'id,customer_id,total_cents,currency,status\n1,1,2000,EUR,paid\n2,1,1500,EUR,paid\n3,2,1000,EUR,pending\n4,2,8250,EUR,paid\n'
}
rows_csv() { sql -c 'COPY (SELECT id,customer_id,total,status FROM orders ORDER BY id) TO STDOUT WITH CSV HEADER'; }
upgraded_rows_csv() { sql -c 'COPY (SELECT id,customer_id,total_cents,currency,status FROM orders ORDER BY id) TO STDOUT WITH CSV HEADER'; }

baseline_json() {
  local file comma=''
  printf '{"schemaVersion":1,"inputs":{'
  for file in seed.sql upgrade.sql failing-migration.sql downgrade.sql; do
    printf '%s"%s":"%s"' "$comma" "$file" "$(sha256sum "$RECIPE_DIR/$file" | cut -d' ' -f1)"
    comma=,
  done
  printf '},"expected":%s}\n' "$EXPECTED"
}

check_baseline() {
  cmp -s "$LAB_DIR/baseline.json" <(baseline_json) || { echo 'Baseline or migration inputs changed' >&2; return 1; }
}

assert_original_database() {
  cmp -s <(rows_csv) <(baseline_csv) || { echo 'Original order data differs' >&2; return 1; }
  [[ $(sql -c "SELECT string_agg(id::text || ':' || name, ',' ORDER BY id) FROM customers") == '1:Example A,2:Example B' ]]
  # Column order can change after a downgrade; identity/type/nullability may not.
  [[ $(sql -c "SELECT string_agg(column_name || ':' || data_type || ':' || is_nullable, ',' ORDER BY column_name) FROM information_schema.columns WHERE table_schema='public' AND table_name='orders'") == 'customer_id:integer:NO,id:integer:NO,status:text:NO,total:numeric:NO' ]]
  [[ $(sql -c "SELECT numeric_precision || ':' || numeric_scale FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='total'") == '10:2' ]]
  [[ $(sql -c "SELECT string_agg(conname || ':' || pg_get_constraintdef(oid), ',' ORDER BY conname) FROM pg_constraint WHERE conrelid='orders'::regclass AND contype <> 'n'") == "orders_customer_id_fkey:FOREIGN KEY (customer_id) REFERENCES customers(id),orders_pkey:PRIMARY KEY (id),orders_status_check:CHECK ((status = ANY (ARRAY['paid'::text, 'pending'::text]))),orders_total_check:CHECK ((total >= (0)::numeric))" ]]
}

expect_rejection() {
  local statement=$1 state=$2 error_file=$3 actual
  if sql -v VERBOSITY=verbose -c "$statement" > /dev/null 2> "$error_file"; then
    echo 'Expected database rejection did not occur' >&2; return 1
  fi
  actual=$(sed -n 's/^ERROR:  *\([0-9A-Z]\{5\}\):.*/\1/p' "$error_file")
  [[ "$actual" == "$state" ]] || { cat "$error_file" >&2; return 1; }
}

stage_row() {
  local label=$1 amount=$2 destination=$3
  sql -c "SELECT '$label,' || count(*) || ',' || sum($amount)::bigint FROM orders" >> "$destination/stages.csv"
}

rehearse() {
  local destination=$1
  mkdir -p "$destination"
  assert_original_database
  [[ $(sql -c 'SHOW listen_addresses') == '' ]]
  printf 'stage,rows,total_cents\n' > "$destination/stages.csv"
  stage_row baseline 'total * 100' "$destination"
  # The caller opens mode-0600 uploaded files before switching to postgres.
  sql < "$RECIPE_DIR/upgrade.sql"
  upgraded_rows_csv > "$destination/upgraded.csv"
  cmp -s "$destination/upgraded.csv" <(upgraded_csv)
  [[ $(sql -c "SELECT string_agg(column_name || ':' || data_type || ':' || is_nullable, ',' ORDER BY column_name) FROM information_schema.columns WHERE table_schema='public' AND table_name='orders'") == 'currency:text:NO,customer_id:integer:NO,id:integer:NO,status:text:NO,total_cents:bigint:NO' ]]
  stage_row upgraded total_cents "$destination"
  printf 'case,sqlstate\n' > "$destination/constraints.csv"
  expect_rejection 'UPDATE orders SET total_cents=-1 WHERE id=1' 23514 "$LAB_DIR/expected-error.log"
  printf 'negative-total,23514\n' >> "$destination/constraints.csv"
  expect_rejection "UPDATE orders SET currency='INVALID' WHERE id=1" 23514 "$LAB_DIR/expected-error.log"
  printf 'unsupported-currency,23514\n' >> "$destination/constraints.csv"
  expect_rejection 'UPDATE orders SET total_cents=NULL WHERE id=1' 23502 "$LAB_DIR/expected-error.log"
  printf 'null-total,23502\n' >> "$destination/constraints.csv"
  if sql -v VERBOSITY=verbose < "$RECIPE_DIR/failing-migration.sql" > /dev/null 2> "$LAB_DIR/expected-error.log"; then
    echo 'Intentionally failing migration succeeded' >&2; return 1
  fi
  [[ $(sed -n 's/^ERROR:  *\([0-9A-Z]\{5\}\):.*/\1/p' "$LAB_DIR/expected-error.log") == 23514 ]]
  [[ $(sql -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='failed_marker'") == 0 ]]
  cmp -s <(upgraded_rows_csv) <(upgraded_csv)
  stage_row failed_migration_rolled_back total_cents "$destination"
  sql < "$RECIPE_DIR/downgrade.sql"
  assert_original_database
  rows_csv > "$destination/downgraded.csv"
  stage_row downgraded 'total * 100' "$destination"
  sql -c "SELECT json_build_object('customers',(SELECT count(*) FROM customers),'rows',count(*),'totalCents',sum(total*100)::bigint,'backfilledRows',count(*),'constraintRejections',3,'failedMigrationRolledBack',true,'downgradePreserved',true) FROM orders" | tr -d '[:space:]' > "$destination/summary.json"
  printf '\n' >> "$destination/summary.json"
  [[ $(cat "$destination/summary.json") == "$EXPECTED" ]]
}

verify_outputs() {
  # A failed re-verification must not leave a previous passed receipt visible.
  rm -f "$OUTPUT/verification.json"
  check_baseline
  [[ ! -f "$PGDATA/postmaster.pid" ]] || { echo 'Database is still running' >&2; return 1; }
  local validation_dir file comma='' hash
  validation_dir=$(mktemp -d "$LAB_DIR/verify.XXXXXX")
  trap cleanup_db EXIT
  start_db
  # Re-run real DDL, backfill, constraint failures and downgrade. Compare the
  # independent results, never merely trust a caller-written summary or hash.
  rehearse "$validation_dir"
  stop_db
  for file in "${ARTIFACTS[@]}"; do
    cmp -s "$OUTPUT/$file" "$validation_dir/$file" || { echo "Evidence mismatch: $file" >&2; rm -rf "$validation_dir"; return 1; }
  done
  rm -rf "$validation_dir"
  {
    printf '{"passed":true,"summary":%s,"outputSha256":{' "$EXPECTED"
    for file in "${ARTIFACTS[@]}"; do
      hash=$(sha256sum "$OUTPUT/$file" | cut -d' ' -f1)
      printf '%s"%s":"%s"' "$comma" "$file" "$hash"
      comma=,
    done
    printf '}}\n'
  } > "$OUTPUT/verification.json"
}

must_reject() {
  # A stale or forged success receipt must never mask invalid current state.
  printf '{"passed":true}\n' > "$OUTPUT/verification.json"
  if bash "$RECIPE_DIR/recipe.sh" "$1" > /dev/null 2>&1; then
    echo "Corruption accepted: $2" >&2; exit 1
  fi
  [[ ! -e "$PGDATA/postmaster.pid" ]] || { echo 'Failure left database running' >&2; exit 1; }
  [[ ! -e "$OUTPUT/verification.json" ]] || { echo 'Failure left a stale passed receipt' >&2; exit 1; }
}

case "${1:-}" in
  prepare)
    [[ ! -e "$LAB_DIR/baseline.json" && ! -e "$PGDATA" ]] || { echo 'Refusing to replace prepared state' >&2; exit 1; }
    init_db
    trap cleanup_db EXIT
    start_db
    sql < "$RECIPE_DIR/seed.sql"
    assert_original_database
    baseline_json > "$LAB_DIR/baseline.json"
    stop_db
    ;;
  analyze)
    rm -f "$OUTPUT/verification.json"
    check_baseline
    trap cleanup_db EXIT
    start_db
    rehearse "$OUTPUT"
    stop_db
    verify_outputs
    ;;
  verify) verify_outputs ;;
  test)
    cp "$LAB_DIR/baseline.json" "$LAB_DIR/baseline.backup"
    printf '{}\n' > "$LAB_DIR/baseline.json"
    must_reject analyze baseline
    mv "$LAB_DIR/baseline.backup" "$LAB_DIR/baseline.json"
    for file in summary.json upgraded.csv stages.csv; do
      cp "$OUTPUT/$file" "$LAB_DIR/output.backup"
      printf 'corrupted\n' > "$OUTPUT/$file"
      must_reject verify "$file"
      mv "$LAB_DIR/output.backup" "$OUTPUT/$file"
    done
    trap cleanup_db EXIT
    start_db
    sql -c 'UPDATE orders SET total=0 WHERE id=1'
    stop_db
    must_reject analyze 'database rows'
    must_reject verify 'database rows with intact output'
    start_db
    sql -c 'UPDATE orders SET total=20.00 WHERE id=1'
    sql -c 'ALTER TABLE orders DROP CONSTRAINT orders_total_check'
    stop_db
    must_reject verify 'schema constraint'
    start_db
    sql -c 'ALTER TABLE orders ADD CONSTRAINT orders_total_check CHECK (total >= 0)'
    stop_db
    for file in "${ARTIFACTS[@]}" verification.json; do rm -f "$OUTPUT/$file"; done
    bash "$RECIPE_DIR/recipe.sh" analyze
    bash "$RECIPE_DIR/recipe.sh" verify
    echo 'Migration, backfill, constraints, transaction rollback, downgrade, seven corruption probes and regeneration passed'
    ;;
  *) echo 'Usage: recipe.sh prepare|analyze|verify|test' >&2; exit 2 ;;
esac
