# Validating native-runtime image and recipe pairs

The coding and PostgreSQL guests run native JavaScript/TypeScript and Bash/SQL
workloads. Document extraction uses Python with Poppler and Tesseract. Python on
the build host is only the shared Docker orchestration script.

## Local acceptance

Run `python3 scripts/check-image.py SLUG` for each image. The checker builds for
linux/amd64, verifies guest utilities, and runs smoke and recipe checks by image
ID with networking disabled and 2 GB memory. Native recipes receive only their
declared regular `execution.files`, matching live uploads. Each recipe checks deliberate
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

Other pairs:

| Recipe | Image package suffix |
| --- | --- |
| document-processing-lab | sandbox-document-extraction |
| sql-vector-playground | sandbox-postgres-lab |
| repo-ready-python | sandbox-python-coding |
| typescript-tool-workbench | sandbox-typescript-tools |
| fullstack-fastapi-postgres | sandbox-python-api-postgres |
| fullstack-node-postgres | sandbox-typescript-api-postgres |
| migration-lab | sandbox-postgres-lab |
| mcp-api-test-world | sandbox-integration-test |
| agent-regression-python | sandbox-python-coding |
| agent-regression-typescript | sandbox-coding-workspace |

The validator uploads only declared regular files and prepares the baseline with
all declared outputs absent. It captures and waits for the filesystem snapshot
before running source analysis, so retained coding snapshots contain the initial
task rather than its completed solution. It verifies source and restored workloads,
checks the preserved baseline, requires outputs to be absent after restore,
generates them, and checks known summary answers plus output hashes.
Both sandboxes use deny-all egress and explicit timeouts. It terminates temporary
sandboxes and deletes the snapshot by default; the imported image remains in its
group. `--keep-snapshot` retains a successfully verified snapshot for 24 hours.

Record the exact image digest, build source commit, recipe file hashes, SDK,
compute plan, results, and cleanup before changing verification status. Keep
assets draft while private distribution prevents public registry use. Raw local
evidence remains ignored; publish a sanitized report as a separate reviewable file.

## Current evidence

The six original image families passed local build and offline acceptance. Five new
0.1.0 candidates were privately published. Document extraction, Python coding,
Postgres with recipe 0.1.1, and the TypeScript-tools 0.1.0 fixture passed live checks.
Both TypeScript-based image families now have privately published 0.1.1 images
that passed live compiler, workload, capture and restore checks. See
[the 0.1.1 report](typescript-011-validation-2026-11-03.md).
See [the candidate report](private-candidates-2026-11-03.md) for exact versions,
digests, cleanup and failures. Python analysis's earlier live run remains in
[its report](live-validation-2026-11-03.md).

The new Python/API and TypeScript/API Postgres images also pass local builds and
offline checks, including stopped-state filesystem copy/restore simulations with
mode-0600 uploads at the actual recipe working directory. Both pairs are now privately published and passed
[live Render checks](api-postgres-validation-2026-11-04.md). The new migration-lab recipe
passed [live Render restore validation](migration-lab-validation-2026-11-04.md)
using the existing published Postgres image.

Python and TypeScript agent regression recipes passed [live restore validation](agent-regression-validation-2026-11-04.md) using existing private images. The integration-test image is privately published and its MCP/API recipe passed [live Render validation](integration-validation-2026-11-04.md).
