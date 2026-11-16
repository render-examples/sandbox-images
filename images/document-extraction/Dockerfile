# Official Python image, pinned to its linux/amd64 manifest.
FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6

LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render document extraction sandbox" \
      org.opencontainers.image.description="Offline PDF text, table extraction, and English OCR tools"

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    OMP_THREAD_LIMIT=1

# Explicit top-level versions fail closed if Debian replaces the selected release.
# Record every installed system package for the published image's provenance.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       tesseract-ocr=5.3.0-2 tesseract-ocr-eng=1:4.1.0-2 \
       poppler-utils=22.12.0-2+deb12u3 fonts-dejavu-core=2.37-6 \
    && mkdir -p /opt/render/examples/document-extraction /workspace/input /workspace/output \
    && dpkg-query -W > /opt/render/system-packages.txt \
    && rm -rf /var/lib/apt/lists/*

COPY images/document-extraction/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes -r /opt/render/requirements.lock \
    && python -m pip check
COPY images/document-extraction/workload.py images/document-extraction/smoke.py /opt/render/examples/document-extraction/
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
