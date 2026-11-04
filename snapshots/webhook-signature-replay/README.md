# Webhook signature replay

Verify signed tool-result webhooks, timestamp windows, duplicate delivery and conflicting replays.

Reuses the pinned `integration-test` image; no new image or runtime downloads are required. Inputs are synthetic. The shared lifecycle runtime is copied into this recipe by `scripts/sync-uploaded-runtimes.py` because the previously published image predates that helper.

Run `bash recipe.sh prepare`, then capture a filesystem snapshot before running `analyze` and `verify`. Preparation accepts a precreated upload directory and refuses to replace existing prepared state. `input/` and `baseline.json` preserve the starting state; `work/` is recreated for each workload. The manifest lists every uploaded file and flat output artifact.

`analyze` executes the workload and `verify` independently checks actual outputs, input integrity and artifact hashes. `test` corrupts prepared inputs, baseline and output artifacts, rejects stale success receipts, and regenerates outputs. These deterministic fixtures validate behavior; they do not measure AI model quality or form an adversarial grading boundary.

Outputs: `summary.json`, `decisions.json`, `ledger.json`, `verification.json`.

Expected summary: `{"requests":6,"accepted":2,"duplicates":1,"rejected":3,"effects":1,"totalCents":1250}`.

Draft 0.1.0: local Docker checks and prepared-filesystem copy checks are separate from live Render validation. No live verification is claimed until recorded. Snapshots belong to the caller's sandbox group.
