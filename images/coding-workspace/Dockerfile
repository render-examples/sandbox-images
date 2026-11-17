# Official Node 24, Debian Bookworm, linux/amd64; base includes Git and C/C++ build tools.
FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
COPY runtime/contracts.ts runtime/package.json /opt/render/runtime/
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render coding workspace sandbox" \
      org.opencontainers.image.description="Node.js, TypeScript, Git and build tools with an offline coding workload"
ENV PATH="/opt/render/fixtures/repo-ready-typescript/node_modules/.bin:${PATH}" \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false
COPY images/coding-workspace/fixture /opt/render/fixtures/repo-ready-typescript
COPY images/coding-workspace/smoke.ts /opt/render/fixtures/repo-ready-typescript/smoke.ts
RUN cd /opt/render/fixtures/repo-ready-typescript \
    && npm ci --ignore-scripts \
    && npm run typecheck && npm test \
    && ln -s /opt/render/fixtures/repo-ready-typescript/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf dist /root/.npm \
    && mkdir -p /workspace/output /opt/render/examples/coding-workspace \
    && for tool in node npm tsc git make gcc g++ sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY images/coding-workspace/smoke.ts /opt/render/examples/coding-workspace/smoke.ts
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
