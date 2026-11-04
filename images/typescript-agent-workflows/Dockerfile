FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render TypeScript agent workflows sandbox"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false \
    LANGCHAIN_TRACING_V2=false LANGSMITH_TRACING=false
COPY images/typescript-agent-workflows/fixture /opt/render/fixtures/typescript-agent-workflows
RUN cd /opt/render/fixtures/typescript-agent-workflows \
    && npm ci \
    && ln -s /opt/render/fixtures/typescript-agent-workflows/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf /root/.npm \
    && mkdir -p /workspace/output /opt/render/runtime \
    && ln -s /opt/render/fixtures/typescript-agent-workflows/node_modules /workspace/node_modules \
    && for tool in node npm tsc sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY runtime/node-recipe.mjs /opt/render/runtime/node-recipe.mjs
WORKDIR /workspace
CMD ["sleep", "infinity"]
