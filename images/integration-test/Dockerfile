# Official runtime manifests, same Debian Bookworm distribution, linux/amd64.
FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9 AS python
FROM node:24-bookworm@sha256:8544b46b91d1a8c8bf8fc0d53ae9f276ed07d0ffa9098dc4a9c2f627363a13a0
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
RUN cd /opt/render/fixtures/mcp-api-test-world && npm ci --ignore-scripts && npm run build \
    && rm -rf dist /root/.npm \
    && ln -s /opt/render/fixtures/mcp-api-test-world/node_modules/.bin/tsc /usr/local/bin/tsc \
    && for tool in node npm tsc python python3 sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY images/integration-test/smoke.mjs /opt/render/examples/integration-test/smoke.mjs
RUN mkdir -p /workspace/output /workspace/image-smoke
ENTRYPOINT []
WORKDIR /workspace
CMD ["sleep","infinity"]
