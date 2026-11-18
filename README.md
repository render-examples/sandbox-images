# Render sandbox images

Docker images and prepared workspaces for Render Sandboxes. Images include the tools;
snapshot recipes add a repository, dataset or database that you can capture and
restore in your own sandbox group.

The catalog contains 46 images and 92 snapshot recipes. **45 images are public on
[GHCR](https://github.com/orgs/render-examples/packages?repo_name=sandbox-images),
and all 90 of their snapshot recipes passed live Render checks on November 18, 2026.**
Devin CLI 0.1.1 remains unpublished because its upstream download returns HTTP 403;
its two recipes have not been tested at that version.

The [validation report](docs/catalog-live-validation-2026-11-18.md) lists each version,
result and release record. Public images need no GHCR credentials. Snapshot recipes
create prepared workspaces in your own sandbox group.

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
  render-sandbox-typescript-tools:0.1.2 bash
```

## Run a recipe on Render

The following example prepares a TypeScript repository, captures its filesystem,
restores it in a second sandbox and checks the results. Use Node 24 or newer and
an existing Render workspace and sandbox group.

Set `RENDER_API_KEY` in your host environment. Public GHCR images need no registry
credentials. If you use a private image, also set `GHCR_USERNAME` and `GHCR_TOKEN`
with `read:packages` access. Credentials stay on the host and out of snapshots.

The manifests pin published images by digest. From the repository root:

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

## Catalog and live results

**Passed** means the published digest ran its bundled workload on Render and its
listed recipes passed filesystem snapshot capture, restore and output checks.
Tests use synthetic inputs without model API calls. Coding-agent checks cover CLI
startup and reference repairs with independent graders; model-backed coding is
not tested. Authenticate with the chosen provider after restoring your own workspace.

### TypeScript tools and AI applications

| Image | Version | Image workload on Render | Snapshot capture and restore |
| --- | --- | --- | --- |
| [Coding workspace](images/coding-workspace) | 0.1.2 | Passed | [Codebase research corpus](snapshots/codebase-research-corpus) (Passed)<br>[Repository-ready TypeScript](snapshots/repo-ready-typescript) (Passed)<br>[TypeScript agent regression tasks](snapshots/agent-regression-typescript) (Passed) |
| [TypeScript local retrieval](images/retrieval-local) | 0.1.1 | Passed | [Local retrieval corpus](snapshots/rag-corpus) (Passed)<br>[Search ranking workbench](snapshots/search-ranking-workbench) (Passed) |
| [TypeScript agent workflows](images/typescript-agent-workflows) | 0.1.1 | Passed | [Agent checkpoint workflow](snapshots/agent-checkpoint-workflow) (Passed)<br>[Human approval workflow](snapshots/human-approval-workflow) (Passed) |
| [TypeScript agents](images/typescript-agents) | 0.2.0 | Passed | [Agent structured output](snapshots/agent-structured-output) (Passed)<br>[Agent tool loop](snapshots/agent-tool-loop) (Passed) |
| [TypeScript AI gateway](images/typescript-ai-gateway) | 0.2.0 | Passed | [AI retry budget lab](snapshots/ai-retry-budget-lab) (Passed)<br>[AI routing workbench](snapshots/ai-routing-workbench) (Passed) |
| [TypeScript AI interfaces](images/typescript-ai-ui) | 0.1.1 | Passed | [Chat stream workbench](snapshots/chat-stream-workbench) (Passed)<br>[Tool card workbench](snapshots/tool-card-workbench) (Passed) |
| [TypeScript API and Postgres](images/typescript-api-postgres) | 0.1.1 | Passed | [Postgres outbox](snapshots/postgres-outbox) (Passed)<br>[Prepared TypeScript API and Postgres](snapshots/fullstack-node-postgres) (Passed) |
| [TypeScript data analysis](images/typescript-data) | 0.1.1 | Passed | [CSV reconciliation](snapshots/csv-reconciliation) (Passed)<br>[Parquet analytics](snapshots/parquet-analytics) (Passed) |
| [TypeScript AI evaluations](images/typescript-evals) | 0.1.1 | Passed | [Retrieval evaluation](snapshots/retrieval-evaluation) (Passed)<br>[Tool trace evaluation](snapshots/tool-trace-evaluation) (Passed) |
| [TypeScript image processing](images/typescript-image) | 0.1.1 | Passed | [Image compositing](snapshots/image-compositing) (Passed)<br>[Image derivatives](snapshots/image-derivatives) (Passed) |
| [TypeScript OpenAPI tools](images/typescript-openapi) | 0.1.1 | Passed | [OpenAPI tool client](snapshots/openapi-tool-client) (Passed)<br>[OpenAPI tool contracts](snapshots/openapi-tool-contracts) (Passed) |
| [TypeScript RAG pipelines](images/typescript-rag) | 0.1.1 | Passed | [RAG chunking workbench](snapshots/rag-chunking-workbench) (Passed)<br>[RAG context assembly](snapshots/rag-context-assembly) (Passed) |
| [TypeScript SQLite](images/typescript-sqlite) | 0.1.1 | Passed | [SQLite job queue](snapshots/sqlite-job-queue) (Passed)<br>[SQLite migration workbench](snapshots/sqlite-migration-workbench) (Passed) |
| [TypeScript tools](images/typescript-tools) | 0.1.2 | Passed | [TypeScript tool workbench](snapshots/typescript-tool-workbench) (Passed)<br>[Typed event reducer](snapshots/typed-event-reducer) (Passed) |

### Python and data science

| Image | Version | Image workload on Render | Snapshot capture and restore |
| --- | --- | --- | --- |
| [Geospatial](images/geospatial) | 0.1.1 | Passed | [GeoJSON transform](snapshots/geojson-transform) (Passed)<br>[Spatial join](snapshots/spatial-join) (Passed) |
| [Python analysis](images/python-analysis) | 0.1.1 | Passed | [Analytics workbench](snapshots/analytics-workbench) (Passed)<br>[Data quality audit](snapshots/data-quality-audit) (Passed) |
| [Python API and Postgres](images/python-api-postgres) | 0.1.1 | Passed | [FastAPI and Postgres workspace](snapshots/fullstack-fastapi-postgres) (Passed) |
| [Python coding workspace](images/python-coding) | 0.1.1 | Passed | [Python agent regression workspace](snapshots/agent-regression-python) (Passed)<br>[Repository-ready Python](snapshots/repo-ready-python) (Passed) |
| [Python optimization](images/python-optimization) | 0.1.1 | Passed | [Constraint scheduling](snapshots/constraint-scheduling) (Passed)<br>[Resource allocation](snapshots/resource-allocation) (Passed) |
| [Scientific Python](images/scientific-python) | 0.1.1 | Passed | [Demand forecast](snapshots/demand-forecast) (Passed)<br>[Statistical experiment](snapshots/statistical-experiment) (Passed) |

### Coding agents

| Image | Version | Image workload on Render | Snapshot capture and restore |
| --- | --- | --- | --- |
| [Claude Code coding agent](images/claude-code) | 0.1.1 | Passed | [Claude Code Python repository](snapshots/claude-code-python-repo) (Passed)<br>[Claude Code TypeScript repository](snapshots/claude-code-typescript-repo) (Passed) |
| [Codex coding agent](images/codex) | 0.1.1 | Passed | [Codex Python repository](snapshots/codex-python-repo) (Passed)<br>[Codex TypeScript repository](snapshots/codex-typescript-repo) (Passed) |
| [Cursor CLI coding agent](images/cursor-cli) | 0.1.2 | Passed | [Cursor CLI Python repository](snapshots/cursor-cli-python-repo) (Passed)<br>[Cursor CLI TypeScript repository](snapshots/cursor-cli-typescript-repo) (Passed) |
| [Devin CLI coding agent](images/devin-cli) | 0.1.1 | Not tested: unpublished | [Devin CLI Python repository](snapshots/devin-cli-python-repo) (Not tested)<br>[Devin CLI TypeScript repository](snapshots/devin-cli-typescript-repo) (Not tested) |
| [Goose local agent](images/goose) | 0.1.0 | Passed | [Goose python task](snapshots/goose-mcp-workspace) (Passed)<br>[Goose typescript task](snapshots/goose-repo-repair) (Passed) |
| [Mini SWE agent local agent](images/mini-swe-agent) | 0.1.0 | Passed | [Mini SWE agent python task](snapshots/mini-swe-python-issue) (Passed)<br>[Mini SWE agent typescript task](snapshots/mini-swe-typescript-issue) (Passed) |
| [OpenCode coding agent](images/opencode) | 0.2.0 | Passed | [OpenCode Python repository](snapshots/opencode-python-repo) (Passed)<br>[OpenCode TypeScript repository](snapshots/opencode-typescript-repo) (Passed) |
| [OpenHands SDK local agent](images/openhands-sdk) | 0.1.0 | Passed | [OpenHands SDK python task](snapshots/openhands-python-repair) (Passed)<br>[OpenHands SDK typescript task](snapshots/openhands-typescript-repair) (Passed) |

### Agent frameworks and evaluations

| Image | Version | Image workload on Render | Snapshot capture and restore |
| --- | --- | --- | --- |
| [DeepEval regression evaluation](images/deepeval) | 0.1.0 | Passed | [Deepeval answer regression](snapshots/deepeval-answer-regression) (Passed)<br>[Deepeval tool correctness](snapshots/deepeval-tool-correctness) (Passed) |
| [DSPy agent runtime](images/dspy) | 0.1.0 | Passed | [Dspy heldout classification](snapshots/dspy-heldout-classification) (Passed)<br>[Dspy structured extraction](snapshots/dspy-structured-extraction) (Passed) |
| [Inspect AI evaluation runner](images/inspect-ai) | 0.1.0 | Passed | [Inspect coding samples](snapshots/inspect-coding-samples) (Passed)<br>[Inspect tool use samples](snapshots/inspect-tool-use-samples) (Passed) |
| [LangChain Deep Agents agent runtime](images/langchain-agent) | 0.1.0 | Passed | [Langchain data analysis](snapshots/langchain-data-analysis) (Passed)<br>[Langchain repo repair](snapshots/langchain-repo-repair) (Passed) |
| [LlamaIndex offline indexing](images/llamaindex) | 0.1.0 | Passed | [Llamaindex index ready](snapshots/llamaindex-index-ready) (Passed)<br>[Llamaindex index update](snapshots/llamaindex-index-update) (Passed) |
| [Mastra agent runtime](images/mastra-agent) | 0.1.0 | Passed | [Mastra invoice analysis](snapshots/mastra-invoice-analysis) (Passed)<br>[Mastra repo repair](snapshots/mastra-repo-repair) (Passed) |
| [promptfoo skills and CLI evaluations](images/promptfoo) | 0.1.0 | Passed | [Promptfoo skill cli matrix](snapshots/promptfoo-skill-cli-matrix) (Passed)<br>[Promptfoo tool regression](snapshots/promptfoo-tool-regression) (Passed) |
| [Pydantic AI agent runtime](images/pydantic-ai) | 0.1.0 | Passed | [Pydantic artifact validation](snapshots/pydantic-artifact-validation) (Passed)<br>[Pydantic typed analysis](snapshots/pydantic-typed-analysis) (Passed) |
| [Ragas retrieval evaluation](images/ragas) | 0.1.0 | Passed | [Ragas rag quality](snapshots/ragas-rag-quality) (Passed)<br>[Ragas retrieval ablations](snapshots/ragas-retrieval-ablations) (Passed) |
| [smolagents agent runtime](images/smolagents) | 0.1.0 | Passed | [Smolagents code repair](snapshots/smolagents-code-repair) (Passed)<br>[Smolagents data analysis](snapshots/smolagents-data-analysis) (Passed) |

### Browser automation

| Image | Version | Image workload on Render | Snapshot capture and restore |
| --- | --- | --- | --- |
| [Browser Use local agents](images/browser-use) | 0.1.0 | Passed | [Browser use form task](snapshots/browser-use-form-task) (Passed)<br>[Browser use table extraction](snapshots/browser-use-table-extraction) (Passed) |
| [Playwright browser tests](images/playwright) | 0.1.0 | Passed | [Playwright app tests](snapshots/playwright-app-tests) (Passed)<br>[Playwright artifact capture](snapshots/playwright-artifact-capture) (Passed) |
| [Stagehand local browser agents](images/stagehand) | 0.1.0 | Passed | [Stagehand browser actions](snapshots/stagehand-browser-actions) (Passed)<br>[Stagehand structured extraction](snapshots/stagehand-structured-extraction) (Passed) |

### Documents, media and integration tests

| Image | Version | Image workload on Render | Snapshot capture and restore |
| --- | --- | --- | --- |
| [Document extraction](images/document-extraction) | 0.1.1 | Passed | [Document processing lab](snapshots/document-processing-lab) (Passed)<br>[Invoice reconciliation](snapshots/invoice-reconciliation) (Passed) |
| [Python and TypeScript integration testing](images/integration-test) | 0.1.1 | Passed | [MCP and API test world](snapshots/mcp-api-test-world) (Passed)<br>[Webhook signature replay](snapshots/webhook-signature-replay) (Passed) |
| [TypeScript media processing](images/media-processing) | 0.1.1 | Passed | [Audio processing](snapshots/audio-processing) (Passed)<br>[Media project](snapshots/media-project) (Passed) |
| [TypeScript Office artifacts](images/office-artifacts) | 0.1.1 | Passed | [Presentation workspace](snapshots/presentation-workspace) (Passed)<br>[Reporting workspace](snapshots/reporting-workspace) (Passed) |
| [Postgres lab](images/postgres-lab) | 0.1.1 | Passed | [Database migration lab](snapshots/migration-lab) (Passed)<br>[SQL and vector playground](snapshots/sql-vector-playground) (Passed) |

Docling and its two recipes remain outside the catalog pending dependency review.

Build, release and registry refresh instructions are in [Contributing](docs/contributing.md).
Previous results remain in the [November 4 report](docs/catalog-live-validation-2026-11-04.md).

Repository code is MIT licensed. Bundled CLIs, runtimes and libraries retain their
own terms and licenses.
