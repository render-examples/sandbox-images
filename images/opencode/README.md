# Workspace with OpenCode preinstalled

OpenCode 2.2.5, TypeScript 7.0.2, Node 24 and Python 3.13 are installed with Git in a Linux/amd64 workspace. The official OpenCode baseline x64 binary is pinned by npm integrity and included unmodified. The image includes the upstream MIT license at `/opt/render/licenses/OPENCODE-LICENSE`.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

## Prepared coding tasks

The `opencode-typescript-repo` and `opencode-python-repo` filesystem recipes prepare a synthetic repository, an intentionally broken implementation, a prompt, `AGENTS.md`, a real agent launcher and an independent grader. Preparation does not invoke OpenCode or store credentials.

After restore, authenticate with your chosen provider using OpenCode's supported flow, then run `node run-agent.mjs` from the recipe directory. The launcher runs `opencode run --standalone --format json` against `project/`; it keeps normal permission checks and uses a private server instead of the shared background service. Pass additional run options, such as `--model provider/model`, to the launcher. You can also run `opencode` interactively from `project/`. Model calls require provider access and may incur usage charges.

Run `bash grade-project.sh` to evaluate the edited implementation against independent tests. The mutable `project/` is separate from immutable prepared inputs; reference acceptance does not overwrite user edits.

## Verified scope

Offline acceptance verifies the installed CLI's version and help, TypeScript/Python toolchains, the known failing baseline, a reference repair, patch replay, semantic output checks, corruption rejection, output regeneration and prepared-state restore. It records `agentInvoked: false`. Model-backed runs: Not tested.

No host credentials, provider keys, model weights, external repository or agent session state are baked into the image. Add credentials only after restore and keep them out of shared snapshots.

## Configuration and dependencies

`opencode` and `tsc` are on the default PATH. Dependencies are available to workspace scripts through `/workspace/node_modules`. The image sets `XDG_CONFIG_HOME=/opt/render/config`; `/opt/render/config/opencode/opencode.json` disables update checks and automatic formatter/LSP installation. Users can change those settings after restore. Built-in provider and authentication choices remain available.

The pinned binary is self-contained for version/help and carries the native provider runtimes. Real agent use can access provider endpoints and refresh the model catalog. Custom provider packages, plugins, MCP servers or enabled language servers can require additional installations; these optional configurations are not part of the offline acceptance result.

OpenCode V2 uses `@opencode/cli`; `opencode-ai` is the separately maintained V1 package. The image installs the official `@opencode/cli-linux-x64-baseline` package directly to avoid choosing an AVX2 binary based on the build machine or running a fallback downloader.

Sources: [V2 installation](https://dev.opencode.ai/v2/docs/), [CLI and standalone mode](https://dev.opencode.ai/v2/docs/cli/), [configuration](https://dev.opencode.ai/v2/docs/config/), [providers](https://dev.opencode.ai/v2/docs/providers/), [pinned license](https://github.com/anomalyco/opencode/blob/v2.2.5/LICENSE).
