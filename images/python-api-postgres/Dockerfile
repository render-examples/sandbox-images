# Official Python and PostgreSQL Bookworm linux/amd64 manifests.
FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6 AS python-runtime
FROM postgres:18-bookworm@sha256:a197bcc7150b0a7e35796ef0c110693cba6edd41e92b564cc50b976f17532423
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
RUN for tool in python initdb pg_ctl psql runuser uvicorn pytest sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done \
    && python -c 'import ssl, ctypes, bz2, lzma, sqlite3, psycopg, fastapi, httpx, uvicorn'
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
