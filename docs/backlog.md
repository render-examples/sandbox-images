# Build portfolio

The catalog covers 19 image definitions and 15 snapshot recipes. These are candidates, not published assets. Begin with `python-analysis` and `analytics-workbench`; expand only after the common build, import, execution, capture, restore and registry path is validated.

Images are independently versioned OCI packages. Snapshot entries distribute recipes that create group-local artifacts. Playwright and scraping are outside this portfolio.

## Images

| Slug | Wave | Use case | Implementation |
| --- | --- | --- | --- |
| `coding-workspace` | Wave 1 | Inspect repositories, implement fixes, run tests, produce patches and evidence | Planned |
| `fullstack-test` | Wave 1 | Run app + local database + cache, validate migrations and end-to-end changes | Planned |
| `python-analysis` | Wave 1 | Clean/join CSV/Parquet/XLSX, query data, generate charts and analysis artifacts | Initial implementation |
| `typescript-tools` | Wave 1 | Run user-defined workflow blocks, generated transforms, API adapters, small tools | Planned |
| `postgres-lab` | Wave 1 | Test generated SQL, reproduce database bugs, rehearse migrations and retrieval queries | Planned |
| `document-extraction` | Wave 1 | Extract evidence from attachments, invoices, scanned PDFs, and document batches | Planned |
| `office-artifacts` | Wave 1 | Produce spreadsheets, reports, presentations, converted deliverables | Planned |
| `media-processing` | Wave 2 | Transcode, crop, thumbnail, extract frames/audio, prepare media for an agent | Planned |
| `retrieval-local` | Wave 2 | Build/search local corpora, compare chunking and retrieval, cite local sources | Planned |
| `integration-test` | Wave 2 | Test tool calls, webhook handlers, API integrations, retry/error behavior | Planned |
| `scientific-python` | Wave 2 | Reproduce numerical work, run statistical tests, fit classical models, generate figures | Planned |
| `codex` | Wave 1 | Run codex coding-agent tasks in an isolated, prepared repository workspace. | Planned |
| `claude-code` | Wave 1 | Run claude-code coding-agent tasks in an isolated, prepared repository workspace. | Planned |
| `opencode` | Wave 1 | Run opencode coding-agent tasks in an isolated, prepared repository workspace. | Planned |
| `go-build-test` | Expansion | Build and test services and CLIs reproducibly. | Planned |
| `rust-build-test` | Expansion | Build native tooling, WASM and systems projects. | Planned |
| `jvm-build-test` | Expansion | Build and test JVM service projects. | Planned |
| `geospatial` | Expansion | Transform spatial data and generate maps. | Planned |
| `desktop-computer-use` | Expansion | Let agents interact with local desktop applications. | Planned |

## Snapshot recipes

| Slug | Wave | Prepared state | Suggested image |
| --- | --- | --- | --- |
| `repo-ready-typescript` | Wave 1 | Pinned example repo, lockfile-installed deps, baseline tests/build assets | coding-workspace |
| `repo-ready-python` | Wave 1 | Pinned Python repo, uv environment, test fixtures | coding-workspace |
| `fullstack-node-postgres` | Wave 1 | Node/React or Next.js app, local Postgres, synthetic users/orders, installed E2E tools | fullstack-test |
| `fullstack-fastapi-postgres` | Wave 1 | FastAPI app, local DB schema/data, migrations, API tests | fullstack-test |
| `sql-vector-playground` | Wave 1 | Seeded Postgres/pgvector or SQLite dataset, known queries and expected answers | postgres-lab |
| `analytics-workbench` | Wave 1 | Synthetic CSV/Parquet/XLSX inputs with joins, nulls, duplicates, known aggregates | python-analysis |
| `codebase-research-corpus` | Wave 1 | Pinned repositories, source/provenance manifest, optional local search index | coding-workspace; optionally retrieval-local |
| `migration-lab` | Wave 2 | Before-change schema/data plus upgrade/downgrade scripts and invariants | postgres-lab or fullstack-test |
| `rag-corpus` | Wave 2 | Licensed/synthetic docs, chunks, embeddings/index, retrieval test questions | retrieval-local |
| `document-processing-lab` | Wave 2 | PDFs/scans/tables with expected fields and source-page references | document-extraction |
| `reporting-workspace` | Wave 2 | Synthetic business dataset, spreadsheet/report/deck templates, fonts | office-artifacts + python-analysis capabilities |
| `mcp-api-test-world` | Wave 2 | Local tools/mock APIs, fake webhook events, rate-limit and failure scenarios | integration-test |
| `agent-regression-world` | Wave 2 | Versioned mini-app/repo, deterministic broken tasks, synthetic files/DB, grader | coding-workspace; fullstack-test where needed |
| `media-project` | Wave 2 | Licensed sample footage/audio/images, expected transform recipes | media-processing |
| `warm-interpreter-session` | Experimental | A clean initialized interpreter, imports, synthetic in-memory dataframe or local index | python-analysis |

Wave assignments describe proposed build order, not delivery commitments. Runtime snapshots require a separate continuity check; filesystem snapshots must verify restored files and explicitly start any required processes. Fixtures use synthetic or licensed data and must never contain user credentials.
