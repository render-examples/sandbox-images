# Official runtimes, same Debian Bookworm distribution, pinned linux/amd64 manifests.
FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9 AS python
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render workspace with Goose preinstalled" \
      org.opencontainers.image.description="Pinned Goose CLI with TypeScript, Python and offline reference-workload validation"
COPY --from=python /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends libtk8.6=8.6.13-2 libtcl8.6=8.6.13+dfsg-2 \
    && rm -rf /var/lib/apt/lists/* \
    && ldconfig && python -c 'import ssl, ctypes, bz2, lzma, sqlite3, urllib.request, tkinter' && node --version
RUN python -c 'from pathlib import Path; import subprocess; missing=[str(p) for p in Path("/usr/local/lib/python3.13/lib-dynload").glob("*.so") if "not found" in subprocess.check_output(["ldd",str(p)],text=True)]; assert not missing, missing'
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false \
    XDG_CONFIG_HOME=/opt/render/config
COPY images/goose/fixture/package*.json /opt/render/fixtures/goose/
RUN cd /opt/render/fixtures/goose && npm ci --ignore-scripts && ln -s /opt/render/fixtures/goose/node_modules/.bin/tsc /usr/local/bin/tsc && mkdir -p /workspace/output && rm -rf /root/.npm
ADD --checksum=sha256:c63cf82953e968d84b7542eb38a621dfdb5050b967728ed363517be5cdc666ea https://github.com/aaif-goose/goose/releases/download/v1.59.2/goose-x86_64-unknown-linux-gnu.tar.gz /tmp/goose.tar.gz
RUN tar -xzf /tmp/goose.tar.gz -C /usr/local/bin && rm /tmp/goose.tar.gz && goose --version
ENV GOOSE_MODE=auto
COPY runtime/node-recipe.mjs runtime/coding-agent-workload.mjs /opt/render/runtime/
COPY images/goose/fixture/*.mjs images/goose/fixture/live.ts images/goose/fixture/tsconfig.json /opt/render/fixtures/goose/
RUN cd /opt/render/fixtures/goose && npx tsc -p tsconfig.json
WORKDIR /workspace
CMD ["sleep", "infinity"]
