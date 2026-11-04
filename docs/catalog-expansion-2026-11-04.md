# TypeScript-first sandbox expansion

The implemented catalog reaches **25 images and 50 filesystem snapshot recipes**.
This adds 16 dependency profiles and 38 prepared workloads to the existing nine
images and twelve recipes. Thirteen new images use TypeScript/Node; three extend
Python. Six recipes reuse already published images instead of adding duplicate
runtime profiles.

## Scope and research decisions

The additions focus on AI application development, tools, retrieval and agent
outputs, with general data/scientific work alongside them. Selection reflects
the requested audience and distinct runtime needs, not measured adoption data.
Exact package pins and lockfiles were resolved against current upstream releases
on 2026-11-04 and checked in the target Linux/amd64 images.

| Image | Distinct installed stack | Prepared use cases |
| --- | --- | --- |
| typescript-agents | AI SDK, Zod | Tool loops; structured output |
| typescript-ai-gateway | OpenAI SDK, Zod | Routing/fallback; bounded retries/cancellation |
| typescript-ai-ui | React, Vite, jsdom | Streaming chat; approval/tool cards |
| typescript-agent-workflows | LangGraph, SQLite checkpoints | Resumable workflow; human approval |
| typescript-rag | LangChain core/text splitters | Chunking; context/citation assembly |
| typescript-evals | AutoEvals, Zod | Tool traces; retrieval metrics |
| retrieval-local | MiniSearch | Persisted lexical corpus; search ranking |
| typescript-data | DuckDB Neo | CSV reconciliation; Parquet analytics |
| typescript-sqlite | better-sqlite3, Drizzle | Migrations; leased/idempotent jobs |
| typescript-openapi | openapi-typescript, Swagger Parser, Ajv | Tool contracts; generated clients |
| typescript-image | Sharp/libvips | Derivatives; compositing |
| office-artifacts | ExcelJS, docx, PptxGenJS | Reports; presentations |
| media-processing | FFmpeg/ffprobe, Sharp | Video transforms; audio processing |
| scientific-python | NumPy, SciPy, scikit-learn | Statistical experiments; forecasting |
| geospatial | Shapely, pyproj | Coordinate transforms; spatial joins |
| python-optimization | OR-Tools | Constraint scheduling; resource allocation |

The six reuse recipes cover typed agent events, source citations, signed webhook
replay, transactional outboxes, data quality, and invoice reconciliation.

Primary references informing the implementation include [AI SDK testing](https://ai-sdk.dev/docs/ai-sdk-core/testing),
[OpenAI SDK retries](https://github.com/openai/openai-node#retries),
[LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence),
[LangChain retrieval](https://docs.langchain.com/oss/javascript/langchain/retrieval),
[DuckDB Neo](https://duckdb.org/docs/lts/clients/node_neo/overview),
[OpenAPI TypeScript](https://openapi-ts.dev/introduction),
[Sharp](https://sharp.pixelplumbing.com/api-output/),
[MiniSearch](https://lucaong.github.io/minisearch/), and
[OR-Tools CP-SAT](https://developers.google.com/optimization/cp/cp_solver).

TypeScript 7 does not expose the older JavaScript compiler API. The codebase
research recipe uses the compiler CLI's declaration output and explicitly
indexes a narrow synthetic source grammar. It is not a general-purpose AST
indexer. The OpenAPI image pins TypeScript 5.9.3 to satisfy its generator's peer
range. See the [TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
and [declaration output documentation](https://www.typescriptlang.org/tsconfig/emitDeclarationOnly.html).

## Local validation

All 16 new image builds passed the offline Linux/amd64 checker: required guest
tools, default-PATH smoke, workspace dependency imports, and each recipe's
prepare/analyze/verify/test lifecycle under 2 GB memory and a 120-second command
budget. The six reused-parent recipes also passed their lifecycle checks.

All **38 new recipes** passed the shared fresh-container restore helper. It
uploads only declared regular files at mode 0600 into an existing recipe root,
prepares inputs without outputs, archives the workspace, and restores it into
a second clean container. Tar preserves PostgreSQL ownership and workspace
package symlinks. Verification must fail before execution; analysis then
regenerates results and passes independent checks without changing the baseline.

Additional negative controls cover invalid events, conflicting replays, database
amount/relation corruption, wrong decoded pixels and spreadsheet cells, silent
rather than tonal audio, invented citations, wrong retrieval sources, and
incorrect evaluation metrics. Semantic probes on the artifact images recompute
receipt hashes after mutation, demonstrating checks beyond file hashes.
Successful and failing smoke commands preserve preexisting recipe outputs.

Run these checks from the source checkout:

```sh
python3 scripts/test-export.py
python3 scripts/test-release.py
python3 scripts/test-check-image.py
python3 scripts/sync-uploaded-runtimes.py --check
python3 scripts/export-catalog.py --output artifacts/catalog.json
python3 scripts/check-image.py typescript-agents
```

Repeat the last command for the image under review. The checker discovers every
recipe for that parent and runs the new restore helper automatically. Local
checked image/configuration receipts are written to ignored `artifacts/` files;
CI rebuilds the reviewed source rather than relying on a developer's image tag.

## Release boundaries

These 54 additions remain **draft and Render-unverified**. The 16 new images have
not been pushed to GHCR. Local filesystem copies do not establish live Render
snapshot behavior. The existing nine image/twelve recipe records retain their
private publication and live validation evidence.

AI fixtures use scripted model responses/embeddings, synthetic traces, or
loopback provider servers. They exercise real installed libraries and application
behavior without provider credentials or model downloads. They do not measure
model quality, hosted provider availability, or billing. UI tests cover jsdom
and server rendering, not browser behavior. No Playwright or scraping is included.

After review and merge, publish each new image from main using the existing
no-overwrite workflow, record its immutable digest and source commit, then run
Render import/capture/restore validation in the selected workspace. Only evidence
from those runs can promote release metadata. Snapshot recipes create caller-
group state; the catalog does not distribute global snapshot IDs. Package public
visibility remains a separate administrative action.
