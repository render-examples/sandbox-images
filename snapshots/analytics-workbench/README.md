# Analytics workbench

A reusable **filesystem snapshot recipe**, built on `python-analysis`. It contains
synthetic source files and a known baseline. After restore, a small analysis job
cleans duplicates and missing quantities, joins three formats, and creates a
checked table, summary and chart.

Live Render capture/restore: Passed for recipe 0.1.0 using `python-analysis:0.1.0`. The parent GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

## Prepared inputs and expected result

| File | Contents |
| --- | --- |
| `input/orders.csv` | Seven order rows, one duplicate ID and one missing quantity |
| `input/customers.parquet` | Four synthetic customers and their regions |
| `input/products.xlsx` | Two synthetic products and prices in integer cents |
| `baseline.json` | Source hashes and expected answers |

Cleaning retains six orders, replaces the missing quantity with one, and produces
21,200 cents total revenue: east 14,100; west 7,100. No customer data or credentials
are used. Source hashes are recorded during preparation and checked after restore.

Outputs under `/workspace/output` are `summary.json`, `clean-orders.parquet`,
`revenue.png` (600×400), and `verification.json`. The verifier checks calculations,
input preservation, table cleanliness, PNG decoding, dimensions, nonblank pixels,
and hashes of collected outputs. It does not make a claim about visual aesthetics.

## Local workload check

With the `python-analysis` image built, mount this recipe read-only and run:

```sh
docker run --rm --platform linux/amd64 --network none \
  -v "$PWD/snapshots/analytics-workbench:/recipe:ro" \
  render-sandbox-python-analysis:0.1.0 bash -euc '
    python /recipe/recipe.py prepare
    python /recipe/recipe.py analyze
    python /recipe/recipe.py verify
  '
```

This checks packages and the workload. It does **not** test Render snapshot restore.

## Capture, restore and verify on Render

Use Node 24 or newer. Install the pinned host tooling once:

```sh
npm ci --prefix tools
```

Set `RENDER_API_KEY` only in the host environment. Supply your own existing workspace
and sandbox group, an explicit supported compute plan, and the actual GHCR
digest recorded in this recipe's `manifest.json`. The validation report records the tested compute plan.

```sh
npm run --prefix tools analytics-workbench -- \
  --workspace tea-YOUR_WORKSPACE \
  --group sbg-YOUR_GROUP \
  --plan YOUR_PLAN \
  --image ghcr.io/render-examples/sandbox-python-analysis@sha256:YOUR_DIGEST
```

For a private GHCR package, also set `GHCR_USERNAME` and `GHCR_TOKEN` in the
host environment. Use a token with `read:packages` and access to this package;
never put its value in command-line arguments or a committed file. The runner
passes these credentials only to Render's image-import API. They are not added
to the guest environment, snapshot, or evidence, and are redacted from errors.
Public image imports require neither variable.

The runner verifies group membership before import; imports the exact image;
creates a network-denied preparation sandbox; uploads only this recipe; prepares
and checks data; removes generated outputs; captures a filesystem snapshot; then
terminates the source sandbox before restoring. It compares the saved baseline,
requires outputs to be absent, reruns analysis after restore, collects checked
artifacts into a fresh host directory and cleans up both temporary sandboxes and
the snapshot. The imported image remains available in the group.

Add `--keep-snapshot` to retain a **successfully verified** snapshot for 24 hours.
The emitted ID is private to your group. Restore it with that same group and
reapply `deny-all`, runtime and idle limits. Rerun preparation when it expires or
when the image/recipe changes. The public registry distributes this recipe and
its parent image pin, never a universal `snp-...` ID.

This recipe uses filesystem capture because its reusable state is files, with no
database writes or running interpreter to preserve. It does not claim runtime
process continuity or a startup-performance improvement.

## Evidence and interruption recovery

`tools/evidence/analytics-workbench-<run>/run.json` records resource IDs immediately
after each successful create response, source digest, recipe hash, SDK version,
plan, baseline hash, outcomes and cleanup errors. `--output` selects a different
fresh directory. Treat these local receipts as workspace-specific; publish a
sanitized verification report separately before promoting a registry manifest.

Guest commands have timeouts, sandboxes have 900-second runtime limits, and the
caller has an 18-minute deadline. SDK mutation requests may still complete after
the caller times out; a missing create response cannot establish whether a
resource exists. Inspect the group and resource journal before retrying. A failed
cleanup is a failed validation, with the unresolved IDs in the journal. Captures
still in progress cannot be deleted immediately; inspect them after completion.
Downloaded files are only the fixed, bounded outputs of this repository's fixture;
this runner is not a generic downloader for untrusted user workloads.

The API contract was checked against
[`@renderinc/sdk` 1.6.0](https://github.com/render-oss/sdk/blob/3e2558f0a777a323cc3ad64f717053cdbb316699/typescript/src/experimental/sandboxes/index.ts)
and [Render's snapshot documentation](https://render.com/docs/sandboxes-snapshots).
