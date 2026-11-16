FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9 AS python
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render Mastra sandbox"
COPY --from=python /usr/local/bin/python3.13 /usr/local/bin/python3.13
COPY --from=python /usr/local/lib/python3.13 /usr/local/lib/python3.13
COPY --from=python /usr/local/lib/libpython3.13.so.1.0 /usr/local/lib/libpython3.13.so.1.0
RUN ldconfig && ln -sf python3.13 /usr/local/bin/python3 && ln -sf python3.13 /usr/local/bin/python
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY images/mastra-agent/fixture /opt/render/fixtures/mastra-agent
RUN cd /opt/render/fixtures/mastra-agent && npm ci --ignore-scripts && npm run build && npm test && rm -rf /root/.npm
COPY runtime/node-recipe.mjs /opt/render/runtime/node-recipe.mjs
RUN mkdir -p /workspace/output && for tool in python3 sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
WORKDIR /workspace
CMD ["sleep", "infinity"]
