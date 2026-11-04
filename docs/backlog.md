# Build portfolio

The catalog covers 21 image definitions and 17 snapshot recipes. These are candidates, not published assets. The Python analysis pair passed private publication and live Render validation. Five additional 0.1.0 images are privately published. Document extraction, Python coding, Postgres with recipe 0.1.1, and the TypeScript-tools 0.1.0 fixture passed live checks. Both TypeScript-based 0.1.1 compiler corrections are now privately published and passed live checks. See the private-candidates and TypeScript 0.1.1 reports for exact evidence. The six original image/recipe pairs passed private live validation. Both API/Postgres image pairs are privately published and passed live Render validation. Migration lab reuses the published Postgres image and passed live restore validation on 2026-11-04. Both agent regression recipes passed live capture/restore using existing coding images. The integration-test image and MCP/API recipe pass local acceptance but await publication and live validation. Public distribution remains pending.

Images are independently versioned OCI packages. Snapshot entries distribute recipes that create group-local artifacts. Playwright and scraping are outside this portfolio.

## Images

| Slug | Wave | Use case | Implementation |
| --- | --- | --- | --- |
| `python-coding` | Wave 1 | Repair Python repositories with uv, pytest, Ruff and Git patch evidence | Private publication and live validation passed |
| `coding-workspace` | Wave 1 | Inspect repositories, implement fixes, run tests, produce patches and evidence | Private publication and live validation passed |
| `python-api-postgres` | Wave 1 | Run Python/FastAPI API tasks with local Postgres, tests and migration checks | Private publication and live validation passed |
| `typescript-api-postgres` | Wave 1 | Run TypeScript API tasks with local Postgres, tests and migration checks | Private publication and live validation passed |
| `python-analysis` | Wave 1 | Clean/join CSV/Parquet/XLSX, query data, generate charts and analysis artifacts | Private publication and live validation passed |
| `typescript-tools` | Wave 1 | Run user-defined workflow blocks, generated transforms, API adapters, small tools | Private publication and live validation passed |
| `postgres-lab` | Wave 1 | Test generated SQL, reproduce database bugs, rehearse migrations and retrieval queries | Private publication and live validation passed |
| `document-extraction` | Wave 1 | Extract evidence from attachments, invoices, scanned PDFs, and document batches | Private publication and live validation passed |
| `office-artifacts` | Wave 1 | Produce spreadsheets, reports, presentations, converted deliverables | Planned |
| `media-processing` | Wave 2 | Transcode, crop, thumbnail, extract frames/audio, prepare media for an agent | Planned |
| `retrieval-local` | Wave 2 | Build/search local corpora, compare chunking and retrieval, cite local sources | Planned |
| `integration-test` | Wave 2 | Test tool calls, webhook handlers, API integrations, retry/error behavior | Local validation passed; publication/live validation pending |
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
| `repo-ready-python` | Wave 1 | Pinned Python repo, uv environment, test fixtures | python-coding |
| `typescript-tool-workbench` | Wave 1 | Typed transforms, schema-validated inputs/outputs and local API fixtures | typescript-tools |
| `fullstack-node-postgres` | Wave 1 | TypeScript API, local Postgres, seeded data, API tests and migration fixtures | typescript-api-postgres |
| `fullstack-fastapi-postgres` | Wave 1 | FastAPI app, local DB schema/data, migrations, API tests | python-api-postgres |
| `sql-vector-playground` | Wave 1 | Seeded Postgres/pgvector or SQLite dataset, known queries and expected answers | postgres-lab |
| `analytics-workbench` | Wave 1 | Synthetic CSV/Parquet/XLSX inputs with joins, nulls, duplicates, known aggregates | python-analysis |
| `codebase-research-corpus` | Wave 1 | Pinned repositories, source/provenance manifest, optional local search index | coding-workspace; optionally retrieval-local |
| `migration-lab` | Wave 2 | Before-change schema/data plus upgrade/downgrade scripts and invariants | postgres-lab |
| `rag-corpus` | Wave 2 | Licensed/synthetic docs, chunks, embeddings/index, retrieval test questions | retrieval-local |
| `document-processing-lab` | Wave 2 | PDFs/scans/tables with expected fields and source-page references | document-extraction |
| `reporting-workspace` | Wave 2 | Synthetic business dataset, spreadsheet/report/deck templates, fonts | office-artifacts + python-analysis capabilities |
| `mcp-api-test-world` | Wave 2 | Local tools/mock APIs, fake webhook events, rate-limit and failure scenarios | integration-test |
| `agent-regression-python` | Wave 2 | Python broken tasks, task manifest, independent behavioral grader and source patch | python-coding |
| `agent-regression-typescript` | Wave 2 | TypeScript broken tasks, task manifest, independent behavioral grader and source patch | coding-workspace |
| `media-project` | Wave 2 | Licensed sample footage/audio/images, expected transform recipes | media-processing |
| `warm-interpreter-session` | Experimental | A clean initialized interpreter, imports, synthetic in-memory dataframe or local index | python-analysis |

Wave assignments describe proposed build order, not delivery commitments. Runtime snapshots require a separate continuity check; filesystem snapshots must verify restored files and explicitly start any required processes. Fixtures use synthetic or licensed data and must never contain user credentials.

## Priority: deepen Python and TypeScript

Python and TypeScript are the primary audiences. Build multiple useful workflows
in these ecosystems before adding Go and Rust for broader stack coverage.

| Order | Offering | Deliverable and acceptance workload |
| --- | --- | --- |
| In review | Python coding | `repo-ready-python`: prepared uv environment, pytest/Ruff, deterministic bug fix, test results and patch artifacts. Uses the dedicated `python-coding` image; private publication and live validation passed. |
| In review | TypeScript tool execution | `typescript-tools`: typed transforms and API adapters, schema validation and deterministic tests. Prepared fixture: `typescript-tool-workbench`; private publication and live validation passed against image 0.1.1. |
| In review | Python API development | `fullstack-fastapi-postgres`: FastAPI app, seeded Postgres, API tests, migrations and rollback. |
| In review | TypeScript app development | `fullstack-node-postgres`: Node/TypeScript app, seeded Postgres, API tests, migrations and rollback. No browser automation. |
| In review | Agent tool and integration testing | `integration-test` / `mcp-api-test-world`: Python and TypeScript clients against local tools/mock APIs, malformed inputs, timeouts, retries and webhook idempotency. |
| Later depth | Python analysis and deliverables | Build on analysis and document extraction with scientific workloads, retrieval and reporting as distinct use cases. |
| Secondary coverage | Go and Rust | `go-build-test` and `rust-build-test` remain expansion candidates, behind Python/TypeScript depth. |

Reuse an image where runtime dependencies are the same; make prepared repositories,
fixtures and seeded datasets separate snapshot recipes. Add an image when the
runtime/toolchain differs materially. The former `fullstack-test` image is split into `python-api-postgres` and
`typescript-api-postgres` so each language has its own dependencies and version.
`migration-lab` reuses the existing `postgres-lab` image.
These priorities are planned scope, not claims of implementation or publication.

Implementation references: [uv locked project environments](https://docs.astral.sh/uv/concepts/projects/sync/),
[FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/), and
[Vitest request mocking](https://vitest.dev/guide/mocking/requests).

The former `agent-regression-world` recipe is split into Python and TypeScript
recipes that reuse the published coding images. Their standalone graders assess
candidate changes; reference solutions only exercise the acceptance workflow.
These fixtures make no model-quality or tamper-proof-grading claim.
