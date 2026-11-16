FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9 AS python
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images"
COPY --from=python /usr/local/ /usr/local/
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false PROMPTFOO_DISABLE_TELEMETRY=1 PROMPTFOO_DISABLE_UPDATE=1
COPY images/promptfoo/fixture/package*.json /opt/render/fixtures/promptfoo/
RUN cd /opt/render/fixtures/promptfoo && npm ci --ignore-scripts \
    && ln -s /opt/render/fixtures/promptfoo/node_modules/.bin/promptfoo /usr/local/bin/promptfoo \
    && ln -s /opt/render/fixtures/promptfoo/node_modules/.bin/codex /usr/local/bin/codex \
    && ln -s /opt/render/fixtures/promptfoo/node_modules/@anthropic-ai/claude-code-linux-x64/claude /usr/local/bin/claude \
    && ln -s /opt/render/fixtures/promptfoo/node_modules/@opencode/cli-linux-x64-baseline/bin/opencode /usr/local/bin/opencode \
    && rm -rf /root/.npm \
    && for tool in node npm python git promptfoo codex claude opencode sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
RUN --network=none codex --version && claude --version && opencode --version && python -c 'import ssl,sqlite3,ctypes,bz2,lzma'
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
COPY images/promptfoo/OPENCODE-LICENSE /opt/render/licenses/OPENCODE-LICENSE
COPY images/promptfoo/fixture /opt/render/fixtures/promptfoo
COPY runtime/node-recipe.mjs /opt/render/runtime/node-recipe.mjs
RUN mkdir -p /workspace/output && ln -s /opt/render/fixtures/promptfoo/node_modules /workspace/node_modules
WORKDIR /workspace
CMD ["sleep", "infinity"]
