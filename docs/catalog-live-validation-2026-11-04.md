# Live Render test results

30/30 images and 60/60 recipes passed the November 4, 2026 test run.

Images ran their bundled workloads on Render. Each recipe prepared files, captured a filesystem snapshot, restored it into a fresh sandbox, and checked its outputs. Tests used `linux/amd64`, `@renderinc/sdk@1.6.0`, plan `1c-2g`, deny-all egress, a 900-second runtime limit and a 300-second idle timeout.

Passing recipes preserved the input baseline, started without precomputed output artifacts, produced the expected results, and passed output hash checks. Cleanup was checked independently: the temporary sandboxes were terminated and the snapshots were no longer available. Imported images remain in the sandbox group.

All 30 GHCR packages are private. The coding-agent checks cover CLI startup, prepared repositories, reference repairs and graders. Authenticated model runs were not tested. No model API calls were made.

[Download the detailed results](catalog-live-validation-2026-11-04.json) for image digests, build revisions, recipe file hashes, output hashes, summaries, timestamps and runner hashes. Workspace and resource IDs are omitted.

## Images

| Image | Version | Render workload |
| --- | --- | --- |
| [claude-code](../images/claude-code) | 0.1.0 | Passed |
| [codex](../images/codex) | 0.1.0 | Passed |
| [coding-workspace](../images/coding-workspace) | 0.1.1 | Passed |
| [cursor-cli](../images/cursor-cli) | 0.1.1 | Passed |
| [devin-cli](../images/devin-cli) | 0.1.0 | Passed |
| [document-extraction](../images/document-extraction) | 0.1.0 | Passed |
| [geospatial](../images/geospatial) | 0.1.0 | Passed |
| [integration-test](../images/integration-test) | 0.1.0 | Passed |
| [media-processing](../images/media-processing) | 0.1.0 | Passed |
| [office-artifacts](../images/office-artifacts) | 0.1.0 | Passed |
| [opencode](../images/opencode) | 0.1.0 | Passed |
| [postgres-lab](../images/postgres-lab) | 0.1.0 | Passed |
| [python-analysis](../images/python-analysis) | 0.1.0 | Passed |
| [python-api-postgres](../images/python-api-postgres) | 0.1.0 | Passed |
| [python-coding](../images/python-coding) | 0.1.0 | Passed |
| [python-optimization](../images/python-optimization) | 0.1.0 | Passed |
| [retrieval-local](../images/retrieval-local) | 0.1.0 | Passed |
| [scientific-python](../images/scientific-python) | 0.1.0 | Passed |
| [typescript-agent-workflows](../images/typescript-agent-workflows) | 0.1.0 | Passed |
| [typescript-agents](../images/typescript-agents) | 0.1.0 | Passed |
| [typescript-ai-gateway](../images/typescript-ai-gateway) | 0.1.0 | Passed |
| [typescript-ai-ui](../images/typescript-ai-ui) | 0.1.0 | Passed |
| [typescript-api-postgres](../images/typescript-api-postgres) | 0.1.0 | Passed |
| [typescript-data](../images/typescript-data) | 0.1.0 | Passed |
| [typescript-evals](../images/typescript-evals) | 0.1.0 | Passed |
| [typescript-image](../images/typescript-image) | 0.1.0 | Passed |
| [typescript-openapi](../images/typescript-openapi) | 0.1.0 | Passed |
| [typescript-rag](../images/typescript-rag) | 0.1.0 | Passed |
| [typescript-sqlite](../images/typescript-sqlite) | 0.1.0 | Passed |
| [typescript-tools](../images/typescript-tools) | 0.1.1 | Passed |

## Retests

- Cursor CLI 0.1.0 printed its version but hung while resolving a hostname with egress disabled. Version 0.1.1 limits the DNS wait for help and version commands; both recipes were rerun against its new published digest.
- The data quality audit initially stopped because the Python analysis smoke command wrote to a different output directory. The manifest now passes the supported output argument; the same published image passed the retest.

## Recipes

| Recipe | Parent image | Capture, restore and workload |
| --- | --- | --- |
| [agent-checkpoint-workflow](../snapshots/agent-checkpoint-workflow) | typescript-agent-workflows | Passed |
| [agent-regression-python](../snapshots/agent-regression-python) | python-coding | Passed |
| [agent-regression-typescript](../snapshots/agent-regression-typescript) | coding-workspace | Passed |
| [agent-structured-output](../snapshots/agent-structured-output) | typescript-agents | Passed |
| [agent-tool-loop](../snapshots/agent-tool-loop) | typescript-agents | Passed |
| [ai-retry-budget-lab](../snapshots/ai-retry-budget-lab) | typescript-ai-gateway | Passed |
| [ai-routing-workbench](../snapshots/ai-routing-workbench) | typescript-ai-gateway | Passed |
| [analytics-workbench](../snapshots/analytics-workbench) | python-analysis | Passed |
| [audio-processing](../snapshots/audio-processing) | media-processing | Passed |
| [chat-stream-workbench](../snapshots/chat-stream-workbench) | typescript-ai-ui | Passed |
| [claude-code-python-repo](../snapshots/claude-code-python-repo) | claude-code | Passed |
| [claude-code-typescript-repo](../snapshots/claude-code-typescript-repo) | claude-code | Passed |
| [codebase-research-corpus](../snapshots/codebase-research-corpus) | coding-workspace | Passed |
| [codex-python-repo](../snapshots/codex-python-repo) | codex | Passed |
| [codex-typescript-repo](../snapshots/codex-typescript-repo) | codex | Passed |
| [constraint-scheduling](../snapshots/constraint-scheduling) | python-optimization | Passed |
| [csv-reconciliation](../snapshots/csv-reconciliation) | typescript-data | Passed |
| [cursor-cli-python-repo](../snapshots/cursor-cli-python-repo) | cursor-cli | Passed |
| [cursor-cli-typescript-repo](../snapshots/cursor-cli-typescript-repo) | cursor-cli | Passed |
| [data-quality-audit](../snapshots/data-quality-audit) | python-analysis | Passed |
| [demand-forecast](../snapshots/demand-forecast) | scientific-python | Passed |
| [devin-cli-python-repo](../snapshots/devin-cli-python-repo) | devin-cli | Passed |
| [devin-cli-typescript-repo](../snapshots/devin-cli-typescript-repo) | devin-cli | Passed |
| [document-processing-lab](../snapshots/document-processing-lab) | document-extraction | Passed |
| [fullstack-fastapi-postgres](../snapshots/fullstack-fastapi-postgres) | python-api-postgres | Passed |
| [fullstack-node-postgres](../snapshots/fullstack-node-postgres) | typescript-api-postgres | Passed |
| [geojson-transform](../snapshots/geojson-transform) | geospatial | Passed |
| [human-approval-workflow](../snapshots/human-approval-workflow) | typescript-agent-workflows | Passed |
| [image-compositing](../snapshots/image-compositing) | typescript-image | Passed |
| [image-derivatives](../snapshots/image-derivatives) | typescript-image | Passed |
| [invoice-reconciliation](../snapshots/invoice-reconciliation) | document-extraction | Passed |
| [mcp-api-test-world](../snapshots/mcp-api-test-world) | integration-test | Passed |
| [media-project](../snapshots/media-project) | media-processing | Passed |
| [migration-lab](../snapshots/migration-lab) | postgres-lab | Passed |
| [openapi-tool-client](../snapshots/openapi-tool-client) | typescript-openapi | Passed |
| [openapi-tool-contracts](../snapshots/openapi-tool-contracts) | typescript-openapi | Passed |
| [opencode-python-repo](../snapshots/opencode-python-repo) | opencode | Passed |
| [opencode-typescript-repo](../snapshots/opencode-typescript-repo) | opencode | Passed |
| [parquet-analytics](../snapshots/parquet-analytics) | typescript-data | Passed |
| [postgres-outbox](../snapshots/postgres-outbox) | typescript-api-postgres | Passed |
| [presentation-workspace](../snapshots/presentation-workspace) | office-artifacts | Passed |
| [rag-chunking-workbench](../snapshots/rag-chunking-workbench) | typescript-rag | Passed |
| [rag-context-assembly](../snapshots/rag-context-assembly) | typescript-rag | Passed |
| [rag-corpus](../snapshots/rag-corpus) | retrieval-local | Passed |
| [repo-ready-python](../snapshots/repo-ready-python) | python-coding | Passed |
| [repo-ready-typescript](../snapshots/repo-ready-typescript) | coding-workspace | Passed |
| [reporting-workspace](../snapshots/reporting-workspace) | office-artifacts | Passed |
| [resource-allocation](../snapshots/resource-allocation) | python-optimization | Passed |
| [retrieval-evaluation](../snapshots/retrieval-evaluation) | typescript-evals | Passed |
| [search-ranking-workbench](../snapshots/search-ranking-workbench) | retrieval-local | Passed |
| [spatial-join](../snapshots/spatial-join) | geospatial | Passed |
| [sql-vector-playground](../snapshots/sql-vector-playground) | postgres-lab | Passed |
| [sqlite-job-queue](../snapshots/sqlite-job-queue) | typescript-sqlite | Passed |
| [sqlite-migration-workbench](../snapshots/sqlite-migration-workbench) | typescript-sqlite | Passed |
| [statistical-experiment](../snapshots/statistical-experiment) | scientific-python | Passed |
| [tool-card-workbench](../snapshots/tool-card-workbench) | typescript-ai-ui | Passed |
| [tool-trace-evaluation](../snapshots/tool-trace-evaluation) | typescript-evals | Passed |
| [typed-event-reducer](../snapshots/typed-event-reducer) | typescript-tools | Passed |
| [typescript-tool-workbench](../snapshots/typescript-tool-workbench) | typescript-tools | Passed |
| [webhook-signature-replay](../snapshots/webhook-signature-replay) | integration-test | Passed |
