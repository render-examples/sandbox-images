# Official runtime manifests, same Debian Bookworm distribution, linux/amd64.
FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6 AS python
FROM node:24-bookworm@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
COPY runtime/contracts.ts runtime/package.json /opt/render/runtime/
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render Python and TypeScript integration test sandbox" \
      org.opencontainers.image.description="Real MCP and loopback HTTP integration fixtures for Python and TypeScript clients"
COPY --from=python /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends libtk8.6=8.6.13-2 libtcl8.6=8.6.13+dfsg-2 \
    && rm -rf /var/lib/apt/lists/* \
    && ldconfig && python -c 'import ssl, ctypes, bz2, lzma, sqlite3, urllib.request, tkinter' && node --version
# Fail the build if any copied Python extension has an unresolved shared library.
RUN python -c 'from pathlib import Path; import subprocess; missing=[str(p) for p in Path("/usr/local/lib/python3.13/lib-dynload").glob("*.so") if "not found" in subprocess.check_output(["ldd",str(p)],text=True)]; assert not missing, missing'
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
COPY images/integration-test/fixture /opt/render/fixtures/mcp-api-test-world
COPY images/integration-test/smoke.ts /opt/render/fixtures/mcp-api-test-world/smoke.ts
RUN cd /opt/render/fixtures/mcp-api-test-world && npm ci --ignore-scripts && npm run typecheck && npm run build \
    && rm -rf dist /root/.npm \
    && ln -s /opt/render/fixtures/mcp-api-test-world/node_modules/.bin/tsc /usr/local/bin/tsc \
    && for tool in node npm tsc python python3 sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY images/integration-test/smoke.ts /opt/render/examples/integration-test/smoke.ts
RUN mkdir -p /workspace/output /workspace/image-smoke
ENTRYPOINT []
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep","infinity"]
