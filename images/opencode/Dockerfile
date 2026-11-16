# Official runtimes, same Debian Bookworm distribution, pinned linux/amd64 manifests.
FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9 AS python
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
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
# OpenCode searches PATH before its runtime downloader. Keep restricted-network restores self-contained.
# Official release checksum: https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz.sha256
RUN curl --fail --show-error --location --max-time 60 \
      https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz \
      --output /tmp/ripgrep.tar.gz \
    && echo '1c9297be4a084eea7ecaedf93eb03d058d6faae29bbc57ecdaf5063921491599  /tmp/ripgrep.tar.gz' | sha256sum --check --strict \
    && tar -xzf /tmp/ripgrep.tar.gz -C /tmp \
    && install -m 0755 /tmp/ripgrep-15.1.0-x86_64-unknown-linux-musl/rg /usr/local/bin/rg \
    && mkdir -p /opt/render/licenses/ripgrep \
    && cp /tmp/ripgrep-15.1.0-x86_64-unknown-linux-musl/LICENSE-MIT /tmp/ripgrep-15.1.0-x86_64-unknown-linux-musl/UNLICENSE /tmp/ripgrep-15.1.0-x86_64-unknown-linux-musl/COPYING /opt/render/licenses/ripgrep/ \
    && rm -rf /tmp/ripgrep.tar.gz /tmp/ripgrep-15.1.0-x86_64-unknown-linux-musl
RUN --network=none rg --version | rg '^ripgrep 15\.1\.0(?: |$)' \
    && printf 'offline-ripgrep-check\n' | rg --fixed-strings --line-regexp 'offline-ripgrep-check'
COPY images/opencode/config /opt/render/config/opencode/
COPY images/opencode/OPENCODE-LICENSE /opt/render/licenses/OPENCODE-LICENSE
COPY runtime/node-recipe.mjs runtime/coding-agent-workload.mjs /opt/render/runtime/
COPY images/opencode/fixture/workload.mjs images/opencode/fixture/live.ts images/opencode/fixture/tsconfig.json /opt/render/fixtures/opencode/
RUN cd /opt/render/fixtures/opencode && npx tsc -p tsconfig.json
WORKDIR /workspace
CMD ["sleep", "infinity"]
