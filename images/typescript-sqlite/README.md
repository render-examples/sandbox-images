# TypeScript SQLite

Exercise SQLite migrations, transaction rollback, and a durable local job queue using Drizzle and better-sqlite3.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Node 24 on Debian Bookworm, linux/amd64. `/workspace/node_modules` links to the installed dependency set, so workspace programs can use bare package imports. `tsc` is on the default PATH. Dependencies are exact-pinned in `fixture/package.json` and its lockfile: `better-sqlite3@13.0.3`, `drizzle-orm@0.45.4`, `typescript@7.0.2`, `@types/node@24.10.1`.

- [SQLite migration workbench](../../snapshots/sqlite-migration-workbench/README.md): Apply and reverse a schema migration; prove a failed multi-statement transaction preserves data.
- [SQLite job queue](../../snapshots/sqlite-job-queue/README.md): Recover an expired lease, enforce unique jobs, retry a failed job, and verify durable terminal state.

Run `python3 scripts/check-image.py typescript-sqlite` from the repository root to build and exercise smoke checks plus both recipe lifecycles. Workloads run with networking disabled, 2 GB memory, 2 CPUs and a 120-second timeout per lifecycle. Loopback HTTP is used only by fixtures that need an API transport; no external service or credentials are needed.

The fixture modules are deterministic examples for development and regression tests. Prepared filesystem state contains inputs and a hash baseline, not precomputed answers or running processes. Verification reopens generated artifacts, tests corruption rejection, and regenerates outputs.

Primary API reference: [https://orm.drizzle.team/docs/get-started-sqlite](https://orm.drizzle.team/docs/get-started-sqlite).

The queue is an illustrative SQLite transaction/lease fixture with a single worker, not a distributed queue implementation. It tests persistent state, retry handling and duplicate rejection.
