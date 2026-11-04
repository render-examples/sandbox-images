#!/usr/bin/env bash
set -euo pipefail
LAB_DIR=$(mktemp -d /workspace/typescript-api-smoke.XXXXXX)
source /opt/render/examples/typescript-api-postgres/common.sh
cleanup_smoke() { local status=$?; trap - EXIT; stop_db || status=1; rm -rf "$LAB_DIR"; exit "$status"; }
trap cleanup_smoke EXIT
node --version
tsc --version
init_db
start_db
cp -a /opt/render/fixtures/fullstack-node-postgres "$LAB_DIR/project"
cd "$LAB_DIR/project"
sql < seed.sql
npm run build
node workload.mjs baseline "$LAB_DIR/smoke.json"
node --input-type=module - "$LAB_DIR/smoke.json" <<'JS'
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
const r=JSON.parse(readFileSync(process.argv[2]));assert.equal(r.testsPassed,3);
writeFileSync('/workspace/image-smoke/result.json',JSON.stringify({status:'passed',baselineTests:3,rows:r.rows,totalCents:r.totalCents})+'\n');
JS
stop_db
