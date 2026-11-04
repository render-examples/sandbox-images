# Cursor CLI coding agent

The official Cursor CLI `2026.10.22-27dcf5f`, with Node 24, Python 3.13.18, TypeScript 7.0.2 and Git. The two prepared repositories give Cursor a concrete task, a failing implementation, a Git baseline and independent tests:

- [TypeScript repository](../../snapshots/cursor-cli-typescript-repo): repair replay-safe integer-cent totals.
- [Python repository](../../snapshots/cursor-cli-python-repo): repair iterable batching without losing the final partial batch.

After preparing or restoring a recipe, enter `/workspace/<recipe-slug>`. Authenticate using Cursor's supported method, then run:

```sh
node run-agent.mjs
bash grade-project.sh
```

`run-agent.mjs` invokes the real `agent --print --output-format json` on the mutable `project/` directory. It can call a paid model. Supply `CURSOR_API_KEY` through your runtime environment or use the CLI's interactive login; no host credentials are copied into this image. Additional arguments to the launcher are forwarded to Cursor. Workspace trust and tool permissions remain the caller's choices; the launcher does not grant `--force`, `--yolo`, or `--trust` automatically. See the [official headless documentation](https://cursor.com/docs/cli/headless) for unattended editing and authentication.

`bash recipe.sh analyze` instead applies a known reference repair in disposable work state, preserves the user's project, and verifies the resulting patch with independent tests. It records `agentInvoked: false`. `grade-project.sh` grades the actual candidate source using immutable tests from the image, so changing project tests cannot produce a passing grade. Local acceptance is evidence of the installed CLI, prepared repository and grader; it is not a model-backed coding evaluation.

## Installation and updates

The Dockerfile downloads the exact archive selected by the [official installer](https://cursor.com/install), then checks SHA-256 `85296944e4600a83c4b764f578d1502bf9c416db200d33a593e8f3ecabfdc294` before extraction. This checksum was independently measured from the official versioned artifact; the installer does not publish a separate checksum. The complete vendor bundle and third-party notices remain intact. Its native Linux dependencies are checked against Bookworm. Node/Python bases are digest pinned; TypeScript uses an integrity-checked npm lockfile.

The `agent` and `cursor-agent` launchers prepend the pinned upstream CLI's `--disable-auto-update` option. This flag is implemented and accepted by this release but hidden from ordinary help; it is verified as part of CLI startup. Vendor files are not modified. Pin upgrades require revisiting this version-specific behavior. Other upstream options and commands are forwarded unchanged.

Run `python3 scripts/check-image.py cursor-cli` to build and check both recipes offline, including CLI version/help, failing baseline, reference fix, patch replay, artifact corruption, regeneration and restoration into a fresh container. Acceptance uses 2 GiB and bounded execution. Real Cursor authentication/inference, optional nested sandbox features and live Render import/capture/restore are separate validation steps.

Version 0.1.0 remains draft/unverified until publication and live Render evidence are recorded. Repository fixture code is MIT licensed; bundled vendor software retains its own terms and notices. [Cursor installation documentation](https://cursor.com/docs/cli/installation).
