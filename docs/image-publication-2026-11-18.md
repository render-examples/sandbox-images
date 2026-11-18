# Image publication: November 18, 2026

45 of 46 image updates are published to GHCR and publicly accessible. Devin CLI
0.1.1 is unpublished: its official download returned HTTP 403 in both attempts.

Every published image passed its offline image and recipe workloads, source secret
scan and image security gate. The gate blocks fixable high/critical vulnerabilities
and detected secrets; lower-severity and unfixed findings remain in the reports.
See [security checks](security.md) for the policy and narrow exceptions.

The published configuration digest matches the tested and scanned image ID.
Receipt, scan and SBOM hashes were checked independently after publication.
Anonymous requests retrieved each OCI manifest by digest and its configuration blob.
This check did not download every image layer.

These versions have not been retested on Render. Their manifests remain `draft`
and `unverified`; those fields describe hosted validation, not GHCR visibility.
Existing snapshots still contain their previous image contents. Recreate and test
snapshots from these digests before marking the new versions verified.

## Source and evidence

Build source: [`2aebd01`](https://github.com/render-examples/sandbox-images/commit/2aebd012463348bbf719333fc9f3f9cd9230d1ef).
The [release record](image-publication-2026-11-18.json) contains the full image and
configuration digests, run URLs and post-publication checks. Each linked Actions
run retains its `publication-receipt-<slug>` artifact with the workload receipt,
Trivy report, CycloneDX SBOM, security receipt and OCI manifest.

Goose and TypeScript OpenAPI initially failed during push with GHCR `unknown blob`.
Their release tags were confirmed absent before retrying the full gated workflow.

## Images

| Image | Version | Publication | Workloads and security gate | Evidence |
| --- | --- | --- | --- | --- |
| [browser-use](../images/browser-use) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285004661) |
| [claude-code](../images/claude-code) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285012385) |
| [codex](../images/codex) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285020731) |
| [coding-workspace](../images/coding-workspace) | 0.1.2 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285027390) |
| [cursor-cli](../images/cursor-cli) | 0.1.2 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285035546) |
| [deepeval](../images/deepeval) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285044755) |
| [devin-cli](../images/devin-cli) | 0.1.1 | Not published | Build blocked: upstream HTTP 403 | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285052849) |
| [document-extraction](../images/document-extraction) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285060453) |
| [dspy](../images/dspy) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285069673) |
| [geospatial](../images/geospatial) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285077886) |
| [goose](../images/goose) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285085636) |
| [inspect-ai](../images/inspect-ai) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285092848) |
| [integration-test](../images/integration-test) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285100120) |
| [langchain-agent](../images/langchain-agent) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285107486) |
| [llamaindex](../images/llamaindex) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285115702) |
| [mastra-agent](../images/mastra-agent) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285123916) |
| [media-processing](../images/media-processing) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285131123) |
| [mini-swe-agent](../images/mini-swe-agent) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285140746) |
| [office-artifacts](../images/office-artifacts) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285147754) |
| [opencode](../images/opencode) | 0.2.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285156120) |
| [openhands-sdk](../images/openhands-sdk) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285164377) |
| [playwright](../images/playwright) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285171840) |
| [postgres-lab](../images/postgres-lab) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285179432) |
| [promptfoo](../images/promptfoo) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285187833) |
| [pydantic-ai](../images/pydantic-ai) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285194673) |
| [python-analysis](../images/python-analysis) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285203383) |
| [python-api-postgres](../images/python-api-postgres) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285211420) |
| [python-coding](../images/python-coding) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285220303) |
| [python-optimization](../images/python-optimization) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285228026) |
| [ragas](../images/ragas) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285236744) |
| [retrieval-local](../images/retrieval-local) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285246047) |
| [scientific-python](../images/scientific-python) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285254558) |
| [smolagents](../images/smolagents) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285262683) |
| [stagehand](../images/stagehand) | 0.1.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285270592) |
| [typescript-agent-workflows](../images/typescript-agent-workflows) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285277630) |
| [typescript-agents](../images/typescript-agents) | 0.2.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285285302) |
| [typescript-ai-gateway](../images/typescript-ai-gateway) | 0.2.0 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285293878) |
| [typescript-ai-ui](../images/typescript-ai-ui) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285302408) |
| [typescript-api-postgres](../images/typescript-api-postgres) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285309222) |
| [typescript-data](../images/typescript-data) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285318243) |
| [typescript-evals](../images/typescript-evals) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285324933) |
| [typescript-image](../images/typescript-image) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285333656) |
| [typescript-openapi](../images/typescript-openapi) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285341399) |
| [typescript-rag](../images/typescript-rag) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285347959) |
| [typescript-sqlite](../images/typescript-sqlite) | 0.1.1 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285355264) |
| [typescript-tools](../images/typescript-tools) | 0.1.2 | Published, public | Passed | [Run](https://github.com/render-examples/sandbox-images/actions/runs/44285363205) |
