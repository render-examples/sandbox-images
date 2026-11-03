# Repository-ready TypeScript

A filesystem snapshot recipe for `coding-workspace`. It prepares a synthetic Git
repository with a package lock, installed TypeScript compiler, source, and three
passing baseline tests. It needs no external repository or credentials.

The demonstration task adds an integer percentage-discount function and two
regression tests. After a fresh compilation and five passing tests it emits:

- `summary.json`: three baseline tests, five final tests, 3,250 cents subtotal,
  2,600 cents after a 20% discount, and two changed files.
- `tests.tap`: actual Node test-runner output.
- `change.patch`: the Git diff for the source and test changes.
- `verification.json`: expected-result checks and SHA-256 hashes of these outputs.

The baseline records the prepared Git commit and hashes of the source fixture.
Verification checks that the original committed inputs survived, the final source
and tests match the known task, and the patch matches the working tree. Corrupt
summary, patch, and baseline data must fail verification. This fixture does not
claim that an AI agent authored the patch.

## Local validation

From the repository root after building the image:

```sh
docker run --rm --platform linux/amd64 --network none --memory 2g --cpus 2 \
  --mount "type=bind,src=$PWD/snapshots/repo-ready-typescript,dst=/opt/recipe,readonly" \
  render-sandbox-coding-workspace:0.1.1 timeout -k 5 120 bash -ec '
    bash /opt/recipe/recipe.sh prepare
    bash /opt/recipe/recipe.sh analyze
    bash /opt/recipe/recipe.sh verify
    bash /opt/recipe/recipe.sh test
  '
```

## Capture and restore

Upload only `recipe.sh` and `recipe.mjs` to
`/workspace/repo-ready-typescript/`. Run `prepare` in a sandbox created from the
pinned parent image. The prepared repository lives at
`/workspace/repo-ready-typescript/repo`; its installed dependencies are ordinary
files and are included in filesystem capture. `baseline.json` is alongside it.

Capture immediately after `prepare`, with all declared output artifacts absent.
Wait for the filesystem snapshot to become available before exercising `analyze`
and `verify` in the source sandbox. This keeps the reusable snapshot at the clean
baseline, before the demonstration changes source or test files. Terminate the
source sandbox, restore in the same group with deny-all egress, verify the baseline
hash and absence of outputs, and run `analyze` and `verify` again. It recompiles
from source and must regenerate the declared outputs without package downloads.
`analyze` rewrites only the two deterministic task files from pinned fixture inputs.

The generic validator uses this same clean capture sequence. A restored filesystem snapshot does not preserve
running processes; start build/test commands explicitly. The registry distributes
this versioned recipe and parent image pin, not a universally usable snapshot ID.

This recipe passed live Render capture/restore against coding-workspace 0.1.1.
See the [validation evidence](../../docs/typescript-011-validation-2026-11-03.md).
It remains draft pending public distribution. Do not include customer repositories, secrets, or credentials in a shared
snapshot. The included fixture is synthetic and MIT-licensed.
