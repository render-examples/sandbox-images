# Database migration lab

A filesystem snapshot recipe for rehearsing schema and data changes against a
small synthetic PostgreSQL database. It reuses the existing `postgres-lab` 0.1.0
image; no additional image, Python interpreter, network service, or credentials
are required.

The prepared database has two customers and four orders totaling **12,750 cents**.
The recipe makes a committed migration from decimal order totals to integer
cents, backfills every row, and adds nonnegative-total and currency constraints.
It then demonstrates three rejected writes, a failing migration that must roll
back both DDL and data edits, and a committed downgrade preserving the original
rows and constraints. A failed migration is accepted as the expected fixture
outcome only when PostgreSQL returns the expected SQLSTATE and independent
queries confirm rollback.

## Prepared state and lifecycle

`bash recipe.sh prepare` creates `/workspace/migration-lab/pgdata`, loads
`seed.sql`, verifies the known initial database, records input hashes in
`baseline.json`, and cleanly stops PostgreSQL. Preparation refuses to overwrite
existing state and does not generate workload outputs. Capture the filesystem
snapshot at this point.

After restore, `bash recipe.sh analyze` starts PostgreSQL explicitly, executes
the upgrade and failure/downgrade scenarios, writes the outputs below, and stops
the database. It runs verification before returning. All connections use a private
Unix socket; PostgreSQL has no TCP listener. Queries have a five-second statement
timeout and two-second lock timeout; database startup/shutdown is bounded by the
parent image helpers. Callers should also wrap each action in
`timeout -k 5 120 bash recipe.sh ACTION`.

`bash recipe.sh verify` independently starts the database, checks its actual
rows, column types, nullability and constraints, reruns the migration rehearsal,
and compares newly generated evidence with the saved outputs. It verifies the
current migration file hashes against the captured baseline. It does not accept
a summary or checksum file as proof that the database is correct. PostgreSQL is
cleanly stopped on success and through an exit trap on failure.

A successful rehearsal returns the database to its original schema and data, so
`analyze` can regenerate deleted outputs and run repeatedly. An unexpected failure
may leave a different schema; the next invocation rejects that state instead of
silently resetting it. Restore the clean snapshot to start a fresh experiment.

## Outputs

| File | Expected result |
| --- | --- |
| `summary.json` | 2 customers, 4 rows, 12,750 cents, 4 backfilled rows, 3 rejected writes, successful failure rollback and downgrade |
| `stages.csv` | Row count and total at baseline, upgrade, failed-migration rollback and downgrade |
| `upgraded.csv` | Exact order IDs, integer cents, currency and status after the committed upgrade |
| `constraints.csv` | SQLSTATE `23514` for negative totals and unsupported currency; `23502` for null totals |
| `downgraded.csv` | Original IDs, decimal totals and status after downgrade |
| `verification.json` | Known summary results and SHA-256 hashes of the other five outputs |

All outputs live in `/workspace/output`. Runtime state, logs and verification
scratch directories stay under `/workspace/migration-lab`.

## Local acceptance

From the repository root with the existing parent image available:

```sh
python3 scripts/check-image.py postgres-lab --skip-build
```

The shared checker mounts only the recipe's declared files, with the same
caller-owned mode-0600 permissions as Render SDK uploads. The caller opens SQL
input before switching to the postgres OS user. The checker runs the image smoke,
this recipe and the existing SQL/vector recipe with networking disabled and a
2 GB memory limit.

`bash recipe.sh test` rejects seven corruption cases: baseline metadata; summary,
upgraded-row and stage evidence; altered database rows during both analysis and
verification; and a missing original constraint. It also requires a stopped
database and removal of a forged passed receipt after each failure, and
regenerates all outputs after deleting them. Analysis and verification invalidate
any prior receipt before checking current state.

The manifest pins the already published parent image digest. This recipe
passed live Render capture/restore on 2026-11-04; see the
[validation evidence](../../docs/migration-lab-validation-2026-11-04.md).
It remains draft pending public distribution. Registry users receive a versioned recipe that creates a snapshot within
their own sandbox group, not a portable snapshot ID.

## Scope

This fixture demonstrates transactional migrations on a small local database.
It does not measure production lock duration, concurrent deployment behavior,
large-table backfill cost, or zero-downtime compatibility. Its destructive
corruption probes operate only on this recipe's synthetic data. To adapt the
fixture, deliberately update its SQL, expected results and baseline contract,
then rerun local and live validation.

Sources: [PostgreSQL transactions](https://www.postgresql.org/docs/18/tutorial-transactions.html),
[ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html).
