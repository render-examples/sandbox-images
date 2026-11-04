# Build portfolio

The implemented catalog contains **25 image definitions and 50 snapshot recipes**.
The [catalog table](../README.md) lists the complete inventory, and the
[expansion report](catalog-expansion-2026-11-04.md) explains the TypeScript-first,
AI-focused additions and validation boundaries. Nine images and twelve recipes
retain private publication/live Render evidence; the 16 new images and 38 new
recipes remain draft pending review, publication and live verification.

Notion's [Code DB](https://www.notion.so/6b902efaf0f945339bfb45c24d8b774e)
is the work tracker. Image and snapshot-recipe records are separate. Images
supply installed runtime dependencies; recipes supply prepared repositories,
fixtures, persisted state and independent acceptance workloads. Reuse an image
when its dependencies already fit; add a profile when the toolchain differs.

## Deferred candidates

These candidates remain in Notion, outside the implemented 25/50 target:

| Kind | Slug | Intended work |
| --- | --- | --- |
| Image | codex | Coding-agent tasks in prepared repositories |
| Image | claude-code | Coding-agent tasks in prepared repositories |
| Image | opencode | Coding-agent tasks in prepared repositories |
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
