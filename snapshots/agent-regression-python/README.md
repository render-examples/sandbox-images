# Python agent regression workspace

A prepared Python Git repository with three deliberately broken tasks and a separate
behavioral grader. Reuse the pinned `python-coding:0.1.0` image; no image rebuild,
package install, network access or model provider is needed. The image already
contains the pytest 9.2.0 interpreter used by this recipe.

| Task | Contract | Prepared baseline |
| --- | --- | --- |
| Input validation | Validate order fields strictly, reject coercion, booleans and unknown fields | 1 of 4 tests passes |
| Exact allocation | Allocate integer cents by largest remainder with stable ties; support large integers | 1 of 4 tests passes |
| Idempotent ledger | Apply each event ID once, reject conflicting replays and malformed events | 1 of 4 tests passes |

The full contract is in `TASKS.json`. The prepared workspace contains
`repo/src/tasks.py`, `repo/TASKS.json`, their committed Git baseline, pinned evaluation files and a baseline
receipt. Capture the filesystem snapshot after `prepare`, before any reference
solution or evaluation output is generated. Restore the same broken starting
state for each agent/harness run.

## Evaluate candidate edits

After preparation or restore, let the agent edit `repo/src/tasks.py`, then run:

```sh
bash recipe.sh grade
```

`grade` does not change candidate source. It reports per-task pass/fail and
failed test names in `/workspace/output/task-results.json`, plus a summary,
source hash and unified patch. A completed grade can contain failing tasks;
inspect `tasksPassed` and `testsPassed` rather than treating exit status zero as
candidate success. Invalid syntax or a timeout yields failed task results with a
`gradingError` field. Tests judge behavior, so alternative correct implementations
are accepted. The source hash ties the result to the assessed code.

The grader runs in a bounded subprocess with pytest plugin autoload disabled,
explicit test paths and no project configuration. Task and grader hashes are
checked before and after evaluation. This is a functional regression fixture,
not an adversarial grading boundary: candidate code runs in the same sandbox
and can read the visible tests. It makes no model-quality or performance claim.

## Validate the recipe itself

```sh
bash recipe.sh prepare
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

`analyze` deliberately replaces the one task file with the shipped reference
solution, labeled `reference-acceptance` in the results. This path demonstrates
that the recipe and restore work; it is not an agent result. Use `grade` for
actual agent edits. `prepare` accepts an existing upload directory but refuses
to overwrite prepared state. All uploaded inputs are declared in the manifest;
mode0600 files work because the caller reads them directly.

The acceptance summary is three completed tasks and twelve passing tests,
compared with zero completed tasks and three passing tests in the shipped
baseline. Verification reruns behavioral grading, checks unchanged baseline and
evaluator files, compares per-task results and exact patch contents, and hashes
all artifacts. Failed grading/verification removes an old passed receipt.
`test` checks an equivalent implementation, deliberately corrupts grader,
tests, baseline and results, and proves that grading a broken candidate reports
failures without applying the reference answer.

## Outputs

- `summary.json`: task/test counts and baseline counts.
- `baseline-results.json`: known broken baseline results.
- `task-results.json`: evaluation mode, per-task pass/fail and failed test names.
- `source.json`: assessed source and baseline SHA-256.
- `change.patch`: unified diff against the broken baseline.
- `verification.json`: acceptance receipt and artifact hashes, produced by the
  reference acceptance/verification flow only; `grade` does not issue this receipt.

Snapshots remain group-local. This version is a draft recipe; local offline
checks do not establish a live Render capture/restore result. The fixture and
reference answer are synthetic and MIT-licensed.
