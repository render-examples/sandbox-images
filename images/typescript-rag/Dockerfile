# Official Node 24 Bookworm pinned for linux/amd64.
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render TypeScript RAG pipelines sandbox"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
COPY images/typescript-rag/fixture /opt/render/fixtures/typescript-rag
COPY runtime/package.json /opt/render/runtime/package.json
COPY runtime/contracts.ts /opt/render/runtime/contracts.ts
RUN cd /opt/render/fixtures/typescript-rag && npm ci --ignore-scripts && npm run typecheck \
    && ln -s /opt/render/fixtures/typescript-rag/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf /root/.npm \
    && for tool in node npm tsc sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY runtime/node-recipe.ts /opt/render/runtime/node-recipe.ts
RUN mkdir -p /workspace/output /workspace/image-smoke \
    && ln -s /opt/render/fixtures/typescript-rag/node_modules /workspace/node_modules
ENTRYPOINT []
WORKDIR /workspace
CMD ["sleep", "infinity"]
