# Build portfolio

The prior catalog contains **30 image definitions and 60 snapshot recipes**. The
[November 4 validation report](catalog-live-validation-2026-11-04.md) records all
30 hosted image workloads and all 60 snapshot capture/restore checks passing.
Those checks made zero model API calls. Private packages remain draft for public
distribution; the earlier 21-image/48-recipe pending statement is superseded.

The approved toolchain expansion adds **17 images and 34 recipes**, and upgrades
OpenCode, AI SDK and the gateway with six existing recipes. The complete planned source
catalog would have **47 images and 94 recipes**. This batch contains 46 images
and 92 recipes; Docling and its two recipes remain held locally pending the
dependency-download review. New candidates remain unverified until
publication and hosted evidence are recorded; source presence is not a release.
See [the toolchain build status](toolchain-assets-2026-11-16.md).

Notion's [Code DB](https://www.notion.so/6b902efaf0f945339bfb45c24d8b774e)
is the work tracker. Image and snapshot-recipe records are separate. Images
supply installed runtime dependencies; recipes supply prepared repositories,
fixtures, persisted state and independent acceptance workloads. Reuse an image
when its dependencies already fit; add a profile when the toolchain differs.

The dedicated coding-agent profiles are now implemented as well; see the
[coding-agent report](coding-agent-validation-2026-11-04.md) for pinned versions,
prepared repositories and the distinction between reference checks and real agent runs.

## Deferred candidates

These candidates remain in Notion, outside the approved toolchain expansion:

| Kind | Slug | Intended work |
| --- | --- | --- |
| Image | go-build-test | Go services and CLI build/test workloads |
| Image | rust-build-test | Native, WASM and systems build/test workloads |
| Image | jvm-build-test | JVM service build/test workloads |
| Image | desktop-computer-use | Local desktop application interaction |
| Snapshot recipe | warm-interpreter-session | Runtime continuity for an initialized interpreter |

TypeScript remains first and Python second. Broader language coverage follows
that depth. Runtime snapshots require demonstrated process continuity; filesystem
recipes restart required processes and verify persisted files/data. Fixtures must
use synthetic or licensed inputs, with credentials kept outside images and
snapshots. Playwright, Browser Use and Stagehand are now approved for local browser execution in this expansion.
