# Devin CLI coding agent

The official Devin CLI `3000.11.234` (reported build `92c83011d113`), with Node 24, Python 3.13.18, TypeScript 7.0.2 and Git. The two prepared repositories give Devin a concrete task, a failing implementation, a Git baseline and independent tests:

- [TypeScript repository](../../snapshots/devin-cli-typescript-repo): repair replay-safe integer-cent totals.
- [Python repository](../../snapshots/devin-cli-python-repo): repair iterable batching without losing the final partial batch.

After preparing or restoring a recipe, enter `/workspace/<recipe-slug>`. Authenticate using Devin's supported method, then run:

```sh
node run-agent.mjs
bash grade-project.sh
```

`run-agent.mjs` invokes the real `devin --print` on the mutable `project/` directory. It can call a paid model. Use `devin auth login`, including `--force-manual-token-flow` for remote terminals where appropriate, or supply your approved runtime credentials through Devin's documented credential mechanism. No host credentials or tokens are included. Additional launcher arguments are forwarded. Workspace trust and permission modes remain the caller's choices: headless mode may require first trusting your repository, and the launcher does not select dangerous/autonomous modes or skip trust automatically. See [commands](https://docs.devin.ai/cli/reference/commands) and [authentication](https://docs.devin.ai/cli/enterprise/devin-auth).

`bash recipe.sh analyze` instead applies a known reference repair in disposable work state, preserves the user's project, and verifies the resulting patch with independent tests. It records `agentInvoked: false`. `grade-project.sh` grades actual candidate source using immutable tests from the image, so changing project tests cannot produce a passing grade. Local acceptance is evidence of the installed CLI, prepared repository and grader; it is not a model-backed coding evaluation.

## Installation and updates

The Dockerfile downloads the exact Linux archive named by the [official release manifest](https://static.devin.ai/cli/3000.11.234/manifest.json), checks upstream SHA-256 `201370cddd2924294e3ca6b46fd8ece49b5763953b644a1dd823fce5490cb41a`, and preserves the complete bundle, including documentation and manpages. The executable is statically linked. Node/Python bases are digest pinned; Python extension dependencies are checked on Bookworm and TypeScript uses an integrity-checked npm lockfile.

The image provides the documented user configuration `auto_update: false` at `/root/.config/devin/config.json`. This prevents background installations but may still check for updates; it does not disable provider networking. The CLI symlink points to the fixed installed version. Users overriding the user config should preserve that setting when they need the pinned behavior. See the [configuration reference](https://docs.devin.ai/cli/reference/configuration/config-file). No vendor binary is patched.

Run `python3 scripts/check-image.py devin-cli` to build and check both recipes offline, including CLI version/help, failing baseline, reference fix, patch replay, artifact corruption, regeneration and restoration into a fresh container. Acceptance uses 2 GiB and bounded execution. Real Devin authentication/inference, optional nested sandbox features and live Render import/capture/restore are separate validation steps.

Version 0.1.0 remains draft/unverified until publication and live Render evidence are recorded. Repository fixture code is MIT licensed; vendor software retains its own terms. [Official Devin CLI installation](https://docs.devin.ai/cli).
