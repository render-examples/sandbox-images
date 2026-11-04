# Build portfolio

The implemented catalog contains **30 image definitions and 60 snapshot recipes**.
The [catalog table](../README.md) lists the complete inventory, and the
[expansion report](catalog-expansion-2026-11-04.md) explains the TypeScript-first,
AI-focused additions and validation boundaries. Nine images and twelve recipes
retain private publication/live Render evidence; the 21 new images and 48 new
recipes remain draft pending review, publication and live verification.

Notion's [Code DB](https://www.notion.so/6b902efaf0f945339bfb45c24d8b774e)
is the work tracker. Image and snapshot-recipe records are separate. Images
supply installed runtime dependencies; recipes supply prepared repositories,
fixtures, persisted state and independent acceptance workloads. Reuse an image
when its dependencies already fit; add a profile when the toolchain differs.

The dedicated coding-agent profiles are now implemented as well; see the
[coding-agent report](coding-agent-validation-2026-11-04.md) for pinned versions,
prepared repositories and the distinction between reference checks and real agent runs.

## Deferred candidates

These candidates remain in Notion, outside the implemented 30/60 target:

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
snapshots. Playwright and scraping remain outside the portfolio.
