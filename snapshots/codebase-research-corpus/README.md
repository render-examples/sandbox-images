# Codebase research corpus

Index a synthetic TypeScript tool repository using compiler-emitted declarations and produce checked source citations.

Live Render capture/restore: Passed for recipe 0.1.0 using `coding-workspace:0.1.1`. The parent GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Reuses the pinned `coding-workspace` image; no new image or runtime downloads are required. Inputs are synthetic. The shared lifecycle runtime is copied into this recipe by `scripts/sync-uploaded-runtimes.py` because the previously published image predates that helper.

Run `bash recipe.sh prepare`, then capture a filesystem snapshot before running `analyze` and `verify`. Preparation accepts a precreated upload directory and refuses to replace existing prepared state. `input/` and `baseline.json` preserve the starting state; `work/` is recreated for each workload. The manifest lists every uploaded file and flat output artifact.

`analyze` executes the workload and `verify` independently checks actual outputs, input integrity and artifact hashes. `test` corrupts prepared inputs, baseline and output artifacts, rejects stale success receipts, and regenerates outputs. These deterministic fixtures validate behavior; they do not measure AI model quality or form an adversarial grading boundary.

Outputs: `summary.json`, `index.json`, `citations.json`, `verification.json`.

Expected summary: `{"files":3,"exports":3,"dependencyEdges":2,"citations":3}`.

Snapshots belong to the caller's sandbox group.
