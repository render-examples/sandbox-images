FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false PLAYWRIGHT_BROWSERS_PATH=/opt/render/browsers
COPY images/playwright/fixture/package.json images/playwright/fixture/package-lock.json /opt/render/fixtures/playwright/
RUN cd /opt/render/fixtures/playwright && npm ci --ignore-scripts \
    && node node_modules/playwright/cli.js install --with-deps chromium \
    && dpkg-query -W > /opt/render/system-packages.txt && rm -rf /root/.npm /var/lib/apt/lists/*
COPY images/playwright/fixture /opt/render/fixtures/playwright
RUN cd /opt/render/fixtures/playwright && npm run typecheck
COPY runtime/node-recipe.mjs /opt/render/runtime/node-recipe.mjs
RUN mkdir -p /workspace/output && ln -s /opt/render/fixtures/playwright/node_modules /workspace/node_modules
WORKDIR /workspace
ENTRYPOINT []
CMD ["sleep", "infinity"]
