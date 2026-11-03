# pgvector's PostgreSQL 18 / Debian trixie image, linux/amd64 manifest.
FROM pgvector/pgvector:0.8.7-pg18-trixie@sha256:d624420861924efe8691ecb2060205a9c6bd949aace5cc754da0c907171ca742

LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render Postgres lab sandbox" \
      org.opencontainers.image.description="PostgreSQL and pgvector for isolated SQL and vector-query experiments"

# The upstream database entrypoint is not a sandbox workload supervisor.
ENTRYPOINT []
ENV PGDATA=/workspace/sql-vector-playground/pgdata
COPY images/postgres-lab/common.sh images/postgres-lab/smoke.sh /opt/render/examples/postgres-lab/
RUN for tool in sh bash timeout cat mkdir mount pivot_root umount gosu sha256sum; do command -v "$tool" >/dev/null; done \
    && mkdir -p /workspace/output /workspace/image-smoke
WORKDIR /workspace
CMD ["sleep", "infinity"]
