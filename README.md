# Render sandbox images

Image definitions and reproducible snapshot recipes for Render Sandboxes. Each
image has its own version and GHCR package. Snapshot recipes create prepared
state inside the caller's Render sandbox group.

The first implementation contains:

| Asset | Source | Current state |
| --- | --- | --- |
| Python analysis image | [images/python-analysis](images/python-analysis) | Development candidate |
| Analytics workbench snapshot recipe | [snapshots/analytics-workbench](snapshots/analytics-workbench) | Development candidate |

See [the backlog](docs/backlog.md) for the remaining scope. This repository
supplies the technical source and release metadata for the global Render
Registry. The registry's existing Sanity records own editorial presentation;
the exporter is an ingestion input, not a separate editorial catalog.

## Local checks

Requires Python 3, Docker with a running Linux engine, and Node 24 for the host
recipe runner. Builds target `linux/amd64`, including when run from an ARM Mac.

```sh
python3 scripts/test-export.py
python3 scripts/test-release.py
python3 scripts/export-catalog.py --output artifacts/catalog.json
python3 scripts/check-image.py python-analysis
cd tools
npm ci
npm run typecheck
npm test
```

The image check builds from a digest-pinned official base, verifies required
guest tools, and executes realistic image and snapshot workloads with networking
disabled. It does not prove Render import or capture/restore. Follow the
[analytics recipe](snapshots/analytics-workbench/README.md) for that separate
live validation, using an explicitly selected workspace and sandbox group.

## Layout

```text
images/<slug>/       Dockerfile, hash lock, workload, manifest, README
snapshots/<slug>/    preparation and verification recipe, manifest, README
tools/              host-side Render SDK runner (credentials stay on the host)
scripts/            build checks and technical manifest export
.github/workflows/  checks and explicit image publication
```

## Release and registry connection

1. Update one asset's pinned inputs and its independent semantic version. Run
   local checks. PR CI checks every image, so shared changes also exercise all
   dependents; a future selective matrix must preserve that property.
2. Run **Publish an image candidate** from `main` for the selected image. It
   loads the one-platform build into Docker, tests by immutable image ID, and
   pushes that same ID. An authenticated GHCR check rejects existing versions
   and fails closed on ambiguous/authentication errors. The receipt compares
   the published configuration digest with the checked configuration and records the OCI
   manifest digest and source commit. Publication is manual; a merge
   alone never publishes an image or marks it ready in the registry.
3. A newly created GHCR package defaults to private. Make the intended public
   package public in GitHub package settings and verify anonymous digest pulls
   before listing it. Workflow token authentication is used only by the publisher.
   The workflow needs `packages: write`; its `GITHUB_TOKEN` can publish packages
   associated with this repository. For a pre-existing package created elsewhere,
   grant this repository access under the package's **Manage Actions access**
   settings. Organization package-creation policies must also permit it.
4. Run the documented Render import, workload, capture and restore checks using
   the published digest. Keep resource IDs and raw execution logs out of public
   metadata; publish a reviewed evidence report with the actual tested client,
   compute plan, outputs, timings and cleanup result.
5. Update the image and recipe manifests with the immutable source revision,
   image digest and completed Render verification evidence. A recipe must pin
   its verified parent image. Only then change `status` to `verified`.
   The revision is the **build/input commit A**, not the later metadata commit B
   that records the digest and evidence. Run the recipe from checkout A and keep
   its code hash in the evidence. Commit B changes release metadata only; it
   never tries to contain its own future commit SHA. Build-input changes require
   a new candidate version and a fresh run.
6. Export `artifacts/catalog.json` and ingest those technical fields into the
   registry's Sanity-backed asset variants. Drafts must remain visibly draft
   and have no published launch action. Editorial descriptions remain editable
   in Sanity; digests and verification must come from validated releases.

Publication and Render verification are separate states. Never invent a digest,
snapshot ID, performance claim or verification date to fill metadata.
The no-overwrite guard serializes this repository's publisher; all publishers
must follow the same version policy. GHCR tags are not registry-enforced immutable
references, so consumers always use the recorded digest.

Public distribution and package permissions follow
[GitHub's Container registry guidance](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## Snapshot distribution

The public asset is a versioned recipe, not a globally reusable `snp-...` ID.
Prepare and capture in the user's group; restore and validate there. The runner
uses synthetic fixtures and keeps Render credentials outside the guest. Runtime
snapshots need demonstrated process continuity; filesystem recipes explicitly
start processes after restore and verify files and data. Rebuild expired state
from its pinned recipe. See [Render's snapshot documentation](https://render.com/docs/sandboxes-snapshots).

## Dependency maintenance

Image requirements are exact and hash-locked; OS contents come from a pinned
official base digest. Update pins deliberately and rerun workloads. Do not
silently add packages at runtime. Build contexts exclude credentials, local
outputs and dependency directories. User data is supplied at execution time.
Raw `evidence/` run journals are ignored by Git and excluded from build contexts;
they include workspace resource IDs. Publish only a separately reviewed report.

GitHub Actions are pinned to commit SHAs. Release versions are independent per
image, and publication does not produce or overwrite a floating `latest` tag.

## License

MIT for this repository's code. Redistributed runtimes and libraries retain
their own licenses; package metadata and the image's installed distributions
identify their upstream projects.
