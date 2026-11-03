# Python analysis: publication and live validation

The Python analysis 0.1.0 image and analytics workbench 0.1.0 recipe passed
live Render validation on 2026-11-03. The GHCR package remains private and
public registry release remains pending. Asset status stays draft; the
verification result is passed.

## Publication and provenance

- Publication run: https://github.com/render-examples/sandbox-images/actions/runs/41659629731
- Image and recipe source: `f3dfb24786d7c458c6a802fc7fcea6d456ec97f2`
- Image: `ghcr.io/render-examples/sandbox-python-analysis@sha256:49dd429acfc1047085cff3a50e96c62bc3ba95dce9472ec74e6c98577e707b40`
- Platform: `linux/amd64`
- SDK: `@renderinc/sdk@1.6.0`
- Compute plan: `1c-2g`
- Recipe SHA-256: `c0d38ff1dcb388c6c531be230d1a6a5280a256513611cc06e1a491ab1dfb63ac`

The publication receipt confirms that the published image configuration matches
the tested image. The recipe hash matches the recipe at the source commit above.
The host runner included the private-registry support changes in this PR;
those changes are not part of the image build source. The working branch is
`rt/private-image-validation`.

## Live results

The run started at 2026-11-03T15:19:31.241Z and finished at 2026-11-03T15:20:57.215Z.
This is a single functional test, not a performance benchmark.

1. Authenticated private GHCR import succeeded. Render reports the expected image digest.
2. The imported image's bundled smoke test produced two rows and 4,500 cents.
3. The recipe prepared CSV, Parquet, and XLSX fixtures and passed its initial analysis.
4. Generated outputs were removed before filesystem snapshot capture.
5. The source sandbox was terminated before the snapshot was restored into a new sandbox.
6. The restored baseline hash matched, and analysis outputs were absent before rerunning the job.
7. Restored analysis produced six clean orders, 21,200 cents revenue, a Parquet table,
   and a verified 600 by 400 PNG chart. Regional revenue was 14,100 east and 7,100 west.
8. Downloaded output hashes matched the guest verification record.
9. Both temporary sandboxes were independently confirmed terminated. The deleted
   snapshot returned a typed not-found response. The imported image remains available
   in the selected group.

Both sandboxes were created with deny-all egress, a 900-second runtime limit,
and a 300-second idle timeout. Credentials were used only by the host and
image-import API, never injected into guest environments. The test used
synthetic data. Workspace IDs, resource IDs, and credentials are omitted here.

The first attempt failed with `sandbox builds are not enabled`. After the
user enabled the workspace's `sandbox_builds_enabled` flag, the retry above passed.

## Release follow-up

Commit and review the private-import support and this evidence. Before public
registry release, decide package/repository visibility and publish a stable link
to this evidence. Keep draft status until consumers can access the assets.
No test snapshot is retained; the recipe recreates one in the caller's group.
