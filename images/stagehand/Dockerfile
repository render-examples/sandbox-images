FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
COPY runtime/contracts.ts runtime/package.json /opt/render/runtime/
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false PLAYWRIGHT_BROWSERS_PATH=/opt/render/browsers
COPY images/stagehand/fixture/package.json images/stagehand/fixture/package-lock.json /opt/render/fixtures/stagehand/
RUN cd /opt/render/fixtures/stagehand && npm ci --ignore-scripts \
    && node node_modules/playwright/cli.js install --with-deps chromium \
    && dpkg-query -W > /opt/render/system-packages.txt && rm -rf /root/.npm /var/lib/apt/lists/*
COPY images/stagehand/fixture /opt/render/fixtures/stagehand
RUN cd /opt/render/fixtures/stagehand && npm run typecheck
COPY runtime/node-recipe.ts /opt/render/runtime/node-recipe.ts
RUN mkdir -p /workspace/output && ln -s /opt/render/fixtures/stagehand/node_modules /workspace/node_modules
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
ENTRYPOINT []
CMD ["sleep", "infinity"]
