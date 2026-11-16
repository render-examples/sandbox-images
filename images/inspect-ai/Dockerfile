FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images"
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1 DEEPEVAL_TELEMETRY_OPT_OUT=YES RAGAS_DO_NOT_TRACK=true
COPY images/inspect-ai/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes -r /opt/render/requirements.lock \
    && python -m pip check \
    && for tool in python sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
COPY images/inspect-ai/fixture /opt/render/fixtures/inspect-ai
COPY runtime/python-recipe.py /opt/render/runtime/python-recipe.py
RUN mkdir -p /workspace/output
WORKDIR /workspace
CMD ["sleep", "infinity"]
