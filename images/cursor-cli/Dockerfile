# Official linux/amd64 runtimes on Debian Bookworm, pinned by digest.
FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9 AS python
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
COPY --from=python /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends libtk8.6=8.6.13-2 libtcl8.6=8.6.13+dfsg-2 \
    && rm -rf /var/lib/apt/lists/* \
    && ldconfig && python -c 'import ssl, ctypes, bz2, lzma, sqlite3, urllib.request, tkinter' && node --version
RUN python -c 'from pathlib import Path; import subprocess; missing=[str(p) for p in Path("/usr/local/lib/python3.13/lib-dynload").glob("*.so") if "not found" in subprocess.check_output(["ldd",str(p)],text=True)]; assert not missing, missing'
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render cursor-cli coding-agent sandbox"
# Official versioned archive, independently SHA-256 pinned after installer inspection.
RUN curl --fail --silent --show-error --location https://downloads.cursor.com/lab/2026.10.22-27dcf5f/linux/x64/agent-cli-package.tar.gz -o /tmp/cursor.tar.gz \
    && echo '85296944e4600a83c4b764f578d1502bf9c416db200d33a593e8f3ecabfdc294  /tmp/cursor.tar.gz' | sha256sum -c - \
    && mkdir -p /opt/cursor/2026.10.22-27dcf5f \
    && tar -xzf /tmp/cursor.tar.gz --strip-components=1 -C /opt/cursor/2026.10.22-27dcf5f \
    && rm /tmp/cursor.tar.gz
RUN python -c 'from pathlib import Path; import subprocess; root=Path("/opt/cursor/2026.10.22-27dcf5f"); missing=[str(p) for p in [root/"node", *root.rglob("*.node")] if "not found" in subprocess.run(["ldd",str(p)],capture_output=True,text=True).stdout]; assert not missing, missing'
COPY images/cursor-cli/agent.sh /usr/local/bin/agent
COPY images/cursor-cli/test-agent.py /tmp/test-cursor-agent.py
RUN --network=none python /tmp/test-cursor-agent.py /usr/local/bin/agent && rm /tmp/test-cursor-agent.py
RUN --network=none chmod 755 /usr/local/bin/agent && ln -s /usr/local/bin/agent /usr/local/bin/cursor-agent \
    && agent --version && agent --help >/dev/null
COPY images/cursor-cli/fixture /opt/render/fixtures/cursor-cli
RUN cd /opt/render/fixtures/cursor-cli && npm ci --ignore-scripts \
    && ln -s /opt/render/fixtures/cursor-cli/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf /root/.npm \
    && for tool in node npm tsc python python3 git sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY runtime/node-recipe.mjs runtime/coding-agent-workload.mjs /opt/render/runtime/
RUN mkdir -p /workspace/output /workspace/image-smoke \
    && ln -s /opt/render/fixtures/cursor-cli/node_modules /workspace/node_modules
ENTRYPOINT []
WORKDIR /workspace
CMD ["sleep", "infinity"]
