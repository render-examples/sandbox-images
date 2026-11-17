# Official Node 24 Bookworm, pinned linux/amd64 manifest.
FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render TypeScript data analysis sandbox"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
COPY images/typescript-data/fixture /opt/render/fixtures/typescript-data
COPY runtime/package.json /opt/render/runtime/package.json
COPY runtime/contracts.ts /opt/render/runtime/contracts.ts
RUN cd /opt/render/fixtures/typescript-data \
    && npm ci --ignore-scripts && npm run typecheck \
    && ln -s /opt/render/fixtures/typescript-data/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf /root/.npm \
    && mkdir -p /workspace/output \
    && ln -s /opt/render/fixtures/typescript-data/node_modules /workspace/node_modules \
    && for tool in node npm tsc sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY runtime/node-recipe.ts /opt/render/runtime/node-recipe.ts
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
