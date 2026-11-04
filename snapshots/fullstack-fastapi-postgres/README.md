# FastAPI and Postgres workspace

A filesystem snapshot recipe for a prepared FastAPI project and local PostgreSQL
18 database. Dependencies are already installed in `python-api-postgres`; only
`recipe.sh` and `recipe.py` are uploaded. No package downloads or credentials are
needed. This recipe is draft: local validation and live Render validation are
separate release steps.

`prepare` copies the synthetic project into
`/workspace/fullstack-fastapi-postgres/project`, initializes a database in
`database/pgdata`, seeds three orders, runs four baseline API tests and writes
`baseline.json` with immutable input hashes. It stops PostgreSQL before capture.
Capture this prepared state before running `analyze`, while output files are
absent. Restores must use the same sandbox group and explicitly deny external
egress. `analyze` restarts the database from its persisted files.

The demonstrated task reproduces a half-cent rounding bug using three added API
tests, fixes the endpoint with integer arithmetic, and reruns all seven tests.
It then applies the checked-in priority-column migration, verifies defaults and
its CHECK constraint, runs the downgrade, and compares all original rows. The
API tests exercise the FastAPI ASGI app and real PostgreSQL; no browser fixture
or public HTTP endpoint is involved.

```sh
bash recipe.sh prepare
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

## Outputs

| File | Checked result |
| --- | --- |
| `summary.json` | 4 baseline tests, 7 final tests, 1 demonstrated regression, 3 rows, 3,351 cents total, 51-cent rounded quote, successful upgrade/downgrade and preserved data |
| `tests.xml` | Seven passing pytest cases |
| `regression.xml` | Seven cases, exactly one failure before the fix |
| `api-results.json` | Exact seeded order response and corrected quote |
| `migration.json` | Upgrade/downgrade, rejected invalid priority, exact rows before and after |
| `change.patch` | Unified diff for the two changed source/test files; Git is not required |
| `verification.json` | Expected summary and SHA-256 of all six outputs |

The recipe verifies baseline and unchanged inputs, the exact source/test edits,
test counts, API results, migration data, patch contents and output hashes.
`test` rejects baseline, migration-input, summary, patch and database corruption;
it confirms that failed execution stops the database, then regenerates outputs.
Timings in pytest XML vary between runs; hashes describe that run's artifacts.

The runner publishes the versioned recipe and image pin, not a globally portable
snapshot ID. A filesystem snapshot contains stopped database files, not a running
HTTP server or preserved database connection. Each execution restarts PostgreSQL
and stops it before finishing. These deterministic checks are not a performance
benchmark or a claim about agent-generated code quality.
