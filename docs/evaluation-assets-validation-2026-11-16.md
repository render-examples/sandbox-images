# Evaluation asset validation, November 16, 2026

This report covers new `promptfoo`, `inspect-ai`, `ragas`, and `deepeval` images and their eight prepared filesystem recipes. All manifests remain draft/unverified with null publication digests and Render evidence. No authenticated provider or judge success is claimed by the offline checks below.

## Pinned inputs

| Image | Main package | Dependencies |
| --- | --- | --- |
| promptfoo | promptfoo 0.125.1 | npm integrity lock; Codex 0.169.0, OpenCode 2.3.0, Claude Code 2.1.325 |
| inspect-ai | inspect-ai 0.3.290 | Python hash lock; OpenAI and Anthropic clients |
| ragas | ragas 0.4.4 | Python hash lock; RapidFuzz 3.14.3 and LangChain OpenAI-compatible client |
| deepeval | deepeval 4.3.4 | Python hash lock; OpenAI-compatible client |

Official Node/Python Linux base digests follow the existing repository's reviewed Bookworm runtime pins. Package versions were resolved from npm/PyPI and actual installed APIs were exercised. No floating model ID is selected by the asset: callers explicitly select a model at execution time.

## Local evidence

| Image | Actual package API fixtures | Full image checker |
| --- | --- | --- |
| inspect-ai | Passed: two scenarios, real Inspect eval/task/scorer pipeline, explicitly mocked responses | Passed: smoke, both recipes, semantic verification, corruption/recovery, fresh-container prepared filesystem restore |
| ragas | Passed: context precision/recall, exact answers and independent oracle | Passed: smoke, both recipes, corruption/recovery and fresh-container prepared filesystem restore |
| deepeval | Passed: built-in exact tool matching and exact answer metrics, independent equality oracle | Passed: smoke, both recipes, corruption/recovery and fresh-container prepared filesystem restore |
| promptfoo | Passed: actual evaluate/assertion engine, one accepted and two rejected controls per recipe | Passed: all three CLI startup/version checks, smoke, both recipes, corruption/recovery and fresh-container prepared filesystem restore |

The full checker uses linux/amd64, a 2 GB memory limit, disabled guest networking and bounded guest commands. Its generated receipts are `artifacts/checked-<slug>.json`; raw local build logs remain outside Git. Local container IDs are not published OCI manifest digests.

Inspect's checked image ID: `sha256:32d98a547ac3b7d6379c9b978c479d0ac64586893848ded9226d15025293940c`; checked configuration digest: `sha256:3a35f1fd312cd549c55d422565991e9d376c4708836e4687390897ec5649a5d5`.

Ragas checked image ID: `sha256:557dd09c5220498e676b356aa8fab29a5bdfb2967735f999caa84fe575ecc71a`; checked configuration digest: `sha256:0f3074114d809e0c5a31ac959fb81db1791c83464e1c04c00cf5d48e5261fc89`.

DeepEval checked image ID: `sha256:fb437d64b8d07d7f22f9c90ad8138632b22eb53a9bb14f1ca6117f1c936ecd2c`; checked configuration digest: `sha256:be9e2f16ad941a74790ca9643a14adfad4a8d98509c1fdaba8d12cc32e7c18b2`.

The initial Ragas/DeepEval image checks above preceded a helper-only fix that retains non-finite judge scores as errors. Their final-source image rechecks are pending; offline workload source is unchanged.

promptfoo checked image ID: `sha256:2f34c117416687996f5ed28cb64db66452266f7f8c1c147950a6c7852d593ac3`; checked configuration digest: `sha256:ff83c44a29417cdda2eea6864b1ffc1b3fc6566e5ef8949e7e23d27d92dd954e`.

## What the checks establish

- Inspect executes its actual task/generation/scoring pipeline. Its offline programming-result and tool-selection samples use explicitly mocked model responses and synthetic usage. They do not prove patch generation or real tool execution.
- Ragas executes real non-LLM rank-sensitive context precision/recall. The RAG quality recipe additionally checks exact answers. Frozen retrieval ablations are not performance claims about an embedding model or index.
- DeepEval executes real `ToolCorrectnessMetric` with exact ordered calls/arguments/outputs and a fail-closed model that rejects generation. The answer recipe uses `ExactMatchMetric`. These are deterministic checks, not mocked judge scores.
- promptfoo executes its real evaluator/assertion pipeline against prerecorded positive/negative controls. Its separate live runner invokes actual coding CLIs with the same task, isolated projects and independent tests. Offline receipts retain `agentInvoked: false`.

## Hosted validation commands

Prepare each recipe using the canonical runtime before capturing a filesystem snapshot. Restore into a new sandbox, then run analyze/verify/test; restore another independent copy for isolation checks. Keep model keys out of images and prepared state. Supply the following commands and credentials only during execution.

Inspect, run twice with distinct supported routes:

```sh
timeout -k 5 300 python /opt/render/fixtures/inspect-ai/live.py \
  /workspace/inspect-coding-samples/input/samples.json \
  --model openrouter/PROVIDER/MODEL --output /workspace/inspect-live-route-one
```

Also supported by the installed packages: `openai/MODEL`, `anthropic/MODEL`. OpenRouter uses runtime `OPENROUTER_API_KEY`. The runner records returned model/usage and preserves missing/failed samples.

Ragas, run twice with `--provider openai` and `--provider openrouter` and appropriately selected models:

```sh
timeout -k 5 300 python /opt/render/fixtures/ragas/judge.py \
  --provider openrouter --model PROVIDER/MODEL \
  --cases /workspace/ragas-rag-quality/input/judge-cases.json \
  --output /workspace/ragas-judge-route-one.json
```

DeepEval, the same explicit provider choices:

```sh
timeout -k 5 300 python /opt/render/fixtures/deepeval/judge.py \
  --provider openrouter --model PROVIDER/MODEL \
  --cases /workspace/deepeval-answer-regression/input/judge-cases.json \
  --output /workspace/deepeval-judge-route-one.json
```

Both judge runners preserve score/error rows and returned request metadata separately from deterministic acceptance. A judge score of zero is a valid measurement; a missing/invalid provider response is an execution failure.

promptfoo, default actual CLI × skill matrix:

```sh
timeout -k 5 800 node /opt/render/fixtures/promptfoo/live-matrix.mjs \
  --skill /workspace/promptfoo-skill-cli-matrix/input/SKILL.md \
  --codex-model SELECT_CODEX_MODEL --opencode-model openrouter/PROVIDER/MODEL \
  --output /workspace/skill-cli-live
```

This needs runtime OpenAI/OpenRouter credentials. Optional `--clis codex,claude` with `--claude-model MODEL` uses Anthropic instead; all three CLIs may be selected for six variants. Each invocation is limited to 180 seconds and a separate five-second grader. Retain blocked credits/missing credentials as gaps; never count a prerecorded control as authenticated execution.

## Authenticated execution status

The attempted local judge validation did not execute: automatic approval review required explicit authorization to reuse an OpenRouter credential from a separate project for these external model calls. No provider requests or credential transfers occurred in that attempt. Offline acceptance remains valid; authenticated model and judge coverage remains unverified.

## Remaining release gates

Merge reviewed input source, publish a new internal candidate without overwriting tags, retain checked-versus-published identity receipts, run Render image and both snapshot tests, execute supported real model paths, audit cleanup, and record immutable source/digest/recipe/evidence metadata. Public package access is a separate release decision. Guide work remains gated on the asset's required evidence.
