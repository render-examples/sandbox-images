FROM python:3.12-slim-bookworm@sha256:0f086103b026048cc50cb5da25ec435c023c5241a83fc44daea593377abc61c4
LABEL org.opencontainers.image.source="https://github.com/render-examples/sandbox-images"
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1 OMP_NUM_THREADS=1 TOKENIZERS_PARALLELISM=false HF_HUB_OFFLINE=1
COPY images/llamaindex/requirements.lock /opt/render/requirements.lock
RUN python -m pip install --no-cache-dir --require-hashes -r /opt/render/requirements.lock && python -m pip check
COPY images/llamaindex /opt/render/fixtures/llamaindex
RUN python /opt/render/fixtures/llamaindex/download-model.py
COPY runtime/python-recipe.py /opt/render/runtime/python-recipe.py
RUN mkdir -p /workspace/output && dpkg-query -W > /opt/render/system-packages.txt
WORKDIR /workspace
CMD ["sleep", "infinity"]
