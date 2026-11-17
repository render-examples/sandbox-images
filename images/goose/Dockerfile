# Official runtimes, same Debian Bookworm distribution, pinned linux/amd64 manifests.
FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6 AS python
FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
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
COPY runtime/node-recipe.ts runtime/coding-agent-workload.ts /opt/render/runtime/
COPY images/goose/fixture/*.ts images/goose/fixture/tsconfig.json /opt/render/fixtures/goose/
COPY runtime/contracts.ts /opt/render/runtime/contracts.ts
COPY runtime/package.json /opt/render/runtime/package.json
RUN ln -s /opt/render/fixtures/goose/node_modules /opt/render/runtime/node_modules \
    && cd /opt/render/fixtures/goose && npm run typecheck
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
