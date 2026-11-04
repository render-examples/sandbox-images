# Python API and Postgres

A Python/FastAPI environment with local PostgreSQL for application changes and
migration tests. It contains Python 3.13.18, PostgreSQL 18.6, FastAPI 0.162.0,
psycopg 3.3.8, httpx 0.28.1, pytest 9.2.0 and uvicorn 0.54.0. Dependencies and
transitive dependencies are pinned with hashes in `requirements.lock`.

The final image is the digest-pinned official PostgreSQL 18.6 Bookworm image.
The Python runtime comes from a separately digest-pinned official Python
Bookworm stage. No OS package repository is consulted during the build.
PostgreSQL tools are linked under `/usr/local/bin` so Render's default command
PATH can find them. The upstream database entrypoint is disabled; callers
explicitly initialize and start a database in their own workspace.

The bundled synthetic FastAPI order service uses real PostgreSQL queries through
a local Unix socket. Four baseline API tests exercise seeded rows, whole-cent
discounts, missing orders and input validation. Tests call the ASGI app with
httpx's ASGI transport, so no HTTP listener or external network is needed.
Uvicorn is included for applications that need to run their own local listener.
This image supplies no public ingress or preview URL.

The [prepared recipe](../../snapshots/fullstack-fastapi-postgres) adds three tests,
proves a half-cent rounding regression, fixes it, rehearses a priority-column
migration and its downgrade, and emits API results and a unified source patch.
Git is not bundled; the patch is produced from the pinned original and changed
source with Python's `difflib`. No agent model or provider credentials are needed.

## Check locally

```sh
python3 scripts/check-image.py python-api-postgres
```

The checker builds for `linux/amd64`, runs smoke and recipe checks with external
networking disabled and a 2 GB limit, and probes deliberate input, output and
database corruption. The smoke must pass actual API tests against Postgres before
writing `/workspace/image-smoke/result.json` with `status: passed`.

The reusable database helper sets bounded startup/shutdown times, a statement
timeout, no TCP listener and a private Unix socket. Recipe steps stop Postgres
cleanly before returning, including on failure. Snapshot recipes capture files
and restart Postgres explicitly after restore.

This candidate remains draft and unverified until private GHCR publication and
live Render import/capture/restore validation are recorded. Local container
checks do not establish those results. Inputs are synthetic; never add user
repositories or credentials to shared images or snapshots.

References: [FastAPI ASGI testing](https://fastapi.tiangolo.com/advanced/async-tests/),
[psycopg usage](https://www.psycopg.org/psycopg3/docs/basic/usage.html),
[PostgreSQL pg_ctl](https://www.postgresql.org/docs/18/app-pg-ctl.html).
Upstream runtimes retain their licenses; the synthetic fixture is MIT-licensed.
