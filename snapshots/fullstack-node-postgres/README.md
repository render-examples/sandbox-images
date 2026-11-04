# Prepared TypeScript API and Postgres

A filesystem snapshot recipe for `typescript-api-postgres`. It prepares installed
TypeScript dependencies, a synthetic HTTP API and a cleanly stopped PostgreSQL
cluster containing three orders totaling 5,000 cents.

Recipe **0.1.0** passed live Render capture/restore against privately published
typescript-api-postgres 0.1.0. See the
[evidence report](../../docs/api-postgres-validation-2026-11-04.md).
The release remains draft pending public distribution.

## Prepared state and task

- `/workspace/fullstack-node-postgres/project`: source, TypeScript configuration,
  exact npm lockfile, installed dependencies, seed SQL and an HTTP workload.
- `/workspace/fullstack-node-postgres/pgdata`: seeded PostgreSQL 18 cluster,
  cleanly stopped with no running postmaster before capture.
- `/workspace/fullstack-node-postgres/baseline.json`: fixture hashes and expected
  workload results.

The initial `/summary` endpoint is deliberately unimplemented. Analysis changes
one TypeScript flag, recompiles, and runs real HTTP requests against an ephemeral
loopback server. Eight checks exercise known order values, missing routes, the
new endpoint, committed schema upgrade/downgrade, transaction rollback after a
constraint violation, and original API behavior after downgrade. The migration
adds an order status, marks one 750-cent order paid, then removes that column;
original order values must remain intact.

The resulting `change.patch` is a one-line unified diff generated from the
actual pinned source change. The recipe checks the revised source exactly and
verifies the patch content. It does not require Git or claim AI-authored output.
The fixture is a functional acceptance example, not an agent benchmark.

## Capture and restore

Upload only `recipe.sh` and `recipe.mjs` to the recipe directory. The image
contains the installed project and all seed data. Uploaded files may be caller
owned with mode 0600; no other OS user opens them.

```sh
bash recipe.sh prepare
# Capture filesystem state here, before analyze produces any declared outputs.
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

`prepare` refuses to replace an existing project or cluster and checks the three
baseline HTTP behaviors. It shuts down PostgreSQL after setup. Capture immediately
after prepare and wait for the snapshot to become available before analyzing the
source. On restore, check the captured baseline and absence of task outputs, then
run `analyze` and `verify` again. Every entrypoint explicitly starts and stops the
local database; a filesystem snapshot does not preserve processes. HTTP listeners
and DB clients close in `finally` blocks. PostgreSQL uses only an owner-restricted
Unix socket, never TCP; the HTTP server binds only `127.0.0.1`.

The generic validator in `tools/validate-recipe.ts` runs this sequence with
deny-all egress and bounded execution, then verifies downloaded output hashes and
cleans up temporary resources. Actual snapshots remain in the caller's Render
group; the distributed asset is this recipe, not a portable snapshot ID.

## Output contract

| Output | Evidence |
| --- | --- |
| `summary.json` | 3 baseline checks, 8 final checks, 3 orders, 5,000 total cents, 750 paid cents, 3 migration steps, data preserved, 1 changed source file |
| `api-results.json` | Executed HTTP/database checks and their successful migration sequence |
| `migrations.json` | Upgrade, failed-transaction rollback and downgrade, plus unchanged original rows |
| `change.patch` | Exact unified diff enabling the summary endpoint |
| `verification.json` | Expected summary and SHA-256 hashes of the other four outputs |

All outputs are under `/workspace/output`. Verification compares actual database
rows, column types/nullability and constraints with the baseline and checks immutable project files, edited
source, result values, patch, and hashes. Analyze and verify invalidate the old
success receipt before checking; a failed run cannot retain it. Local negative
checks corrupt five files, a database value and a constraint. Removing all outputs and rerunning
analysis must regenerate the complete evidence set.

Only synthetic data is included. Do not bake credentials or customer databases
into a reusable snapshot. Real API development can reuse this runtime, but must
supply its own dependencies, source and explicit access policy.
