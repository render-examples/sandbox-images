# Official runtimes, same Debian Bookworm distribution, pinned linux/amd64 manifests.
FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6 AS python
FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render workspace with OpenCode preinstalled" \
      org.opencontainers.image.description="Pinned OpenCode CLI with TypeScript, Python and offline reference-workload validation"
COPY --from=python /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends libtk8.6=8.6.13-2 libtcl8.6=8.6.13+dfsg-2 \
    && rm -rf /var/lib/apt/lists/* \
    && ldconfig && python -c 'import ssl, ctypes, bz2, lzma, sqlite3, urllib.request, tkinter' && node --version
RUN python -c 'from pathlib import Path; import subprocess; missing=[str(p) for p in Path("/usr/local/lib/python3.13/lib-dynload").glob("*.so") if "not found" in subprocess.check_output(["ldd",str(p)],text=True)]; assert not missing, missing'
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false \
    XDG_CONFIG_HOME=/opt/render/config
COPY images/opencode/fixture/package*.json /opt/render/fixtures/opencode/
# Install the official baseline binary directly: no CPU-dependent postinstall or fallback download.
RUN cd /opt/render/fixtures/opencode && npm ci --ignore-scripts \
    && ln -s /opt/render/fixtures/opencode/node_modules/@opencode/cli-linux-x64-baseline/bin/opencode /usr/local/bin/opencode \
    && ln -s /opt/render/fixtures/opencode/node_modules/.bin/tsc /usr/local/bin/tsc \
    && mkdir -p /workspace/output /opt/render/runtime /opt/render/licenses \
    && ln -s /opt/render/fixtures/opencode/node_modules /workspace/node_modules \
    && rm -rf /root/.npm \
    && for tool in node npm tsc python python3 git opencode sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY images/opencode/config /opt/render/config/opencode/
COPY images/opencode/OPENCODE-LICENSE /opt/render/licenses/OPENCODE-LICENSE
COPY runtime/node-recipe.mjs runtime/coding-agent-workload.mjs /opt/render/runtime/
COPY images/opencode/fixture/workload.mjs /opt/render/fixtures/opencode/workload.mjs
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
