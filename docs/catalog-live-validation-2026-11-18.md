# Live Render validation: November 18, 2026

45 published images passed their import and image workloads. All 90 corresponding
filesystem snapshot recipes passed preparation, capture, restore and output checks.
Both temporary sandboxes and every temporary snapshot were independently confirmed
cleaned up. Imported images remain available in the validation group.

Tests used `@renderinc/sdk@1.6.0`, the `1c-2g` plan, `linux/amd64`, deny-all networking,
synthetic inputs, a 900-second runtime limit and a 300-second idle limit. Model API
calls and model-backed agent behavior were not tested. These results do not claim
runtime snapshot process continuity.

Devin CLI 0.1.1 was not published or tested: its upstream download returned HTTP 403.
Its two recipes remain unverified. Docling remains outside the catalog.

Five requests were rejected before resource creation by the concurrent image-import
limit. Limiting imports to two resolved those rejections. One tool-trace evaluation
stream ended without a terminal exit event; cleanup was confirmed before a fresh
attempt passed. No failed attempt is counted as a pass.

The [machine-readable report](catalog-live-validation-2026-11-18.json) records exact
digests, source revisions, recipe and output hashes, and cleanup observations. Each
linked GitHub Release includes its verified manifests, security receipt, redacted
scan and SBOM. Security results apply the [publication policy](security.md); a passing
gate does not mean the scan found zero vulnerabilities.

| Image | Version | Render result | Snapshot recipes | Evidence |
| --- | --- | --- | --- | --- |
| browser-use | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-browser-use-0.1.0) |
| claude-code | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-claude-code-0.1.1) |
| codex | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-codex-0.1.1) |
| coding-workspace | 0.1.2 | Passed | 3 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-coding-workspace-0.1.2) |
| cursor-cli | 0.1.2 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-cursor-cli-0.1.2) |
| deepeval | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-deepeval-0.1.0) |
| devin-cli | 0.1.1 | Not tested: unpublished | 2 not tested | Upstream download blocked |
| document-extraction | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-document-extraction-0.1.1) |
| dspy | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-dspy-0.1.0) |
| geospatial | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-geospatial-0.1.1) |
| goose | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-goose-0.1.0) |
| inspect-ai | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-inspect-ai-0.1.0) |
| integration-test | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-integration-test-0.1.1) |
| langchain-agent | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-langchain-agent-0.1.0) |
| llamaindex | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-llamaindex-0.1.0) |
| mastra-agent | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-mastra-agent-0.1.0) |
| media-processing | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-media-processing-0.1.1) |
| mini-swe-agent | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-mini-swe-agent-0.1.0) |
| office-artifacts | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-office-artifacts-0.1.1) |
| opencode | 0.2.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-opencode-0.2.0) |
| openhands-sdk | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-openhands-sdk-0.1.0) |
| playwright | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-playwright-0.1.0) |
| postgres-lab | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-postgres-lab-0.1.1) |
| promptfoo | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-promptfoo-0.1.0) |
| pydantic-ai | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-pydantic-ai-0.1.0) |
| python-analysis | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-python-analysis-0.1.1) |
| python-api-postgres | 0.1.1 | Passed | 1 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-python-api-postgres-0.1.1) |
| python-coding | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-python-coding-0.1.1) |
| python-optimization | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-python-optimization-0.1.1) |
| ragas | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-ragas-0.1.0) |
| retrieval-local | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-retrieval-local-0.1.1) |
| scientific-python | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-scientific-python-0.1.1) |
| smolagents | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-smolagents-0.1.0) |
| stagehand | 0.1.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-stagehand-0.1.0) |
| typescript-agent-workflows | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-agent-workflows-0.1.1) |
| typescript-agents | 0.2.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-agents-0.2.0) |
| typescript-ai-gateway | 0.2.0 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-ai-gateway-0.2.0) |
| typescript-ai-ui | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-ai-ui-0.1.1) |
| typescript-api-postgres | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-api-postgres-0.1.1) |
| typescript-data | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-data-0.1.1) |
| typescript-evals | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-evals-0.1.1) |
| typescript-image | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-image-0.1.1) |
| typescript-openapi | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-openapi-0.1.1) |
| typescript-rag | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-rag-0.1.1) |
| typescript-sqlite | 0.1.1 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-sqlite-0.1.1) |
| typescript-tools | 0.1.2 | Passed | 2 passed | [Release](https://github.com/render-examples/sandbox-images/releases/tag/image-typescript-tools-0.1.2) |
