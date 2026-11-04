# Official Node 24 and PostgreSQL 18.6, Debian Bookworm, linux/amd64 manifests.
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0 AS node
COPY images/typescript-api-postgres/fixture /opt/render/fixtures/fullstack-node-postgres
RUN cd /opt/render/fixtures/fullstack-node-postgres && npm ci --ignore-scripts && npm run build && rm -rf dist

FROM postgres:18.6-bookworm@sha256:41a369edc91d9bdd7a58be6bc71ea0f8f7a3f49e82818a9f0829021ea7840b7c
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render TypeScript API and Postgres sandbox" \
      org.opencontainers.image.description="Offline Node/TypeScript API development with local PostgreSQL"
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
COPY --from=node /opt/render/fixtures/fullstack-node-postgres /opt/render/fixtures/fullstack-node-postgres
COPY images/typescript-api-postgres/common.sh images/typescript-api-postgres/smoke.sh /opt/render/examples/typescript-api-postgres/
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && ln -s /opt/render/fixtures/fullstack-node-postgres/node_modules/.bin/tsc /usr/local/bin/tsc \
    && for tool in postgres initdb pg_ctl pg_isready; do ln -s /usr/lib/postgresql/18/bin/"$tool" /usr/local/bin/"$tool"; done \
    && for tool in node npm tsc postgres initdb pg_ctl pg_isready sh bash timeout cat mkdir mount pivot_root umount gosu; do command -v "$tool" >/dev/null; done \
    && node --version && tsc --version && mkdir -p /workspace/output /workspace/image-smoke
ENTRYPOINT []
WORKDIR /workspace
CMD ["sleep", "infinity"]
