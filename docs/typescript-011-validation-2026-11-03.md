# TypeScript image 0.1.1 publication and live validation

The corrected coding-workspace and typescript-tools 0.1.1 images are privately published and passed live Render import, image smoke, prepared filesystem capture, source workload, fresh restore and output verification. All release statuses remain draft pending public distribution.

## Provenance

Images, recipe inputs and the host runner used commit `8d7196d95d4889863d4e0b59c7c6be2b7f6927b6`. Both target `linux/amd64`. The downloaded OCI manifest hashes match the published digests, and each published configuration digest matches its tested-build receipt. Package visibility was independently confirmed private.

The live checks used `@renderinc/sdk@1.6.0`, plan `1c-2g`, deny-all egress on source and restored sandboxes, a 900-second runtime limit and a 300-second idle timeout. Snapshot kind was explicitly `filesystem`, captured before workload outputs existed. Credentials stayed on the host and image-import API; no credentials were injected into guests.

## Results

### coding-workspace

- Image: `ghcr.io/render-examples/sandbox-coding-workspace:0.1.1`
- Digest: `sha256:978f6b05e6b10fd332ed351989bf72269ce4014b3af67812675a86a78f330914`
- Configuration: `sha256:e4d5e2784d09b586aad0b70ec7c89549731065122099abab56c9f227541a9fc0`
- Publication: [Run 41678761379](https://github.com/render-examples/sandbox-images/actions/runs/41678761379)
- Recipe: `repo-ready-typescript` version `0.1.0`
- Started `2026-11-03T16:56:02.186Z`; completed `2026-11-03T16:59:28.846Z`.
- Image smoke: `{"status":"passed","baselineTests":3,"totalCents":3250,"node":"v24.22.2","typescript":"Version 7.0.2"}`
- Restored result: `{"baselineTests":3,"testsPassed":5,"totalCents":3250,"discountedCents":2600,"changedFiles":2}`

Recipe SHA-256 hashes:

- `recipe.sh`: `21ae9305e1e65476af845b527eb505728ef928e5c8610604d8b6962cd570d5e9`
- `recipe.mjs`: `89658066bfd582793e2fc4c23ffc84c236ae92f66479f86c68cfd4a9327611c7`

Downloaded artifact SHA-256 hashes:

- `summary.json`: `29f604429c79a88850f82b39054d40978a041bcd3b020308037cf51975aa9ed7`
- `tests.tap`: `30a33481e6c16184c90318ce9ad494c0de313ec76443345eca6bc0ec98d4b6db`
- `change.patch`: `542ffa8cf7311da4c05aff9951b87685203aacf1485aed6e8f4f9d800f1c6b43`

Cleanup independently confirmed at `2026-11-03T17:00:04.994Z`: source and restored sandboxes terminated, snapshot deleted (typed not-found response), and imported image digest matched. The imported image remains available in its sandbox group.

### typescript-tools

- Image: `ghcr.io/render-examples/sandbox-typescript-tools:0.1.1`
- Digest: `sha256:579929809c1528c939ad10ce0c1deaf322e394ac438b0e09f90599b9df435158`
- Configuration: `sha256:74e276f0a588d4d79bbe2792bee18b1032c80a2f4243d886894252844da6a700`
- Publication: [Run 41678767551](https://github.com/render-examples/sandbox-images/actions/runs/41678767551)
- Recipe: `typescript-tool-workbench` version `0.1.0`
- Started `2026-11-03T16:56:02.187Z`; completed `2026-11-03T17:00:05.912Z`.
- Image smoke: `{"status":"passed","inputRows":3,"orders":2,"totalCents":3250,"attempts":3,"deliveries":1}`
- Restored result: `{"inputRows":3,"orders":2,"totalCents":3250,"attempts":3,"deliveries":1,"testsPassed":8}`

Recipe SHA-256 hashes:

- `recipe.sh`: `4609dd2788681bd9fc6ea8913f8e37bf9aa389d8418d2324c08b5f4e33d74833`
- `recipe.mjs`: `3cced7b28077b2e0cddbb3a82f7c60a48eb18acf3a334bc42de27bc9a382dc26`

Downloaded artifact SHA-256 hashes:

- `summary.json`: `0deff7d99e279c21d8c2de3ac60550b0d4a0c553ce33434162743e14e6bb846e`
- `transformed.json`: `2ba80b60d881553a6043b57d0c48b373bc5c423e0106ddcb9fb08d4902e348e8`
- `receipt.json`: `948eda8b3cd62b1219eb9ba19f6e96654fe70b555f0feba8dfd8990eeac7df22`
- `requests.json`: `25dc9558ad748db82dad7e4053a20b8ba5860f05aaeef52109e1a73de5c1cd19`
- `tests.tap`: `0a4574e8192e48948470268fbf2b61ce6ef05be96e7f2eb7f8e242cca270aaf3`

Cleanup independently confirmed at `2026-11-03T17:00:21.357Z`: source and restored sandboxes terminated, snapshot deleted (typed not-found response), and imported image digest matched. The imported image remains available in its sandbox group.

## Scope

The compiler is now accessible through `/usr/local/bin/tsc` under Render's command PATH. Coding-workspace verifies the compiler directly; TypeScript-tools also checks the global compiler before its typed transform/API-adapter fixture. Both recipes verified preserved baseline hashes, absence of precomputed outputs after restore, expected results, and downloaded artifact hashes.

These are deterministic functional checks using synthetic inputs, not an AI-agent quality assessment or a performance benchmark. Workspace, group and resource identifiers remain in ignored local journals. The registry distributes recipes that create snapshots within a caller's group, not portable snapshot IDs.

This report supersedes the pending 0.1.1 status in [the earlier candidate report](private-candidates-2026-11-03.md). Other image versions and their recorded results are unchanged.
