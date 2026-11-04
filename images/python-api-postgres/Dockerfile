# Official Python and PostgreSQL Bookworm linux/amd64 manifests.
FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9 AS python-runtime
FROM postgres:18.6-bookworm@sha256:41a369edc91d9bdd7a58be6bc71ea0f8f7a3f49e82818a9f0829021ea7840b7c
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render Python API and Postgres sandbox" \
      org.opencontainers.image.description="FastAPI, psycopg and local PostgreSQL for offline API changes and migration tests"
# Both stages use Debian Bookworm. Copy the official Python runtime and stdlib;
# do not change the final image's OS packages or PostgreSQL binaries.
COPY --from=python-runtime /usr/local/ /usr/local/
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1
ENTRYPOINT []
RUN ldconfig \
    && for tool in initdb pg_ctl postgres psql; do ln -s /usr/lib/postgresql/18/bin/$tool /usr/local/bin/$tool; done \
    && mkdir -p /workspace/output /workspace/image-smoke /opt/render/examples/python-api-postgres
COPY images/python-api-postgres/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes -r /opt/render/requirements.lock
COPY images/python-api-postgres/fixture /opt/render/fixtures/fullstack-fastapi-postgres
COPY images/python-api-postgres/database.py images/python-api-postgres/smoke.py /opt/render/examples/python-api-postgres/
RUN for tool in python initdb pg_ctl psql gosu uvicorn pytest sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done \
    && python -c 'import ssl, ctypes, bz2, lzma, sqlite3, psycopg, fastapi, httpx, uvicorn'
WORKDIR /workspace
CMD ["sleep", "infinity"]
