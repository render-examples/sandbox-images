# Coding workspace

A Node.js and TypeScript-first environment for coding agents and developers:
inspect a repository, change code, compile it, run tests, and collect a patch.
No model provider, API token, browser engine, or scraping tooling is bundled.

Live Render validation: Passed for image 0.1.1. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

The image uses the official Node 24.22.2 Bookworm build-tool image pinned to its
`linux/amd64` manifest. Its digest pins Node, npm, Git, Make, GCC/G++, and the OS
packages together. TypeScript **7.0.2** and its platform compiler are installed
from the checked-in npm lockfile with lifecycle scripts disabled. `tsc` is on
PATH; the smoke workload uses Node's built-in test runner. Node 24 is the intended
major, not a floating build input: changing the base digest requires a new image
release and rerunning the checks.

The bundled example is a synthetic TypeScript pricing project. It includes three
passing tests and installed dependencies. Image smoke compilation and tests run
in a temporary copy and exercise Git staging. The companion
[repository-ready recipe](../../snapshots/repo-ready-typescript) captures a clean
repository, then demonstrates implementing a discount function and collecting
a tested Git patch. This is a deterministic capability check, not a model benchmark.

## Local validation

```sh
docker buildx build --load --provenance=false --platform linux/amd64 \
  -f images/coding-workspace/Dockerfile -t render-sandbox-coding-workspace:0.1.1 .
docker run --rm --platform linux/amd64 --network none --memory 2g --cpus 2 \
  render-sandbox-coding-workspace:0.1.1 \
  timeout -k 5 120 node /opt/render/examples/coding-workspace/smoke.mjs
```

The smoke writes `/workspace/image-smoke/result.json` with `status: passed`, three
baseline tests, and the installed Node/compiler versions. A container that exits
removes that local output unless a caller collects it before termination.

Neither external repository access nor arbitrary dependency installation is
required by the check;
real coding jobs must configure their own network and source access. Filesystem
snapshots contain installed files, not a running language server or agent session.

Sources: [official Node images](https://github.com/nodejs/docker-node),
[TypeScript compiler package](https://www.npmjs.com/package/typescript),
[Node test runner](https://nodejs.org/docs/latest-v24.x/api/test.html).
The base distribution and npm packages retain their upstream licenses; the
synthetic fixture and recipe use this repository's MIT license.

## Sandbox command path

Version 0.1.1 exposes the compiler through `/usr/local/bin/tsc`. Render sandbox
commands use their own PATH, so a Dockerfile-only PATH addition is insufficient.
The image smoke test checks the compiler with the sandbox-default command path.
