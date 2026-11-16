# linux/amd64 manifest, resolved from Docker's official Python image.
FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6

LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render Python analysis sandbox" \
      org.opencontainers.image.description="Pinned CPU analytics tools with an offline workload check"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MPLBACKEND=Agg \
    MPLCONFIGDIR=/tmp/matplotlib \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY images/python-analysis/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes -r /opt/render/requirements.lock \
    && python -m pip check \
    && mkdir -p /workspace/input /workspace/output /opt/render/examples/python-analysis

COPY images/python-analysis/smoke.py /opt/render/examples/python-analysis/smoke.py
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
