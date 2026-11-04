# Coding sandbox with Codex preinstalled

The official Codex CLI **0.166.0**, Node **24.22.2**, TypeScript **7.0.2**, Python **3.13.18** and Git **2.39.5** are available on the default PATH. The image targets linux/amd64 and uses digest-pinned Debian Bookworm runtime images.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

`fixture/package-lock.json` pins the official `@openai/codex` package and its Linux native artifact with npm integrity hashes. Installation keeps the published CLI launcher and native executables intact. Codex is Apache-2.0 licensed; its bundled license files remain installed. OpenAI's [release notes](https://learn.chatgpt.com/docs/changelog) document this exact npm release.

## Prepared repositories

- [TypeScript repository](../../snapshots/codex-typescript-repo): repair replay handling and integer-cent validation, with an independent five-test suite and 100 generated cases.
- [Python repository](../../snapshots/codex-python-repo): repair iterator batching, partial batches and size validation with independent tests.

After preparation or restore, each workspace contains a Git repository in `project/`, its task prompt and `AGENTS.md`, plus `run-agent.mjs` and `grade-project.sh`. No repository dependencies need downloading. The compiler is installed in the image; Python uses the standard library.

Authenticate after restoring, then run `node run-agent.mjs` from the recipe root to invoke the real `codex exec --json -` command with the prompt on stdin. Run `bash grade-project.sh` to grade its edits against independent tests. The launcher does not bypass permissions or select a paid model for you. You can invoke `codex` directly for its full interactive and noninteractive options.

## Authentication

The official CLI's authentication and provider configuration remain available. Use `codex login` for the normal sign-in flow, or `codex login --device-auth` on a headless sandbox when enabled for your account. For API-key authentication, supply your own key at runtime and pipe it to `codex login --with-api-key`; enterprise access-token and provider options remain available. See [official authentication guidance](https://learn.chatgpt.com/docs/auth?surface=cli) and the [CLI reference](https://learn.chatgpt.com/docs/cli/reference).

No host credentials, account sessions, provider keys or forced authentication settings are included. Prepare and capture shared snapshots before authentication; authenticate only after restore and keep credential caches out of shared snapshots. Actual agent runs need network access and your own authorized account/provider.

## Verification boundary

Run `python3 scripts/check-image.py codex` from the repository root. Offline checks verify CLI version/help, the Python native libraries, Git, the compiler and both recipe lifecycles. They prove the original task fails and a reference patch passes independent tests, including input/artifact corruption checks.

The reference repair runs in separate scratch state and leaves `project/` untouched. Receipts explicitly report `agentInvoked: false`. Model-backed runs: Not tested.
