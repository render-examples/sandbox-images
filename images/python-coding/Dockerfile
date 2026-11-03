# Official Python 3.13.18, pinned to its linux/amd64 manifest.
FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render Python coding sandbox" \
      org.opencontainers.image.description="Python, uv, pytest, Ruff and Git with a prepared offline bug-fix workload"
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_PYTHON_DOWNLOADS=never UV_LINK_MODE=copy UV_NO_PROGRESS=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends git=1:2.39.5-0+deb12u3 \
    && mkdir -p /opt/render/examples/python-coding /workspace/output \
    && dpkg-query -W > /opt/render/system-packages.txt \
    && rm -rf /var/lib/apt/lists/*
COPY images/python-coding/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes -r /opt/render/requirements.lock
COPY images/python-coding/fixture /opt/render/fixtures/repo-ready-python
RUN cd /opt/render/fixtures/repo-ready-python \
    && uv sync --locked --python /usr/local/bin/python --no-install-project --no-cache \
    && uv run --frozen --offline --no-sync python -m pytest -q \
    && uv run --frozen --offline --no-sync python -m ruff check src tests \
    && rm -rf .pytest_cache .ruff_cache \
    && for tool in python uv git sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY images/python-coding/smoke.py /opt/render/examples/python-coding/smoke.py
WORKDIR /workspace
CMD ["sleep", "infinity"]
