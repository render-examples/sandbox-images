FROM python:3.13.18-slim-bookworm@sha256:f3dac913ab53b78c64f26d5518fcd7043d5a1a46522d6a493b598c3ed12f62a6
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images"
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1 OMP_NUM_THREADS=2 HF_HUB_OFFLINE=1 DOCLING_ARTIFACTS_PATH=/opt/render/models/docling
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 tesseract-ocr=5.3.0-2 tesseract-ocr-eng=1:4.1.0-2 && dpkg-query -W > /tmp/system-packages.txt && rm -rf /var/lib/apt/lists/*
COPY images/docling/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu --require-hashes -r /opt/render/requirements.lock && python -m pip check
COPY images/docling /opt/render/fixtures/docling
RUN python /opt/render/fixtures/docling/download-models.py && mv /tmp/system-packages.txt /opt/render/system-packages.txt
COPY runtime/python-recipe.py /opt/render/runtime/python-recipe.py
RUN mkdir -p /workspace/output
COPY security /opt/render/security
RUN sh /opt/render/security/refresh-toolchains.sh && rm -rf /opt/render/security
WORKDIR /workspace
CMD ["sleep", "infinity"]
