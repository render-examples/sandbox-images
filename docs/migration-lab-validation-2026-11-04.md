# Migration lab live validation — 2026-11-04

`migration-lab` 0.1.0 passed live Render import, prepared filesystem capture, source workload, fresh restore and output verification against the existing private `postgres-lab` 0.1.0 image. No new image publication was required. The recipe remains draft pending public distribution.

## Inputs and environment

- Recipe and host runner source: `1290a6446862ef4108b56743fada8c5a352831e4`.
- Parent image: `ghcr.io/render-examples/sandbox-postgres-lab@sha256:2d3d1228961c9cb51e8c4bd00ec01a4d7c5a573102764cf9e562502efd95d6bf`.
- SDK: `@renderinc/sdk@1.6.0`; compute plan: `1c-2g`.
- Explicit filesystem snapshot; deny-all egress on source and restored sandboxes; runtime limit 900 seconds, idle timeout 300 seconds.
- Preparation seeds the database and stops PostgreSQL before capture, with declared workload outputs absent. Source and restored analysis restart PostgreSQL explicitly.
- Only five declared recipe files were uploaded. Render and GHCR credentials stayed outside the guests.
- Started `2026-11-04T10:08:12.715Z`; completed `2026-11-04T10:09:02.495Z`.

## Verified result

`{"customers":2,"rows":4,"totalCents":12750,"backfilledRows":4,"constraintRejections":3,"failedMigrationRolledBack":true,"downgradePreserved":true}`

Actual PostgreSQL queries checked four backfilled rows, three constraint rejections, rollback of both DDL and row edits in the intentionally failing migration, and a committed downgrade preserving rows and original constraints. Verification independently reran the rehearsal and compared its results with downloaded evidence.

Recipe input SHA-256 hashes (independently matched to the committed source):

- `recipe.sh`: `d159d577b980c505a68226774dbb95404d0774dec4c6e2bf695098eca123b22c`
- `seed.sql`: `315369eef09c96cc048f44f0777f2975fe30668101f7b4c53467fc6bd85f0043`
- `upgrade.sql`: `61514a6a4ff4c11e22a907a53a35b530fb9034ae891da93f514c2679b9c4e0b7`
- `failing-migration.sql`: `f185af8fb63588868a00b5feee438def741587810694961eb3248e66ed4acaf9`
- `downgrade.sql`: `e8f23de6e5b6933a952f9900f4272f1e08404dd3135e0c22545f6edfada55939`

Downloaded artifact SHA-256 hashes:

- `summary.json`: `0566b01a4e9503e5bbd35d8db47af3bbd4485a1ece94a46f922b65fc819bd4a5`
- `stages.csv`: `d4331eee16965373c8a6fd73ea4314ed5e9277cff031e235a1e937c1d62bff0c`
- `upgraded.csv`: `01e9b49a32edd5bce361c867f09ecdcdaaf9e8a54a1b26e873cb223bf8203c9b`
- `constraints.csv`: `892aa567a24b0ec46f386c499af242f800d5ea87c2e1d0c9fc77f5e07f3b4a52`
- `downgraded.csv`: `d07893dc9da33a3222b0ef5093f81b96e631a44db157ef4254efa3e63760021b`

## Cleanup and scope

At `2026-11-04T10:10:11.395Z`, independent reads confirmed source and restored sandboxes terminated, the test snapshot deleted (typed `SandboxSnapshotNotFoundError`), and the imported image digest matching the pinned parent. The imported image remains in the selected sandbox group. Workspace/group/resource identifiers remain in ignored local journals.

Local offline acceptance also passed seven corruption probes, receipt invalidation on failure, stopped-database checks and output regeneration. These checks demonstrate this synthetic migration workload, not production concurrency, large-table backfill performance or zero-downtime deployment behavior. Snapshots are created within the caller's group; this catalog entry distributes a recipe, not a portable snapshot ID.
