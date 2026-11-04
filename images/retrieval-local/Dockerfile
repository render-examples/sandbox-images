# Official Node 24 Bookworm pinned for linux/amd64.
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render TypeScript local retrieval sandbox"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
COPY images/retrieval-local/fixture /opt/render/fixtures/retrieval-local
RUN cd /opt/render/fixtures/retrieval-local && npm ci --ignore-scripts \
    && ln -s /opt/render/fixtures/retrieval-local/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf /root/.npm \
    && for tool in node npm tsc sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY runtime/node-recipe.mjs /opt/render/runtime/node-recipe.mjs
RUN mkdir -p /workspace/output /workspace/image-smoke \
    && ln -s /opt/render/fixtures/retrieval-local/node_modules /workspace/node_modules
ENTRYPOINT []
WORKDIR /workspace
CMD ["sleep", "infinity"]
