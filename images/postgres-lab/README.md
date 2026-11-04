# Postgres lab

PostgreSQL **18.6** and pgvector **0.8.7** for agents and developers testing SQL,
vector retrieval, transactions, and migrations against disposable local data.
This is a database workload image; it does not require a Python runtime.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

The Linux amd64 base is pinned to pgvector's upstream
`0.8.7-pg18-trixie` manifest:
`sha256:d624420861924efe8691ecb2060205a9c6bd949aace5cc754da0c907171ca742`.
The digest fixes the OS, database, extension, and utility versions. There is no
package installation at sandbox runtime. The upstream entrypoint is cleared;
workloads explicitly initialize and start their own disposable database.

## Use and verification

The bundled smoke workload initializes a fresh database, enables pgvector,
inserts two vectors, and checks that the nearest neighbor is ID 1. It verifies
the pgvector version and absence of a TCP listener, then stops PostgreSQL.

```sh
docker buildx build --load --provenance=false --platform linux/amd64 \
  -f images/postgres-lab/Dockerfile -t render-sandbox-postgres-lab:0.1.0 .
docker run --rm --platform linux/amd64 --network none --memory 2g \
  render-sandbox-postgres-lab:0.1.0 \
  timeout -k 5 120 bash /opt/render/examples/postgres-lab/smoke.sh
```

See [SQL and vector playground](../../snapshots/sql-vector-playground) for a
prepared dataset and filesystem snapshot recipe. The DB process runs as the
dedicated `postgres` user, with a private Unix socket and no TCP listeners.
Local trust authentication is suitable only for this disposable synthetic lab;
the image is not a managed database, a production service, or a multi-tenant
database access boundary. No database credentials or customer data are included.

Local offline smoke and recipe tests run under a 2 GB memory limit.

## Upstream references

- [pgvector installation and Docker support](https://github.com/pgvector/pgvector#docker)
- [pgvector upstream Dockerfile](https://github.com/pgvector/pgvector/blob/v0.8.7/Dockerfile)
- [PostgreSQL 18 pg_ctl](https://www.postgresql.org/docs/18/app-pg-ctl.html)
- [PostgreSQL 18 connection settings](https://www.postgresql.org/docs/18/runtime-config-connection.html)

PostgreSQL, pgvector, and the base OS retain their upstream licenses. The
pgvector image includes its license under `/usr/share/doc/pgvector/LICENSE`.
