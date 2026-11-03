# TypeScript tool workbench

A filesystem snapshot recipe for a prepared TypeScript transform/API-adapter
project. It pairs with `typescript-tools`; dependencies and synthetic inputs are
copied from the pinned image without a package download. The public asset is the
recipe. Actual snapshots belong to the caller's Render sandbox group.

This recipe passed live Render capture/restore against privately published
typescript-tools 0.1.1. It remains draft pending public distribution. See the
[validation evidence](../../docs/typescript-011-validation-2026-11-03.md).

## Prepared state

- Working directory: `/workspace/typescript-tool-workbench`.
- `project/`: TypeScript source, strict schemas, eight tests, input JSON,
  injected Fetch mock, npm lockfile, and installed dependencies.
- `baseline.json`: hashes of the immutable fixture inputs and expected results.
- `/workspace/output`: regenerated workload evidence, never credentials.

The runner uploads only `recipe.sh` and `recipe.mjs`. `prepare` refuses to
replace an existing prepared project. `analyze` checks pinned inputs, compiles
TypeScript, runs the tests, and executes the transform plus mocked delivery.
`verify` checks exact outputs, fixture hashes, and the output integrity receipt.
`test` rejects four input/output/baseline corruptions and verifies that deleting
all outputs followed by `analyze` regenerates the complete evidence set.

```sh
bash recipe.sh prepare
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

No background process or network connection needs to survive capture. After a
filesystem restore, explicitly run `analyze` and `verify`; both compile/execute
on the restored filesystem. Do not interpret a local test as proof of a Render
snapshot. Use the repository's generic live validator after private publication.
The validator captures immediately after `prepare`, before any workload outputs
exist. It then tests the source, restores the pristine baseline in the same group
with deny-all egress, re-runs the workload, and cleans up temporary resources.

## Outputs

| File | Expected evidence |
| --- | --- |
| `summary.json` | 3 input rows, 2 unique orders, 3,250 cents, 3 attempts, 1 delivery, 8 passing tests |
| `transformed.json` | Sorted `order-1`/`order-2` IDs and total cents |
| `receipt.json` | Accepted receipt with expected ID and total |
| `requests.json` | 503, 201, 201; stable key; final response deduplicated |
| `tests.tap` | Eight behavioral tests with zero failures |
| `verification.json` | `passed`, expected summary, SHA-256 hashes of the other five outputs |

The TAP artifact includes runtime durations, so its bytes may differ between
runs. Its hash is verified against that run's receipt; semantic results remain
fixed. Runtime credentials and live endpoint behavior are outside this fixture.

To adapt the example, deliberately update the pinned fixture and its expected
results, then rebuild and revalidate. The baseline intentionally rejects edits
to the shipped prepared inputs so it can detect corruption during validation.
