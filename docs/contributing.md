# Contributing

Each image has its own version, GHCR package and manifest. Recipes pin a parent
image and prepare files in the caller's Render sandbox group. Keep build inputs,
publication receipts and live validation results tied to the same version.

## Repository layout

```text
images/<slug>/       Dockerfile, dependency locks, workload, manifest, README
snapshots/<slug>/    preparation and verification recipe, manifest, README
tools/              host-side Render SDK runners
runtime/            shared Node and Python recipe lifecycle
scripts/            build checks and manifest export
.github/workflows/  checks and manual image publication
```

## Change an image or recipe

Pin dependency versions and hashes, including the official base image digest.
Update the asset's version when its build inputs change. Packages needed by the
bundled workload must be installed during the image build. Supply user data at
execution time.

Image manifests declare `execution.smokeCommand`. Native recipes declare
`execution.recipeCommand`, their regular `execution.files`, expected summary and
output paths. Keep verification independent of generated summaries: decode the
artifacts and check their contents. The [runtime contract](../runtime/README.md)
describes preparation, execution, verification and corruption tests.

Some recipes carry generated runtime copies because they use an older published
image. After editing `runtime/`, update those copies:

```sh
python3 scripts/sync-uploaded-runtimes.py
```

CI rejects stale copies. Build contexts exclude credentials, local outputs and
dependency directories. Raw `evidence/` journals are ignored by Git and excluded
from builds because they contain workspace resource IDs.

## Run checks

Use Python 3 and Docker with a running Linux engine. The host SDK tools require
Node 24 or newer.

```sh
python3 scripts/test-export.py
python3 scripts/test-release.py
python3 scripts/test-check-image.py
python3 scripts/sync-uploaded-runtimes.py --check
python3 scripts/export-catalog.py --output artifacts/catalog.json
python3 scripts/check-image.py IMAGE_SLUG
npm ci --prefix tools
npm run --prefix tools typecheck
npm test --prefix tools
```

The image checker builds for `linux/amd64`, checks guest tools, and runs the
workloads by immutable image ID with guest networking disabled. Native recipe
checks upload only declared files at mode 0600, prepare a baseline with outputs
absent, and restore the filesystem in a second clean container. They check
corruption rejection and output regeneration. Image smoke writes to a temporary
directory so it leaves existing recipe results intact.

PR CI checks every image, including dependents of shared runtime changes. Keep
that coverage if you introduce a selective build matrix. Local checks establish
container behavior; record Render import and snapshot results through the live
runners in the [validation guide](multi-runtime-validation.md).

## Publish an image

1. Merge reviewed image definitions and run the **Publish an image candidate**
   workflow from `main` for the selected image. A merge does not trigger
   publication. The workflow loads a one-platform build, tests its immutable
   image ID and pushes that same image.
2. Retain the publication receipt. It compares the checked and published
   configuration digests and records the OCI manifest digest and source commit.
   The publisher rejects an existing version and stops on ambiguous registry or
   authentication errors. All publishers must follow the same no-overwrite
   policy; GHCR tags themselves are mutable. Consumers use the recorded digest.
3. Check the package's access settings. New GHCR packages default to private.
   Before public distribution, make the intended package public and verify an
   anonymous pull by digest. Follow [GitHub's Container registry guidance](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

The workflow uses `GITHUB_TOKEN` with `packages: write`. For a package created
elsewhere, grant this repository access under the package's **Manage Actions
access** settings. Organization policy must also permit package creation.
GitHub Actions are pinned to commit SHAs, and publication does not create a
floating `latest` tag.

## Record live validation

Run import, image workload, preparation, capture and restore checks against the
published digest. Select the workspace, sandbox group and compute plan
explicitly. Keep Render and registry credentials on the host.

The runners capture prepared files with generated outputs absent, terminate the
source sandbox, then restore and run the checks. Filesystem recipes restart
processes after restore. Claim runtime process continuity only after a separate
test demonstrates it. Snapshots belong to the user's sandbox group; distribute
the versioned recipe and parent image pin rather than a reusable public snapshot
ID. Rebuild expired state from the pinned recipe. See [Render's snapshot documentation](https://render.com/docs/sandboxes-snapshots).

Publish a reviewed report containing the tested SDK version, compute plan,
image digest, recipe hashes, outputs, timings and cleanup result. Keep raw
execution logs and workspace resource IDs in local evidence. Inspect the journal
before retrying an interrupted mutation: a timed-out request may have completed.
A cleanup failure leaves validation incomplete.

## Update release metadata

Record the immutable source revision, image digest and completed Render evidence
in the image and recipe manifests. Each recipe must pin its verified parent
image. Use the build/input commit as the source revision; a later metadata-only
commit records the digest and evidence. Run the recipe from its input commit and
retain its code hash in the report. Build-input changes need a new candidate
version and a new validation run.

Change `status` to `verified` only after the release requirements are met. Keep
private packages marked draft in the public registry. Do not fill missing
metadata with guessed digests, snapshot IDs, dates or performance claims.

Export `artifacts/catalog.json` and ingest it into the Render Registry's technical
catalog in `data/sandbox-assets.json`. The registry joins this data with Sanity
editorial entries through `registrySource`. The exporter supplies source, digest
and verification data. Draft entries must stay visibly draft and have no
published launch action.
