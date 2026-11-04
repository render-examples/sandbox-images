# TypeScript API and Postgres

A Node.js/TypeScript API development environment with local PostgreSQL. It gives
developers and agents a seeded database and installed dependencies so they can
change an endpoint, exercise real HTTP requests, and verify schema migrations
without provisioning external services.

The independent image version is **0.1.0**. Local build and offline acceptance
passed; private GHCR publication and live Render snapshot validation are pending.
The manifest remains draft and unverified until that live evidence exists.

## Included tools

- Node **24.22.2** and npm from the digest-pinned official Node 24 Bookworm image.
- PostgreSQL **18.6** and its command-line utilities from the digest-pinned official
  PostgreSQL Bookworm image.
- TypeScript **7.0.2**, node-postgres **8.23.1**, and exact type dependencies from
  `fixture/package-lock.json`; npm verifies integrity and lifecycle scripts are disabled.
- `node`, `npm`, `npx`, `tsc`, `postgres`, `initdb`, `pg_ctl` and `pg_isready`
  are on the default sandbox command PATH.

Both source images are pinned to their `linux/amd64` manifests in the Dockerfile.
The final image keeps PostgreSQL's libraries and copies the Node runtime and
installed fixture from the build stage. It performs no floating apt installs.
The database entrypoint is cleared; creating the container does not start a
server. No Git client, browser, agent CLI, or model provider is required.

## Example workload

The synthetic order API uses Node's HTTP server and node-postgres. Its initial
state includes three orders totaling 5,000 cents. Image smoke compiles the
TypeScript project, starts PostgreSQL on a private Unix socket, and checks three
HTTP behaviors through an ephemeral loopback listener. All processes stop before
smoke returns, and temporary smoke data is removed.

The [fullstack-node-postgres recipe](../../snapshots/fullstack-node-postgres)
prepares this initial state for filesystem capture. Its task enables a summary
endpoint, tests a committed schema upgrade, verifies rollback of a failed
transaction, downgrades the schema, and checks that original rows survive.
It exports a deterministic unified source patch; it does not claim an agent
created the change or that a Git repository is installed.

## Validate

From the repository root:

```sh
python3 scripts/check-image.py typescript-api-postgres
```

This builds the pinned image and runs the image and recipe workloads by image ID
with networking disabled, two CPUs and a 2 GB memory limit. Loopback remains
available for HTTP tests; PostgreSQL has no TCP listener. Checks reject altered
baseline, source, outputs, database values and constraints, and regenerate all output files.
Failures remove the current success receipt.

The image smoke command is:

```sh
timeout -k 5 120 bash /opt/render/examples/typescript-api-postgres/smoke.sh
```

It writes `/workspace/image-smoke/result.json` only after its checks pass.
Application source and dependencies live under
`/opt/render/fixtures/fullstack-node-postgres`; copy that directory into a writable
workspace before making changes. Real user applications need their own source,
network policy and runtime credentials. This fixture is synthetic and uses no
external service, browser, or secret. It makes no performance claim.

## References

- [node-postgres connections and Unix sockets](https://node-postgres.com/features/connecting)
- [node-postgres transaction boundaries](https://node-postgres.com/features/transactions)
- [Official PostgreSQL image](https://hub.docker.com/_/postgres)
- [Official Node image](https://github.com/nodejs/docker-node)

Fixture code uses the repository's MIT license. Installed runtimes and libraries
retain their upstream licenses.
