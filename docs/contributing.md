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
.github/workflows/  checks, publication and live validation
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
# Install Trivy 0.76.2, then scan the checked image:
node tools/image-security.ts scan IMAGE_SLUG
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

## Release images

After merging the image changes, run **Release sandbox images** from `main`.
Enter comma-separated image slugs, or `all` to select manifests without a published
digest. The workflow runs two image releases at a time. A failure in one image
does not stop the others.

Each release runs these steps:

1. Require passing shared CI jobs and the selected image's CI job for the exact
   source commit. Build the image, run its offline workloads, and scan it for
   vulnerabilities and secrets before logging in to GHCR.
2. Push the tested image under its version tag. Existing tags are never replaced.
   Save the source revision, OCI digest, scan and SBOM in a publication artifact.
3. Check anonymous access to that digest. Import it into Render, test every
   prepared recipe, capture and restore each filesystem snapshot, and verify
   the outputs. Confirm termination of both sandboxes and deletion of each
   temporary snapshot.
4. Publish a GitHub Release named `image-<slug>-<version>` with `release.json`.
   This file contains the image digest, complete image and recipe manifests,
   security results and live validation evidence.

The registry's **Sandbox release refresh** workflow reads these public releases
on a 15-minute schedule. It updates source listings with their digests and results.
It retains the previous verified version while a newer candidate is being built
or tested. Accepted registry release policy and Sanity editorial content remain
separate from these source facts.

A release record is created only after every check passes. Model-backed agent
runs are outside these offline checks. Snapshots created during validation are
temporary; consumers create their own snapshots from the published recipe.

### One-time repository setup

Create a GitHub environment named `sandbox-validation`, restricted to `main`, with:

- Secret `RENDER_API_KEY`: a key authorized for the validation workspace.
- Variable `RENDER_WORKSPACE_ID`: the workspace ID.
- Variable `RENDER_SANDBOX_GROUP_ID`: the sandbox group ID.

The workflow checks that these values exist before building. The key stays on
hosted runners and is never uploaded to a sandbox. The workflow uses
`GITHUB_TOKEN` for package and GitHub Release writes; the registry uses its own
`GITHUB_TOKEN` to read the public receipts. No cross-repository token is required.

New GHCR packages default to private. Make a package public before its first
public release; subsequent versions inherit its visibility. If a package was
created elsewhere, grant this repository access in **Manage Actions access**.
The release's anonymous-access check fails if the package is still private.

### Recover a failed release

Read the failed job's artifacts before retrying. A lost response can leave a
sandbox or snapshot running even when GitHub reports a failure. Confirm or
complete cleanup using the resource IDs in `run.json` first.

If publication passed and validation failed, rerun the failed validation job.
It downloads the original publication artifact and tests the same digest without
rebuilding or replacing the tag. Security receipts must still satisfy the
[freshness and vulnerability policy](security.md); a stale receipt requires a
new scan of the exact published image before validation can proceed.

If publication itself stopped after pushing, inspect the GHCR tag and publication
artifact before doing anything else. The publisher refuses to overwrite a tag.
A partially created GitHub Release remains a draft and is excluded by the registry.
Do not overwrite an existing published receipt.

For an already published image with retained publication artifacts, prepare a
release record with the same tool used by CI:

```sh
npm ci --prefix tools
node tools/release-image.ts \
  --image IMAGE_SLUG --publication PATH_TO_PUBLICATION_ARTIFACT \
  --workspace tea-YOUR_WORKSPACE --group sbg-YOUR_GROUP \
  --output evidence/NEW_RELEASE_DIRECTORY
```

Raw resource IDs stay in ignored local evidence and workflow artifacts. Public
`release.json` contains digests and test results without workspace resource IDs.
The source manifests describe build candidates; the verified GitHub Release is
the distribution record. A separate metadata PR is not required for each release.

## Type safety

Use TypeScript for maintained Node.js code, including image workloads, recipe
runners, launchers and tests. See [AGENTS.md](../AGENTS.md) for the enforced rules.
Node 24 executes erasable TypeScript directly. Generated JavaScript stays in
ignored build directories.

From the repository root:

```sh
npm ci --ignore-scripts
node scripts/install-typecheck-dependencies.ts
node --test scripts/test-type-safety.ts
npm run check:types
```

The dependency installer is also run on Linux in CI. It installs each fixture's
pinned declarations without running package lifecycle scripts. Image builds
perform the normal dependency installation and exercise native modules.

The policy checks every maintained TypeScript file is in the root compiler
project and rejects handwritten JavaScript, explicit `any`, suppression comments,
blanket ambient modules and double assertions through `unknown`. CI runs strict
checking before the image matrix. Validate external data at the boundary instead
of asserting that an unknown value has the desired shape.

The publisher checks the latest completed `check.yml` push run for the exact main
commit, both before building and before pushing. The manifests, secret scan,
type-safety, recipe tools and selected image job must all pass. An unrelated image
failure does not block a passing image.
