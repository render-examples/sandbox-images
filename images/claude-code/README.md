# Coding sandbox with Claude Code preinstalled

The unmodified official Claude Code CLI **2.1.318**, Node **24.22.2**, TypeScript **7.0.2**, Python **3.13.18** and Git **2.39.5** are available on the default PATH. The image targets linux/amd64 and uses digest-pinned Debian Bookworm runtimes.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Anthropic recommends its native installer and also [supports npm installation of the same native binary](https://code.claude.com/docs/en/setup). This image uses exact `@anthropic-ai/claude-code` and platform-package integrity pins in `fixture/package-lock.json`, followed by Anthropic's offline postinstall linker. The official binary and its license files remain intact. Background self-updates are disabled by default with `DISABLE_AUTOUPDATER=1` for reproducibility; users can override this environment setting. No authentication method is disabled or restricted.

## Prepared repositories

- [TypeScript repository](../../snapshots/claude-code-typescript-repo): repair replay handling and integer-cent validation, with five independent tests and 100 generated cases.
- [Python repository](../../snapshots/claude-code-python-repo): repair iterator batching, partial batches and size validation with independent tests.

Each prepared workspace includes a Git repository in `project/`, its task prompt and `CLAUDE.md`, plus `run-agent.mjs` and `grade-project.sh`. The compiler and Python standard library are already available; the fixture needs no dependency downloads.

After restore and authentication, run `node run-agent.mjs` to invoke the actual `claude --print --output-format json` CLI. The prompt is passed as a separate argument after `--`. Run `bash grade-project.sh` to independently grade the edited implementation. The launcher preserves permission controls; no automatic permission-bypass flag is set. The native `claude` command remains directly available for all supported modes.

## Authentication and usage

End users authenticate directly with their own account or provider. The CLI retains Claude-account sign-in, Console/API-key access, OAuth-token configuration and supported cloud-provider options. For example, run `claude auth login` for its built-in flow, or inject your own `ANTHROPIC_API_KEY` at runtime. See [authentication](https://code.claude.com/docs/en/authentication) and [environment variables](https://code.claude.com/docs/en/env-vars).

No credentials, sessions, provider routing or organization restrictions are baked in. Capture prepared snapshots before authentication, then authenticate after restore; do not share credential caches in snapshots. Usage is billed to the end user's account/provider. Claude Code remains governed by [Anthropic's terms](https://code.claude.com/docs/en/legal-and-compliance); this example does not intermediate inference billing or imply Anthropic endorsement.

## Verification boundary

Run `python3 scripts/check-image.py claude-code`. Offline acceptance checks verify native CLI version/help, Python libraries, Git and TypeScript, then reject the broken task and independently verify a reference repair. They exercise both recipe lifecycles and corruption checks without invoking a model. Receipts state `agentInvoked: false`; the reference repair leaves the user project untouched.

The bounded offline checks use 2 GB; Anthropic lists 4 GB+ for actual Claude Code use. Model-backed runs: Not tested.
