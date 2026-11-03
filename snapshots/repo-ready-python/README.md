# Repository-ready Python

A filesystem snapshot recipe for a synthetic Python repository with Git history,
a locked uv environment, pytest, Ruff and a reproducible bug-fix task. It depends
on the `python-coding` image. Snapshots belong to the caller's Render group;
this entry distributes preparation/verification code, not a shared snapshot ID.

This recipe is draft. Local tests do not prove live Render capture and restore.

## Lifecycle and prepared state

Upload the files listed in `manifest.json` to
`/workspace/repo-ready-python`. Run each command in that directory:

```sh
bash recipe.sh prepare
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

`prepare` refuses to overwrite an existing repository. It copies the image's
fixture and installed virtual environment to `repo/`, creates a deterministic
Git commit, runs three baseline tests and Ruff, then records the source hashes
and expected results in `baseline.json`.

`analyze` resets only the two controlled task files, adds two regression tests,
proves the half-cent case fails before the fix, applies the integer-rounding fix,
and writes the artifacts below. Repeated analysis is intentional: after deleting
all output artifacts it regenerates them from the prepared inputs, offline.
This is a scripted environment acceptance fixture, not a claim that an agent
solved the task.

`verify` checks the pinned original inputs and working configuration, tool
versions, expected task changes, exact summary, test counts, clean lint, Git patch
and output hashes. `test` corrupts the baseline, a working input, a valid JSON
result and the patch in turn, and requires each corruption to be rejected.

For a filesystem capture, run `prepare` and capture the pristine repository,
`.venv`, `.git` and baseline before running `analyze`. No live application process must survive. Restore in
the same sandbox group with deny-all networking, invoke `analyze` and `verify`
explicitly, and download the artifacts before terminating temporary resources.
Use the repo's generic Render validator for the separate live check after
publishing the private image. Capture the clean task baseline first, then verify
the source workload and require restored analysis to generate its own outputs.

## Artifact contract

| File under `/workspace/output` | Meaning |
| --- | --- |
| `summary.json` | 3 baseline tests, 1 expected pre-fix regression failure, 5 passing final tests, total 3250 cents, discounted 2600 cents, half-cent result 51, 2 changed files |
| `regression.xml` | JUnit result showing the known regression fails before the fix |
| `tests.xml` / `tests.txt` | Final pytest JUnit result and console output |
| `lint.json` | Empty Ruff diagnostic list |
| `change.patch` | Git diff containing the implementation fix and new tests |
| `verification.json` | `passed: true`, expected summary and SHA-256 of every other artifact |

Test duration fields may differ across runs. Each run records its own artifact
hashes; semantic results must match. The fixture contains only synthetic source
and no credentials. No network or extra runtime installation is needed. Local
checks use 2 GB memory, 2 CPUs and a 120-second deadline; a supported Render plan
must be selected and recorded separately during live validation.

The `.venv` copy assumes the same image and interpreter path. Rebuild the image
and recreate prepared state when updating the interpreter or dependencies.
