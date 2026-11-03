# Official Node 24, Debian Bookworm, linux/amd64; base includes Git and C/C++ build tools.
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render coding workspace sandbox" \
      org.opencontainers.image.description="Node.js, TypeScript, Git and build tools with an offline coding workload"
ENV PATH="/opt/render/fixtures/repo-ready-typescript/node_modules/.bin:${PATH}" \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false
COPY images/coding-workspace/fixture /opt/render/fixtures/repo-ready-typescript
RUN cd /opt/render/fixtures/repo-ready-typescript \
    && npm ci --ignore-scripts \
    && npm test \
    && rm -rf dist /root/.npm \
    && mkdir -p /workspace/output /opt/render/examples/coding-workspace \
    && for tool in node npm tsc git make gcc g++ sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY images/coding-workspace/smoke.mjs /opt/render/examples/coding-workspace/smoke.mjs
WORKDIR /workspace
CMD ["sleep", "infinity"]
