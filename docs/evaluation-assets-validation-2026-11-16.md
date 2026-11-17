# Evaluation asset validation, November 16, 2026

This report covers new `promptfoo`, `inspect-ai`, `ragas`, and `deepeval` images and their eight prepared filesystem recipes. All manifests remain draft/unverified with null publication digests and Render evidence. No authenticated provider or judge success is claimed by the offline checks below.

## Pinned inputs

| Image | Main package | Dependencies |
| --- | --- | --- |
| promptfoo | promptfoo 0.125.1 | npm integrity lock; Codex 0.169.0, OpenCode 2.3.0, Claude Code 2.1.325 |
| inspect-ai | inspect-ai 0.3.290 | Python hash lock; OpenAI 3.51.0 and Anthropic 2.8.0 clients |
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

Final source checks include receipt normalization, judge-control bounds, provider prerequisite imports and an inline Python-file-looking prompt regression. All four full image checks passed; installed live helper hashes match these final sources.

| Image | Final checked image ID | Configuration digest |
| --- | --- | --- |
| `inspect-ai` | `sha256:532af4bfac5cd39859b23104f3e8f661000a76b6dac280563fb88ae8e1126199` | `sha256:bc325ceec47b3f7db53d8ddb414180116ea4380bf90c9d20ada0129198757c72` |
| `ragas` | `sha256:9e5c3d61df8fde0ef66b3c0718066898ac3bbb5bf3f8c6932ecbedd0a8e82382` | `sha256:fa52e673eb2db5063f3e48e0c3dd787cbacd281d5be8f70c8246ceb9762b4cb7` |
| `deepeval` | `sha256:e1173e55004ca1eee5cebe0bfe2ba10af8dee24bd7e77e6cd7a7fd687228b664` | `sha256:b2f59f7d9b20191cd83cc49fa82df3337ded99d8a1647b66ac1746ca14b156d1` |
| `promptfoo` | `sha256:7c630c608bf27e952cb34aa75153ade5abcbcdb08b41c0befe1ee6a9574f36dd` | `sha256:749dc5c315db578b5712b55722f2208440033dd14ae039127bb524b8b85fd160` |

## What the checks establish

- Inspect executes its actual task/generation/scoring pipeline. Its offline programming-result and tool-selection samples use explicitly mocked model responses and synthetic usage. They do not prove patch generation or real tool execution.
- Ragas executes real non-LLM rank-sensitive context precision/recall. The RAG quality recipe additionally checks exact answers. Frozen retrieval ablations are not performance claims about an embedding model or index.
- DeepEval executes real `ToolCorrectnessMetric` with exact ordered calls/arguments/outputs and a fail-closed model that rejects generation. The answer recipe uses `ExactMatchMetric`. These are deterministic checks, not mocked judge scores.
- promptfoo executes its real evaluator/assertion pipeline against prerecorded positive/negative controls. Its separate live runner invokes actual coding CLIs with the same task, isolated projects and independent tests. Offline receipts retain `agentInvoked: false`.

## OpenCode file-search dependency

Both the promptfoo and standalone OpenCode Dockerfiles install ripgrep 15.1.0 from its [official Linux amd64 musl archive](https://github.com/BurntSushi/ripgrep/releases/tag/15.1.0), verified against release SHA256 `1c9297be4a084eea7ecaedf93eb03d058d6faae29bbc57ecdaf5063921491599`. Licenses are retained. The Docker build checks its version and search behavior with networking disabled.

OpenCode 2.3.0 [checks PATH before downloading ripgrep](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/core/src/ripgrep/binary.ts). Earlier local runs downloaded the archive from GitHub because `rg` was absent; restricted hosted model egress would prevent that download. The [PTY helper is already embedded and checksum-verified](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/core/src/persistent-pty/binary.bun.ts), so no separate PTY download is needed.

Final full checkers passed for both images after this dependency change. Fresh-home authenticated OpenCode grep-tool smokes also passed on both: the built-in grep call completed, the output file matched the independently expected line, no ripgrep download was logged, and no cached `rg` appeared in the home directory. The standalone OpenCode local image ID is `sha256:6ce3c6b5e78a10588be32ec6eb39f87ce0002cf9fe92862864e0986a23bc4818`; its configuration digest is `sha256:bef8d062e8d0a0afb6371d8afa36a9ab677c838a249d8af28889fc48e1be35ec`. These remain local identities, not published OCI digests. Receipts are under ignored `evidence/evaluation-model-probes/{promptfoo,opencode}-ripgrep-smoke/`.

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

Both judge runners preserve score/error rows and returned request metadata separately from deterministic acceptance. Their normalized receipts include `schemaVersion: 1` and `passed`. Prepared positive/negative controls declare acceptable score bounds; invalid scores, missing responses or failed controls make `passed` false. A zero score on the intended negative control is a successful check.

promptfoo, current TypeScript candidate command (the recorded results below
belong to the earlier image IDs):

```sh
timeout -k 5 800 node /opt/render/fixtures/promptfoo/live-matrix.ts \
  --skill /workspace/promptfoo-skill-cli-matrix/input/SKILL.md \
  --codex-model SELECT_CODEX_MODEL --opencode-model openrouter/PROVIDER/MODEL \
  --output /workspace/skill-cli-live
```

For the default provider setting this needs runtime OpenAI/OpenRouter credentials. Add `--codex-provider openrouter --codex-model PROVIDER/MODEL` to route both CLIs through the approved OpenRouter endpoint using only its key. Optional `--clis codex,claude` with `--claude-model MODEL` uses Anthropic instead; all three CLIs may be selected for six variants. Each invocation is limited to 180 seconds and a separate five-second grader. Retain blocked credits/missing credentials as gaps; never count a prerecorded control as authenticated execution.

## Authenticated execution status

An initial validation attempt did not execute because automatic approval review required explicit authorization for the credential source and destination. The user subsequently authorized the OpenRouter credential and bounded synthetic calls. The following are actual API calls from local Linux containers, not hosted Render snapshot validation. All models were explicitly selected through OpenRouter.

| Asset | Model | Measured result |
| --- | --- | --- |
| Ragas Faithfulness | `openai/gpt-6.1-terra` | Passed: grounded answer 1.0, unsupported answer 0.0 |
| Ragas Faithfulness | `google/gemini-4-hydrogen` | Failed positive control: grounded 0.0, unsupported 0.0 |
| Ragas Faithfulness | `google/gemini-4-carbon` | Failed positive control on unchanged fixture: grounded 0.0, unsupported 0.0 |
| DeepEval GEval | `openai/gpt-6.1-terra` | Passed: correct answer 1.0, incorrect answer 0.0 |
| DeepEval GEval | `google/gemini-4-hydrogen` | Passed: correct answer 1.0, incorrect answer 0.0 |
| Inspect samples | `openai/gpt-6.1-terra` and `google/gemini-4-hydrogen` | Passed: all three exact-answer controls independently accepted for each model |
| promptfoo actual CLI × skill matrix | Codex + OpenCode, `openai/gpt-6.1-terra` through OpenRouter | Passed all four skills off/on variants; 5/5 independent tests each |
| promptfoo actual CLI × skill matrix | Codex + OpenCode, `google/gemini-4-hydrogen` through OpenRouter | Passed all four skills off/on variants; 5/5 independent tests each |

The Ragas and DeepEval runs each made four API calls; the failed Ragas controls remain failures. Both Google runs completed normally below the token cap; neither failure is a truncation or transport error. Carbon was one separate compatibility test selected from the [official OpenRouter model catalog](https://openrouter.ai/api/v1/models); it did not replace or erase the first failure. Prepared control bounds were unchanged.

Early Inspect and promptfoo attempts failed before model requests: Inspect rejected an older OpenAI client, and promptfoo treated a plain prompt containing `totals.py` as a prompt-file path. Compatible pinned clients and explicit raw prompt objects fix these integration bugs; offline regressions cover both. Those earlier error receipts remain retained alongside subsequent attempts.

The full model/CLI matrices above ran before the final image added ripgrep; live-helper source hashes are unchanged. The final image separately passed an actual OpenCode built-in grep call with an exact expected file result, no download log and no cached ripgrep under a fresh home directory.

The repair fixture demonstrates the mechanics of the CLI/skill comparison; equal 5/5 scores with skills off/on do not establish a skill-quality improvement. The Codex/OpenRouter path passed without using the direct OpenAI API, so it does not resolve any historical direct-API credit gap.

Raw process receipts, model identities, usage and scorer outputs are retained locally under ignored `evidence/evaluation-model-probes/`. No credentials are included in source or prepared filesystem state. Final Docker cleanup audit found no remaining `eval-assets-*` containers. All four final image receipts passed and each installed live helper hash matched its source.

## Remaining release gates

Merge reviewed input source, publish a new internal candidate without overwriting tags, retain checked-versus-published identity receipts, run Render image and both snapshot tests, execute supported real model paths, audit cleanup, and record immutable source/digest/recipe/evidence metadata. Public package access is a separate release decision. Guide work remains gated on the asset's required evidence.
