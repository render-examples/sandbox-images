# Render sandbox images

Docker images and prepared workspaces for Render Sandboxes. Images include the tools;
snapshot recipes add a repository, dataset or database that you can capture and
restore in your own sandbox group.

There are 30 images and 60 recipes. All image packages are published to
[GHCR](https://github.com/orgs/render-examples/packages?repo_name=sandbox-images)
and are currently private. Pulling or importing them requires package access.
Recipes live in this repository and create snapshots in your group.

## Run an image

To build an image and run its bundled examples locally, install Python 3 and
Docker with a running Linux engine, then run this from the repository root:

```sh
python3 scripts/check-image.py typescript-tools
```

This builds for `linux/amd64` and runs the image and recipe checks with guest
networking disabled. On an ARM machine, Docker uses amd64 emulation. To open a
shell in the image you just built:

```sh
docker run --rm -it --platform linux/amd64 --network none \
  render-sandbox-typescript-tools:0.1.1 bash
```

## Run a recipe on Render

The following example prepares a TypeScript repository, captures its filesystem,
restores it in a second sandbox and checks the results. Use Node 24 or newer and
an existing Render workspace and sandbox group.

Set `RENDER_API_KEY`, `GHCR_USERNAME` and `GHCR_TOKEN` in your host environment.
The GHCR token needs `read:packages` and access to the image. The runner passes
registry credentials to Render's import API and keeps them out of the sandbox
and snapshot.

From the repository root, install the runner and read the published image digest:

```sh
npm ci --prefix tools
IMAGE_REF=$(node -e '
  const { image } = require("./images/coding-workspace/manifest.json");
  if (!image.digest) throw new Error("This image has no recorded digest");
  console.log(image.repository + "@" + image.digest);
')

npm run --prefix tools validate-recipe -- \
  --recipe repo-ready-typescript \
  --workspace tea-YOUR_WORKSPACE \
  --group sbg-YOUR_GROUP \
  --plan 1c-2g \
  --image "$IMAGE_REF"
```

Replace the workspace and group placeholders with your IDs. The runner removes
both temporary sandboxes and the snapshot after checking them; the imported
image stays in the group. Add `--keep-snapshot` to retain a passing snapshot for
24 hours. Outputs and resource IDs go into a new local `evidence/` directory.
If a run stops early, inspect its `run.json` before retrying.

Choose another recipe from the catalog and use its parent image's digest.
Each recipe README lists its inputs, outputs and commands. The
[analytics workbench](snapshots/analytics-workbench) uses its own runner.

## Catalog and live Render results

November 4, 2026: **30/30 image workloads passed; 60/60 snapshot capture-and-restore tests passed.**

Image tests run the bundled examples on Render. Recipe tests also capture and
restore a workspace, then check the outputs. Tests use synthetic inputs without
model API calls. The [test report](docs/catalog-live-validation-2026-11-04.md)
records versions, digests, results and cleanup.

### TypeScript and AI applications

| Image | Use for | Image workload on Render | Snapshot recipes (capture and restore) |
| --- | --- | --- | --- |
| [TypeScript tools](images/typescript-tools) | Run TypeScript scripts and tool functions | Passed | [Typed event reducer](snapshots/typed-event-reducer) (Passed)<br>[TypeScript tool workbench](snapshots/typescript-tool-workbench) (Passed) |
| [Coding workspace](images/coding-workspace) | Explore and edit TypeScript repositories | Passed | [TypeScript agent regression tasks](snapshots/agent-regression-typescript) (Passed)<br>[Codebase research corpus](snapshots/codebase-research-corpus) (Passed)<br>[Repository-ready TypeScript](snapshots/repo-ready-typescript) (Passed) |
| [TypeScript API and Postgres](images/typescript-api-postgres) | Exercise Node APIs and Postgres transactions | Passed | [Prepared TypeScript API and Postgres](snapshots/fullstack-node-postgres) (Passed)<br>[Postgres outbox](snapshots/postgres-outbox) (Passed) |
| [TypeScript agents](images/typescript-agents) | Test structured outputs and tool loops | Passed | [Agent structured output](snapshots/agent-structured-output) (Passed)<br>[Agent tool loop](snapshots/agent-tool-loop) (Passed) |
| [TypeScript agent workflows](images/typescript-agent-workflows) | Resume checkpoints and approval gates | Passed | [Agent checkpoint workflow](snapshots/agent-checkpoint-workflow) (Passed)<br>[Human approval workflow](snapshots/human-approval-workflow) (Passed) |
| [TypeScript AI gateway](images/typescript-ai-gateway) | Test provider routing, retries and request budgets | Passed | [AI retry budget lab](snapshots/ai-retry-budget-lab) (Passed)<br>[AI routing workbench](snapshots/ai-routing-workbench) (Passed) |
| [TypeScript AI interfaces](images/typescript-ai-ui) | Inspect chat streams and tool cards | Passed | [Chat stream workbench](snapshots/chat-stream-workbench) (Passed)<br>[Tool card workbench](snapshots/tool-card-workbench) (Passed) |
| [TypeScript OpenAPI tools](images/typescript-openapi) | Validate API contracts and tool clients | Passed | [OpenAPI tool client](snapshots/openapi-tool-client) (Passed)<br>[OpenAPI tool contracts](snapshots/openapi-tool-contracts) (Passed) |
| [TypeScript RAG pipelines](images/typescript-rag) | Chunk documents and assemble cited context | Passed | [RAG chunking workbench](snapshots/rag-chunking-workbench) (Passed)<br>[RAG context assembly](snapshots/rag-context-assembly) (Passed) |
| [TypeScript AI evaluations](images/typescript-evals) | Score tool traces and retrieval results | Passed | [Retrieval evaluation](snapshots/retrieval-evaluation) (Passed)<br>[Tool trace evaluation](snapshots/tool-trace-evaluation) (Passed) |
| [TypeScript data analysis](images/typescript-data) | Clean CSV data and query Parquet | Passed | [CSV reconciliation](snapshots/csv-reconciliation) (Passed)<br>[Parquet analytics](snapshots/parquet-analytics) (Passed) |
| [TypeScript SQLite](images/typescript-sqlite) | Run database migrations and job queues | Passed | [SQLite job queue](snapshots/sqlite-job-queue) (Passed)<br>[SQLite migration workbench](snapshots/sqlite-migration-workbench) (Passed) |
| [TypeScript local retrieval](images/retrieval-local) | Build keyword search with source citations | Passed | [Local retrieval corpus](snapshots/rag-corpus) (Passed)<br>[Search ranking workbench](snapshots/search-ranking-workbench) (Passed) |
| [TypeScript image processing](images/typescript-image) | Resize and composite images | Passed | [Image compositing](snapshots/image-compositing) (Passed)<br>[Image derivatives](snapshots/image-derivatives) (Passed) |
| [TypeScript Office artifacts](images/office-artifacts) | Create spreadsheets, documents and slides | Passed | [Presentation workspace](snapshots/presentation-workspace) (Passed)<br>[Reporting workspace](snapshots/reporting-workspace) (Passed) |
| [TypeScript media processing](images/media-processing) | Transcode video and process audio | Passed | [Audio processing](snapshots/audio-processing) (Passed)<br>[Media project](snapshots/media-project) (Passed) |

### Python and data science

| Image | Use for | Image workload on Render | Snapshot recipes (capture and restore) |
| --- | --- | --- | --- |
| [Python coding workspace](images/python-coding) | Fix and test Python code | Passed | [Python agent regression workspace](snapshots/agent-regression-python) (Passed)<br>[Repository-ready Python](snapshots/repo-ready-python) (Passed) |
| [Python API and Postgres](images/python-api-postgres) | Exercise FastAPI and Postgres transactions | Passed | [FastAPI and Postgres workspace](snapshots/fullstack-fastapi-postgres) (Passed) |
| [Python analysis](images/python-analysis) | Clean and join data; produce tables and charts | Passed | [Analytics workbench](snapshots/analytics-workbench) (Passed)<br>[Data quality audit](snapshots/data-quality-audit) (Passed) |
| [Scientific Python](images/scientific-python) | Run statistical tests and forecasts | Passed | [Demand forecast](snapshots/demand-forecast) (Passed)<br>[Statistical experiment](snapshots/statistical-experiment) (Passed) |
| [Python optimization](images/python-optimization) | Solve scheduling and allocation problems | Passed | [Constraint scheduling](snapshots/constraint-scheduling) (Passed)<br>[Resource allocation](snapshots/resource-allocation) (Passed) |
| [Geospatial](images/geospatial) | Transform GeoJSON and join spatial data | Passed | [GeoJSON transform](snapshots/geojson-transform) (Passed)<br>[Spatial join](snapshots/spatial-join) (Passed) |

### Coding agents

These images include the named CLI and prepared TypeScript and Python repositories.
Checks cover CLI startup, reference repairs and independent graders.
**Model-backed coding runs: Not tested.** After restore, authenticate with the CLI and enable
access to its provider. From `/workspace/<recipe-slug>`, run `node run-agent.mjs`,
then `bash grade-project.sh`. The [CLI profiles](docs/coding-agent-validation-2026-11-04.md)
list versions and authentication options.

| Image | Image workload on Render | Snapshot recipes (capture and restore) |
| --- | --- | --- |
| [Codex](images/codex) | Passed | [TypeScript repository](snapshots/codex-typescript-repo) (Passed)<br>[Python repository](snapshots/codex-python-repo) (Passed) |
| [Claude Code](images/claude-code) | Passed | [TypeScript repository](snapshots/claude-code-typescript-repo) (Passed)<br>[Python repository](snapshots/claude-code-python-repo) (Passed) |
| [OpenCode](images/opencode) | Passed | [TypeScript repository](snapshots/opencode-typescript-repo) (Passed)<br>[Python repository](snapshots/opencode-python-repo) (Passed) |
| [Cursor CLI](images/cursor-cli) | Passed | [TypeScript repository](snapshots/cursor-cli-typescript-repo) (Passed)<br>[Python repository](snapshots/cursor-cli-python-repo) (Passed) |
| [Devin CLI](images/devin-cli) | Passed | [TypeScript repository](snapshots/devin-cli-typescript-repo) (Passed)<br>[Python repository](snapshots/devin-cli-python-repo) (Passed) |

### Documents, databases and integration tests

| Image | Use for | Image workload on Render | Snapshot recipes (capture and restore) |
| --- | --- | --- | --- |
| [Document extraction](images/document-extraction) | Extract document data and reconcile invoices | Passed | [Document processing lab](snapshots/document-processing-lab) (Passed)<br>[Invoice reconciliation](snapshots/invoice-reconciliation) (Passed) |
| [Postgres lab](images/postgres-lab) | Test SQL, migrations and vector queries | Passed | [Database migration lab](snapshots/migration-lab) (Passed)<br>[SQL and vector playground](snapshots/sql-vector-playground) (Passed) |
| [Python and TypeScript integration tests](images/integration-test) | Test MCP, HTTP APIs and webhook signatures | Passed | [MCP and API test world](snapshots/mcp-api-test-world) (Passed)<br>[Webhook signature replay](snapshots/webhook-signature-replay) (Passed) |

Build, publication and registry update instructions are in [Contributing](docs/contributing.md).

Repository code is MIT licensed. Bundled CLIs, runtimes and libraries retain their
own terms and licenses.
