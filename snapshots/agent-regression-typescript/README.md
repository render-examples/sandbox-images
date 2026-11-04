# TypeScript agent regression tasks

A prepared repository containing three deliberately broken TypeScript tasks and
an independent behavioral grader. Use it to compare coding agents or harness
changes from the same initial source state, inspect per-task results and collect
the actual Git patch. It makes no model-quality or performance claim.

Live Render capture/restore: Passed for recipe 0.1.0 using `coding-workspace:0.1.1`. The parent GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Recipe **0.1.0** reuses the existing `coding-workspace:0.1.1` image by its recorded
GHCR digest. Node, TypeScript 7.0.2 and installed compiler dependencies come from
that image; this recipe adds no image and downloads nothing at execution time.

## Three tasks

The machine-readable contract is `tasks.json`; the prepared repository also
contains a copy as `TASKS.json`.

| Task | Required behavior | Initial bug |
| --- | --- | --- |
| `grouping` | Sum cents per category; handle arbitrary string keys; reject invalid values and overflow; preserve input | Overwrites repeated groups and mishandles prototype-like keys |
| `idempotency` | Collapse exact repeats, reject conflicting payloads, return new sorted records and preserve input | Silently ignores conflicting duplicates and returns unsorted aliases |
| `validation` | Parse a strict order schema, normalize the ID and reject coercion, bad bounds and unsafe arithmetic | Coerces unchecked input and accepts unknown fields |

Each task has four independent checks, for twelve total. Initial sources compile,
but all three tasks fail at least one check. `baseline-results.json` preserves
those actual initial failures. Test inputs are synthetic and require no API key.

## Prepare, edit and grade

The host uploads only the manifest's explicit `execution.files`. The recipe works
when those mode-0600 files already exist at
`/workspace/agent-regression-typescript` before prepare.

```sh
bash recipe.sh prepare
# Capture the filesystem snapshot here, before installing any solution.
# Edit repo/src/grouping.ts, repo/src/idempotency.ts and repo/src/validation.ts.
bash recipe.sh grade
bash recipe.sh verify
```

`grade` compiles and scores the current source. It never replaces source with a
reference implementation and accepts alternative correct implementations. New
TypeScript helpers may be added under `repo/src`. A failed or partial grade exits
with status 1, writes per-task results and a patch, and leaves no passing
`verification.json`. Compilation failures are also recorded as failed grades.

The twelve checks live outside the editable repository under `grader/`. The
recipe compares their hashes with the uploaded originals before and after
execution, fingerprints every source file (including added helpers) before compilation
and after each grading worker, checks the prepared Git baseline, and rejects modifications to package
metadata, task definitions or compiler settings. Grading workers run in separate
bounded processes. Use deny-all sandbox egress, as the live validator does;
local acceptance uses Docker networking disabled. This detects ordinary fixture
modification; it is **not a tamper-proof scoring boundary against hostile code
with root access to the sandbox**. Keep independent host-side controls when
using results from adversarial candidates.

`verify` checks the artifact hashes and patch, recompiles current source and
reruns the grader. A forged summary or stale passing result is insufficient.
Every failed grading/verification command invalidates its old success receipt.

## Acceptance commands

```sh
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

`analyze` installs the checked-in reference implementations solely to demonstrate
that this recipe and grader work. It is a deterministic acceptance workload, not
an agent run. The `reference/` files are visible and are not secret benchmark
answers. For an agent evaluation, restore the prepared baseline, let the agent
edit source, and invoke `grade` instead of `analyze`.

The negative checks reject changes to the baseline, initial failure record,
summary, per-task results, patch and grader. They also demonstrate acceptance of
an alternative correct implementation, a partial score, a compilation failure, a timed-out candidate, source/helper self-modification rejection,
and regeneration after all outputs are removed.

## Snapshot contract

- Prepared workspace: `/workspace/agent-regression-typescript/repo`.
- Installed `node_modules` and the initial Git commit are ordinary files included
  in the filesystem snapshot.
- `grader/` contains read-only copies of the grader and task manifest outside the
  editable repository.
- `baseline.json` records the original source/input hashes and baseline Git head.
- `baseline-results.json` records each task's initial failing checks.

Prepare refuses to replace an existing project. It leaves no declared task
outputs and removes compiled files before capture. No server, database or live
process needs to survive the snapshot. After restore, the generic validator
checks the prepared baseline and absence of output files, executes analyze and
verify, downloads artifacts, verifies their hashes and cleans up test resources.
Actual snapshots belong to the caller's Render sandbox group.

## Outputs

| File under `/workspace/output` | Contents |
| --- | --- |
| `summary.json` | Total/passing tasks and checks, initial failed-task count, compile outcome |
| `task-results.json` | Each independent check's pass/fail and failure reason |
| `build.txt` | Compiler success or bounded compiler diagnostics |
| `change.patch` | Actual Git diff of source edits from the prepared commit |
| `verification.json` | Present only for a complete passing grade; expected summary and SHA-256 output hashes |

The acceptance solution yields 3/3 tasks and 12/12 checks, with all 3 initial tasks
known to fail. Runtime durations are deliberately omitted from scoring.

Local image/recipe acceptance uses:

```sh
python3 scripts/check-image.py coding-workspace --skip-build
```

Use `--skip-build` only when the existing `coding-workspace:0.1.1` image is already
available locally. The recipe's declared parent digest is unchanged; neither
these fixtures nor their validation require rebuilding or republishing it.
