# pgvector's PostgreSQL 18 / Debian trixie image, linux/amd64 manifest.
FROM pgvector/pgvector:pg18-trixie@sha256:a5b06db72c44033b10fde7f303aad2a543e87a314dd6c2a680848067defd3760

LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render Postgres lab sandbox" \
      org.opencontainers.image.description="PostgreSQL and pgvector for isolated SQL and vector-query experiments"

# The upstream database entrypoint is not a sandbox workload supervisor.
ENTRYPOINT []
ENV PGDATA=/workspace/sql-vector-playground/pgdata
COPY images/postgres-lab/common.sh images/postgres-lab/smoke.sh /opt/render/examples/postgres-lab/
RUN for tool in sh bash timeout cat mkdir mount pivot_root umount runuser sha256sum; do command -v "$tool" >/dev/null; done \
    && mkdir -p /workspace/output /workspace/image-smoke
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
