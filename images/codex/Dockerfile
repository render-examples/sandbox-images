# Official linux/amd64 runtime manifests, both Debian Bookworm.
FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9 AS python
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
COPY --from=python /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends libtk8.6=8.6.13-2 libtcl8.6=8.6.13+dfsg-2 \
    && rm -rf /var/lib/apt/lists/* \
    && ldconfig && python -c 'import ssl, ctypes, bz2, lzma, sqlite3, tkinter' && node --version
RUN python -c 'from pathlib import Path; import subprocess; missing=[str(p) for p in Path("/usr/local/lib/python3.13/lib-dynload").glob("*.so") if "not found" in subprocess.check_output(["ldd",str(p)],text=True)]; assert not missing, missing'
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render codex coding agent sandbox"
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
COPY images/codex/fixture/package.json images/codex/fixture/package-lock.json /opt/render/fixtures/codex/
RUN cd /opt/render/fixtures/codex && npm ci --ignore-scripts \
    && ln -s /opt/render/fixtures/codex/node_modules/.bin/codex /usr/local/bin/codex \
    && ln -s /opt/render/fixtures/codex/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf /root/.npm \
    && mkdir -p /workspace/output \
    && ln -s /opt/render/fixtures/codex/node_modules /workspace/node_modules \
    && for tool in codex node npm tsc python python3 git sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
RUN --network=none codex --version && codex --help >/dev/null && git --version && tsc --version \
    && rm -rf /root/.codex/tmp
COPY runtime/node-recipe.mjs runtime/coding-agent-workload.mjs /opt/render/runtime/
COPY images/codex/fixture/workload.mjs /opt/render/fixtures/codex/workload.mjs
WORKDIR /workspace
CMD ["sleep", "infinity"]
