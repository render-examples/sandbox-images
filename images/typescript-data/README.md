# TypeScript data analysis

Reconcile CSV transactions and aggregate Parquet datasets with DuckDB.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Node 24 on Debian Bookworm, linux/amd64. `/workspace/node_modules` links to the installed dependency set, so workspace programs can use bare package imports. `tsc` is on the default PATH. Dependencies are exact-pinned in `fixture/package.json` and its lockfile: `@duckdb/node-api@2.0.0-r.1`, `typescript@7.0.2`, `@types/node@24.10.1`.

- [CSV reconciliation](../../snapshots/csv-reconciliation/README.md): Join orders to payments, remove duplicates, flag unmatched payments, and export typed Parquet.
- [Parquet analytics](../../snapshots/parquet-analytics/README.md): Aggregate regional sales and rank totals directly from a prepared Parquet dataset.

Run `python3 scripts/check-image.py typescript-data` from the repository root to build and exercise smoke checks plus both recipe lifecycles. Workloads run with networking disabled, 2 GB memory, 2 CPUs and a 120-second timeout per lifecycle. Loopback HTTP is used only by fixtures that need an API transport; no external service or credentials are needed.

The fixture modules are deterministic examples for development and regression tests. Prepared filesystem state contains inputs and a hash baseline, not precomputed answers or running processes. Verification reopens generated artifacts, tests corruption rejection, and regenerates outputs.

Primary API reference: [https://duckdb.org/docs/2.0/clients/node_neo/overview](https://duckdb.org/docs/2.0/clients/node_neo/overview).
