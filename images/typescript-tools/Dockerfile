# Official Node 24 Bookworm, pinned linux/amd64 manifest.
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render TypeScript tools sandbox" \
      org.opencontainers.image.description="Typed transforms and offline API adapter tests"
ENV PATH="/opt/render/fixtures/typescript-tool-workbench/node_modules/.bin:${PATH}" \
    NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
COPY images/typescript-tools/fixture /opt/render/fixtures/typescript-tool-workbench
RUN cd /opt/render/fixtures/typescript-tool-workbench \
    && npm ci --ignore-scripts \
    && npm test \
    && rm -rf /root/.npm \
    && mkdir -p /workspace/output /opt/render/examples/typescript-tools \
    && for tool in node npm tsc sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY images/typescript-tools/smoke.mjs /opt/render/examples/typescript-tools/smoke.mjs
WORKDIR /workspace
CMD ["sleep", "infinity"]
