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
      org.opencontainers.image.title="Render devin-cli coding-agent sandbox"
# Exact version and checksum from the official release manifest.
RUN curl --fail --silent --show-error --location https://static.devin.ai/cli/3000.11.234/devin-3000.11.234-x86_64-unknown-linux.tar.gz -o /tmp/devin.tar.gz \
    && echo '201370cddd2924294e3ca6b46fd8ece49b5763953b644a1dd823fce5490cb41a  /tmp/devin.tar.gz' | sha256sum -c - \
    && mkdir -p /opt/devin/3000.11.234 \
    && tar -xzf /tmp/devin.tar.gz -C /opt/devin/3000.11.234 \
    && rm /tmp/devin.tar.gz \
    && ln -s /opt/devin/3000.11.234/bin/devin /usr/local/bin/devin
# Upstream-documented user setting disables background installations, not update checks.
COPY images/devin-cli/config.json /root/.config/devin/config.json
RUN --network=none devin --version && devin --help >/dev/null
COPY images/devin-cli/fixture /opt/render/fixtures/devin-cli
RUN cd /opt/render/fixtures/devin-cli && npm ci --ignore-scripts \
    && ln -s /opt/render/fixtures/devin-cli/node_modules/.bin/tsc /usr/local/bin/tsc \
    && rm -rf /root/.npm \
    && for tool in node npm tsc python python3 git sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY runtime/node-recipe.mjs runtime/coding-agent-workload.mjs /opt/render/runtime/
RUN mkdir -p /workspace/output /workspace/image-smoke \
    && ln -s /opt/render/fixtures/devin-cli/node_modules /workspace/node_modules
ENTRYPOINT []
WORKDIR /workspace
CMD ["sleep", "infinity"]
