# Official runtimes, same Debian Bookworm distribution, pinned linux/amd64 manifests.
FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6 AS python
FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
COPY runtime/contracts.ts runtime/package.json /opt/render/runtime/
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render workspace with OpenHands SDK preinstalled" \
      org.opencontainers.image.description="Pinned OpenHands SDK CLI with TypeScript, Python and offline reference-workload validation"
COPY --from=python /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends libtk8.6=8.6.13-2 libtcl8.6=8.6.13+dfsg-2 \
    && rm -rf /var/lib/apt/lists/* \
    && ldconfig && python -c 'import ssl, ctypes, bz2, lzma, sqlite3, urllib.request, tkinter' && node --version
RUN python -c 'from pathlib import Path; import subprocess; missing=[str(p) for p in Path("/usr/local/lib/python3.13/lib-dynload").glob("*.so") if "not found" in subprocess.check_output(["ldd",str(p)],text=True)]; assert not missing, missing'
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false \
    XDG_CONFIG_HOME=/opt/render/config LITELLM_LOCAL_MODEL_COST_MAP=True
COPY images/openhands-sdk/fixture/package*.json /opt/render/fixtures/openhands-sdk/
RUN cd /opt/render/fixtures/openhands-sdk && npm ci --ignore-scripts && ln -s /opt/render/fixtures/openhands-sdk/node_modules/.bin/tsc /usr/local/bin/tsc && mkdir -p /workspace/output && rm -rf /root/.npm
COPY images/openhands-sdk/build-requirements.lock /opt/render/build-requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes -r /opt/render/build-requirements.lock
COPY images/openhands-sdk/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --no-binary=func-timeout --no-build-isolation --require-hashes -r /opt/render/requirements.lock
COPY images/openhands-sdk/launcher.py /usr/local/bin/render-openhands-sdk
RUN chmod 755 /usr/local/bin/render-openhands-sdk
COPY runtime/node-recipe.ts runtime/coding-agent-workload.ts /opt/render/runtime/
RUN ln -s /opt/render/fixtures/openhands-sdk/node_modules /opt/render/runtime/node_modules
COPY images/openhands-sdk/fixture /opt/render/fixtures/openhands-sdk
RUN cd /opt/render/fixtures/openhands-sdk && npm run typecheck
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
