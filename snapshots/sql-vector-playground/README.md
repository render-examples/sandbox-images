# SQL and vector playground

A filesystem snapshot recipe for `postgres-lab`, with four synthetic document
vectors and three synthetic orders. It checks exact L2 nearest-neighbor results,
SQL aggregates, and a rolled-back schema/data migration. No embeddings service,
model download, Python dependency, or production database is involved.

Live Render capture/restore: Passed for recipe 0.1.1 using `postgres-lab:0.1.0`. The parent GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Expected results are document IDs **1, 2, 4**, **4** documents, **4,500 cents** of
order revenue, and a rolled-back migration with no remaining marker column.
The image contains PostgreSQL 18.6 and pgvector 0.8.7; fixture vectors are chosen
for deterministic expected answers, not as a retrieval-quality benchmark.

## Lifecycle

`recipe.sh prepare` creates a fresh database in
`/workspace/sql-vector-playground/pgdata`, applies `fixture.sql`, records a
baseline, and cleanly stops Postgres. It refuses to replace an existing database.

`recipe.sh analyze` explicitly starts that database, rehearses a transaction
containing an added column and updated order values, rolls it back, and checks
the known state. It writes `summary.json`, `nearest.csv`, and `verification.json`
under `/workspace/output`, then cleanly stops the database. An exit trap also
stops it on failure. Its Unix socket directory is removed after shutdown; a
remaining `postmaster.pid` makes verification fail.

Capture only after a successful action has returned. After restoring a filesystem
snapshot, invoke `analyze` again to start Postgres and recreate outputs from the
captured data. There is no claim that a process survives filesystem capture.
The baseline includes the SQL fixture hash; the verifier checks known results
and produces SHA-256 hashes for collected outputs.

## Offline checks

From the repository root, after building `postgres-lab`:

```sh
docker run --rm --platform linux/amd64 --network none --memory 2g --cpus 2 \
  --mount type=bind,src="$PWD/snapshots/sql-vector-playground",dst=/opt/recipe,readonly \
  render-sandbox-postgres-lab:0.1.0 timeout -k 5 120 bash -ec '
    bash /opt/recipe/recipe.sh prepare
    bash /opt/recipe/recipe.sh analyze
    bash /opt/recipe/recipe.sh verify
    bash /opt/recipe/recipe.sh test
  '
```

The `test` action deliberately corrupts baseline metadata, output, and database
data one at a time, requires rejection, restores the synthetic state, and checks
that failure left no running DB. Run it only against this recipe's test data.

The generic live runner uploads only `recipe.sh` and `fixture.sql`, as declared
in the manifest. Other runtime code is already in the pinned parent image.
Run with deny-all egress and an explicitly selected sandbox group and compute
plan. Collect outputs and terminate temporary sandboxes after validation.

Published artifacts distribute
the recipe and parent image digest, never a universally reusable snapshot ID.

## Upload permissions

Recipe 0.1.1 reads the uploaded SQL fixture as the caller and passes it to psql
through stdin. Render SDK uploads use caller-owned mode 0600 files, so the
postgres OS user cannot open those paths directly. This keeps upload permissions
intact and requires no change to the published Postgres image.
