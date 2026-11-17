FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6 AS python
FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render LangChain Deep Agents sandbox"
COPY --from=python /usr/local/bin/python3.13 /usr/local/bin/python3.13
COPY --from=python /usr/local/lib/python3.13 /usr/local/lib/python3.13
COPY --from=python /usr/local/lib/libpython3.13.so.1.0 /usr/local/lib/libpython3.13.so.1.0
RUN ldconfig && ln -sf python3.13 /usr/local/bin/python3 && ln -sf python3.13 /usr/local/bin/python
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY images/langchain-agent/fixture /opt/render/fixtures/langchain-agent
COPY runtime/package.json /opt/render/runtime/package.json
COPY runtime/contracts.ts /opt/render/runtime/contracts.ts
RUN cd /opt/render/fixtures/langchain-agent && npm ci --ignore-scripts && npm run typecheck && npm run build && npm test && rm -rf /root/.npm
COPY images/langchain-agent/requirements.lock /opt/render/python-requirements.lock
RUN python3 -m venv /opt/render/python && /opt/render/python/bin/pip install --no-cache-dir --only-binary=:all: --require-hashes -r /opt/render/python-requirements.lock && /opt/render/python/bin/pip check
COPY runtime/node-recipe.ts /opt/render/runtime/node-recipe.ts
RUN mkdir -p /workspace/output && for tool in python3 sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
