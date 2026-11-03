# Python coding workspace

A Python environment for repository inspection, bug fixes, linting, tests and
patch artifacts. It contains Python 3.13.18, uv 0.13.7, pytest 9.2.0, Ruff 0.17.3
and Git. The separate TypeScript coding image covers the Node toolchain.

This candidate is draft. A local Docker workload does not establish GHCR
publication or Render image-import/snapshot compatibility.

## Reproducible inputs

- Official Python `3.13.18-slim-bookworm`, pinned to its Linux amd64 manifest.
- uv's Linux x86_64 wheel pinned by version and SHA-256 in `requirements.lock`.
- The fixture's direct and transitive Python dependencies locked with package
  hashes in `fixture/uv.lock`; `uv sync --locked` creates its environment at build time.
- Debian Git pinned to `1:2.39.5-0+deb12u3`. Debian's transitive package resolution
  is not fully hermetic; every installed version is recorded in
  `/opt/render/system-packages.txt`.

The image preserves the prepared environment at
`/opt/render/fixtures/repo-ready-python/.venv`. Use `uv run --frozen --offline
--no-sync python -m pytest` or `python -m ruff` from the copied repository to
select that repository's environment without downloads or lockfile changes.
A virtual environment is not generally portable across OS/architectures; this
copy/restore workload uses the same Linux amd64 image and interpreter path.

## Representative workload

The bundled synthetic pricing repository starts with three passing tests and a
known half-cent rounding defect. The `repo-ready-python` recipe adds a regression,
proves it fails, fixes the implementation using integer arithmetic, then exports
five passing tests, clean lint, and a Git patch. No external repository, provider
key, or model call is required. The scripted fix tests the environment and
recipe; it is not a coding-agent benchmark.

The image smoke check copies the environment to `/workspace/image-smoke/repo`,
runs its three baseline tests and Ruff, and writes
`/workspace/image-smoke/result.json` with `status: passed`.

```sh
python3 scripts/check-image.py python-coding
```

The checker runs Linux amd64 with network disabled, 2 GB memory, 2 CPUs and a
120-second timeout. It checks required sandbox shell utilities and every recipe
that names this image. The guest starts with `sleep infinity`; run commands in
`/workspace`. Task artifacts go in `/workspace/output`.

Only the included fixture dependencies are installed. Other projects may need
additional packages or native compilers and explicit network access. Credentials
must be supplied per execution, excluded from captured state, and never baked
into the image.

References: [official Python images](https://hub.docker.com/_/python),
[uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/),
[uv locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/),
[Ruff installation](https://docs.astral.sh/ruff/installation/).
