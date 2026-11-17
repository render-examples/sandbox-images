FROM python:3.13.18-slim-bookworm@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images" \
      org.opencontainers.image.title="Render smolagents sandbox"
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1 LITELLM_LOCAL_MODEL_COST_MAP=True PYDANTIC_AI_NO_BANNER=1
COPY images/smolagents/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes -r /opt/render/requirements.lock && python -m pip check
COPY images/smolagents/fixture /opt/render/fixtures/smolagents
RUN python /opt/render/fixtures/smolagents/test_workload.py
COPY runtime/python-recipe.py /opt/render/runtime/python-recipe.py
RUN mkdir -p /workspace/output && for tool in python3 sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done
WORKDIR /workspace
CMD ["sleep", "infinity"]
