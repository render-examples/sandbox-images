# Validating native-runtime image and recipe pairs

The coding and PostgreSQL guests run native JavaScript/TypeScript and Bash/SQL
workloads. Document extraction uses Python with Poppler and Tesseract. Python on
the build host is only the shared Docker orchestration script.

## Local acceptance

Run `python3 scripts/check-image.py SLUG` for each image. The checker builds for
linux/amd64, verifies guest utilities, and runs smoke and recipe checks by image
ID with networking disabled and 2 GB memory. Each recipe checks deliberate
corruption, including inputs or baseline, output values, and workload-specific
invariants. PostgreSQL runs only on a Unix socket and stops before capture.

An image declares its bundled `execution.smokeCommand`. New snapshot recipes
declare `execution.recipeCommand: "bash recipe.sh"`, an explicit `execution.files`
upload list, expected summary fields, and flat `/workspace/output` artifact paths.
The entrypoint supports prepare, analyze, verify, and test. Runtime-specific tools
stay inside the image; the host validator uses the same Render SDK.

## Private publication and live validation

Merge the reviewed definitions before using the manual main-only publisher.
Publish each image separately, retain the resulting immutable digest, and confirm
package visibility. Publication never overwrites an existing release tag.

Set `RENDER_API_KEY`, `GHCR_USERNAME`, and a package-readable `GHCR_TOKEN` only in
the host environment. After publication, run:

```sh
npm run --prefix tools validate-recipe -- \
  --recipe repo-ready-typescript \
  --workspace tea-YOUR_WORKSPACE \
  --group sbg-YOUR_GROUP \
  --plan 1c-2g \
  --image ghcr.io/render-examples/sandbox-coding-workspace@sha256:YOUR_DIGEST
```

Use document-processing-lab with sandbox-document-extraction, or
sql-vector-playground with sandbox-postgres-lab, for the other pairs.

The validator uploads only declared regular files, verifies source and restored
workloads, checks the preserved baseline, requires outputs to be absent after
restore, regenerates them, and checks known summary answers plus output hashes.
Both sandboxes use deny-all egress and explicit timeouts. It terminates temporary
sandboxes and deletes the snapshot by default; the imported image remains in its
group. `--keep-snapshot` retains a successfully verified snapshot for 24 hours.

Record the exact image digest, build source commit, recipe file hashes, SDK,
compute plan, results, and cleanup before changing verification status. Keep
assets draft while private distribution prevents public registry use. Raw local
evidence remains ignored; publish a sanitized report as a separate reviewable file.

## Current evidence

All four images have passed local build and offline acceptance. The three new
pairs have not been published to GHCR or tested on Render yet. PostgreSQL also
passed a local filesystem-copy recovery in a fresh container; that does not
substitute for the Render snapshot test. The Python analysis pair's completed
live run is recorded in [its report](live-validation-2026-11-03.md).
