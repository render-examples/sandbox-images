#!/usr/bin/env bash
set -euo pipefail
RECIPE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
LAB_DIR=/workspace/sql-vector-playground
OUTPUT=/workspace/output
source /opt/render/examples/postgres-lab/common.sh
EXPECTED='{"rows":4,"nearestIds":[1,2,4],"revenueCents":4500,"rollbackPassed":true}'

facts() {
  sql -c "SELECT json_build_object('rows',(SELECT count(*) FROM documents),'nearestIds',(SELECT json_agg(id) FROM (SELECT id FROM documents ORDER BY embedding <-> '[1,0,0]', id LIMIT 3) q),'revenueCents',(SELECT sum(total_cents) FROM orders),'rollbackPassed',NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='documents' AND column_name='migration_marker'))" | tr -d '[:space:]'
}

verify_outputs() {
  [[ -f "$LAB_DIR/baseline.json" ]]
  local fixture_hash expected_baseline
  fixture_hash=$(sha256sum "$RECIPE_DIR/fixture.sql" | cut -d' ' -f1)
  expected_baseline=$(printf '{"schemaVersion":1,"fixtureSha256":"%s","expected":%s}' "$fixture_hash" "$EXPECTED")
  [[ $(cat "$LAB_DIR/baseline.json") == "$expected_baseline" ]] || { echo 'Baseline or fixture changed' >&2; return 1; }
  [[ $(cat "$OUTPUT/summary.json") == "$EXPECTED" ]] || { echo 'Unexpected SQL results' >&2; return 1; }
  cmp -s "$OUTPUT/nearest.csv" <(printf 'id,title\n1,Payment API\n2,Billing guide\n4,Invoice example\n') || { echo 'Unexpected neighbors' >&2; return 1; }
  [[ ! -f "$PGDATA/postmaster.pid" ]] || { echo 'Database still running before snapshot' >&2; return 1; }
  local summary_hash neighbors_hash
  summary_hash=$(sha256sum "$OUTPUT/summary.json" | cut -d' ' -f1)
  neighbors_hash=$(sha256sum "$OUTPUT/nearest.csv" | cut -d' ' -f1)
  printf '{"passed":true,"summary":%s,"outputSha256":{"summary.json":"%s","nearest.csv":"%s"}}\n' "$EXPECTED" "$summary_hash" "$neighbors_hash" > "$OUTPUT/verification.json"
}

case "${1:-}" in
  prepare)
    init_db
    trap cleanup_db EXIT
    start_db
    # SDK uploads are owned by the caller with mode 0600. Open the fixture
    # before switching to postgres, passing its contents through stdin.
    sql < "$RECIPE_DIR/fixture.sql"
    [[ $(facts) == "$EXPECTED" ]]
    fixture_hash=$(sha256sum "$RECIPE_DIR/fixture.sql" | cut -d' ' -f1)
    printf '{"schemaVersion":1,"fixtureSha256":"%s","expected":%s}\n' "$fixture_hash" "$EXPECTED" > "$LAB_DIR/baseline.json"
    stop_db
    ;;
  analyze)
    [[ -f "$LAB_DIR/baseline.json" ]]
    trap cleanup_db EXIT
    start_db
    # A transaction rehearses a schema/data migration, then rolls it back.
    sql <<'SQL'
BEGIN;
ALTER TABLE documents ADD COLUMN migration_marker text NOT NULL DEFAULT 'temporary';
UPDATE orders SET total_cents=total_cents+100;
ROLLBACK;
SQL
    [[ $(facts) == "$EXPECTED" ]] || { echo 'Restored database invariants differ' >&2; exit 1; }
    [[ $(sql -c 'SHOW listen_addresses') == '' ]]
    mkdir -p "$OUTPUT"
    facts > "$OUTPUT/summary.json"
    printf '\n' >> "$OUTPUT/summary.json"
    sql -c "COPY (SELECT id,title FROM documents ORDER BY embedding <-> '[1,0,0]',id LIMIT 3) TO STDOUT WITH CSV HEADER" > "$OUTPUT/nearest.csv"
    stop_db
    verify_outputs
    ;;
  verify) verify_outputs ;;
  test)
    # These probes intentionally corrupt only this recipe's synthetic state.
    cp "$LAB_DIR/baseline.json" "$LAB_DIR/baseline.backup"
    printf '{}\n' > "$LAB_DIR/baseline.json"
    if bash "$RECIPE_DIR/recipe.sh" verify >/dev/null 2>&1; then echo 'Corrupt baseline accepted' >&2; exit 1; fi
    mv "$LAB_DIR/baseline.backup" "$LAB_DIR/baseline.json"
    cp "$OUTPUT/summary.json" "$OUTPUT/summary.backup"
    printf '{}\n' > "$OUTPUT/summary.json"
    if bash "$RECIPE_DIR/recipe.sh" verify >/dev/null 2>&1; then echo 'Corrupt output accepted' >&2; exit 1; fi
    mv "$OUTPUT/summary.backup" "$OUTPUT/summary.json"
    trap cleanup_db EXIT
    start_db
    sql -c 'UPDATE orders SET total_cents=0 WHERE id=1'
    stop_db
    if bash "$RECIPE_DIR/recipe.sh" analyze >/dev/null 2>&1; then echo 'Corrupt database accepted' >&2; exit 1; fi
    [[ ! -e "$PGDATA/postmaster.pid" ]]
    start_db
    sql -c 'UPDATE orders SET total_cents=2000 WHERE id=1'
    stop_db
    bash "$RECIPE_DIR/recipe.sh" analyze
    echo 'Baseline, output and database corruption, rollback, and stopped-state checks passed'
    ;;
  *) echo 'Usage: recipe.sh prepare|analyze|verify|test' >&2; exit 2 ;;
esac
