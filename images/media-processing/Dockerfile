# Official Node 24 Bookworm pinned for linux/amd64.
FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render TypeScript media processing sandbox"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg=7:5.1.9-0+deb12u1 && rm -rf /var/lib/apt/lists/*
COPY images/media-processing/fixture /opt/render/fixtures/media-processing
RUN cd /opt/render/fixtures/media-processing && npm ci --ignore-scripts \
    && ln -s /opt/render/fixtures/media-processing/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf /root/.npm \
    && for tool in node npm tsc sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY runtime/node-recipe.ts /opt/render/runtime/node-recipe.ts
RUN mkdir -p /workspace/output /workspace/image-smoke \
    && ln -s /opt/render/fixtures/media-processing/node_modules /workspace/node_modules
ENTRYPOINT []
COPY runtime/contracts.ts /opt/render/runtime/contracts.ts
COPY runtime/package.json /opt/render/runtime/package.json
RUN cd /opt/render/fixtures/media-processing && npm run typecheck
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
