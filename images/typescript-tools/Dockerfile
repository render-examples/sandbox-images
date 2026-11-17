# Official Node 24 Bookworm, pinned linux/amd64 manifest.
FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
COPY runtime/contracts.ts runtime/package.json /opt/render/runtime/
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render TypeScript tools sandbox" \
      org.opencontainers.image.description="Typed transforms and offline API adapter tests"
ENV PATH="/opt/render/fixtures/typescript-tool-workbench/node_modules/.bin:${PATH}" \
    NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
COPY images/typescript-tools/fixture /opt/render/fixtures/typescript-tool-workbench
COPY images/typescript-tools/smoke.ts /opt/render/fixtures/typescript-tool-workbench/smoke.ts
RUN cd /opt/render/fixtures/typescript-tool-workbench \
    && npm ci --ignore-scripts \
    && npm run typecheck && npm test \
    && ln -s /opt/render/fixtures/typescript-tool-workbench/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf /root/.npm \
    && mkdir -p /workspace/output /opt/render/examples/typescript-tools \
    && for tool in node npm tsc sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY images/typescript-tools/smoke.ts /opt/render/examples/typescript-tools/smoke.ts
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
