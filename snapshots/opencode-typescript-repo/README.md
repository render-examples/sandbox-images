# OpenCode TypeScript repository

Prepared TypeScript repository for OpenCode: synthetic failing task, runtime-authenticated launcher, and independent candidate grading.

The task is **replay-safe integer-cent totals with duplicate/conflict validation**. The prepared Git repository starts with a failing implementation. It includes a task prompt, agent instructions and runnable tests; no credentials or completed task outputs are prepared.

## Prepare and use

Upload the manifest's declared files, run `bash recipe.sh prepare`, then capture the filesystem before executing a task. The root can already exist for uploads. Restore into the caller's sandbox group.

After restore, authenticate through the installed CLI's supported method and supply any required provider network access. From `/workspace/opencode-typescript-repo`:

```sh
node run-agent.mjs
bash grade-project.sh
```

The launcher invokes the real OpenCode on `project/`, preserves its default permission controls, and has a five-minute process budget. Extra CLI arguments are passed through; consult the CLI help when configuring model selection and unattended edits. Running it can incur provider usage. Do not capture authentication into shared images or snapshots.

`grade-project.sh` copies the candidate source into separate scratch state and uses independent tests from the image. Changing the project's test files cannot satisfy that grader. This is a synthetic development fixture, not an adversarially secure evaluation service.

## Offline acceptance

```sh
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

These commands verify the installed CLI, reject the broken baseline, apply a reference repair in a separate worktree, and run five tests including 100 generated cases. Verification replays the patch against a fresh baseline and reruns independent tests. Corruption checks reject altered inputs, outputs and receipts, then regenerate results. Your mutable `project/` is preserved.

The summary explicitly records `agentInvoked: false`. A passing reference check does **not** establish that a model solved the task. Authenticated agent execution and live Render capture/restore require separate evidence.

Outputs: `summary.json`, `preflight.json`, `test-results.json`, `changes.patch`, `candidate-source.txt`, `verification.json`.

Draft 0.1.0. The parent image is not yet published; no live Render verification is claimed.
