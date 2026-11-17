FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images"
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1 PLAYWRIGHT_BROWSERS_PATH=/opt/render/browsers ANONYMIZED_TELEMETRY=false BH_TELEMETRY=0
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1=12.2.0-14+deb12u1 && rm -rf /var/lib/apt/lists/*
COPY images/browser-use/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --require-hashes -r /opt/render/requirements.lock && python -m pip check && python -m playwright install --with-deps chromium && dpkg-query -W > /opt/render/system-packages.txt && rm -rf /var/lib/apt/lists/*
COPY images/browser-use /opt/render/fixtures/browser-use
COPY runtime/python-recipe.py /opt/render/runtime/python-recipe.py
RUN mkdir -p /workspace/output
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
