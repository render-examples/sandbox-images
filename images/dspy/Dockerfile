FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render DSPy sandbox"
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1 PYDANTIC_AI_NO_BANNER=1
COPY images/dspy/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes -r /opt/render/requirements.lock && python -m pip check
COPY images/dspy/fixture /opt/render/fixtures/dspy
RUN python /opt/render/fixtures/dspy/test_workload.py
COPY runtime/python-recipe.py /opt/render/runtime/python-recipe.py
RUN mkdir -p /workspace/output && for tool in python3 sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
WORKDIR /workspace
CMD ["sleep", "infinity"]
