# Official runtimes, same Debian Bookworm distribution, pinned linux/amd64 manifests.
FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9 AS python
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
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
COPY runtime/node-recipe.mjs runtime/coding-agent-workload.mjs /opt/render/runtime/
COPY images/openhands-sdk/fixture/workload.mjs /opt/render/fixtures/openhands-sdk/workload.mjs
WORKDIR /workspace
CMD ["sleep", "infinity"]
