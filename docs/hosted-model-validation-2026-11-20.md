# Hosted model validation, November 20, 2026

The matrix completed 70 model cases across 17 published images and 34 recipes: **65 passed and five failed**. It created 136 independent model restores. All 206 temporary sandboxes were confirmed terminated, and all 35 prepared filesystem snapshots were deleted.

A passing case requires two independent restores and passing installed graders. A failure stops that case, so four early failures account for the difference between 140 planned and 136 executed restores. Failed attempts remain in the [machine-readable receipts](hosted-model-validation-2026-11-20.json).

## Results

| Published image | Passed cases | Failed cases | Tested routes |
| --- | ---: | ---: | --- |
| browser-use 0.1.0 | 4 | 0 | Google API, OpenRouter |
| deepeval 0.1.0 | 4 | 0 | OpenRouter |
| dspy 0.1.0 | 4 | 0 | OpenRouter |
| goose 0.1.0 | 4 | 0 | OpenRouter |
| inspect-ai 0.1.0 | 3 | 1 | OpenRouter |
| langchain-agent 0.1.0 | 8 | 0 | OpenRouter |
| mastra-agent 0.1.0 | 4 | 0 | OpenRouter |
| mini-swe-agent 0.1.0 | 3 | 1 | OpenRouter |
| opencode 0.2.0 | 4 | 0 | OpenRouter |
| openhands-sdk 0.1.0 | 3 | 1 | OpenRouter |
| promptfoo 0.1.0 | 4 | 0 | OpenRouter |
| pydantic-ai 0.1.0 | 4 | 0 | OpenRouter |
| ragas 0.1.0 | 2 | 2 | OpenRouter |
| smolagents 0.1.0 | 4 | 0 | OpenRouter |
| stagehand 0.1.0 | 2 | 0 | Google API |
| typescript-agents 0.2.0 | 4 | 0 | Google API, OpenRouter |
| typescript-ai-gateway 0.2.0 | 4 | 0 | OpenRouter |

Google Gemini `gemini-4-hydrogen` and OpenAI `gpt-6.1-terra` were the selected model families. OpenRouter routes preserve the requested upstream model ID. Browser Use and AI SDK also exercised direct Google API routes. Stagehand exercised Google only; its direct OpenAI option remains untested under the approved credential scope.

## Retained failures

| Case | Observed result |
| --- | --- |
| Inspect AI tool-use samples, Gemini | The negative sample consumed 128 output tokens, including 125 reasoning tokens, and returned no answer. Exact-match grading failed. |
| Ragas RAG quality, Gemini | The grounded control reached the 512-token output limit; the receipt records `finish_reason: length` and `LLMDidNotFinishException`. |
| Ragas retrieval ablations, Gemini | The grounded control reached the same 512-token limit. The unsupported control passed. |
| OpenHands TypeScript repair, Gemini | The first restore passed. The second agent exited successfully but passed only 1/5 independent tests; the case failed. |
| mini-SWE-agent TypeScript issue, Gemini | The agent exited 1 and passed only 1/5 independent tests. The retained receipt does not contain enough agent output to attribute the underlying error. |

The corresponding Terra cases passed. These results establish the behavior of these fixtures and settings, not a general model ranking. Increasing the evaluation token budgets or changing a workload requires a separately recorded validation; no grader or pass threshold was weakened.

## Method and evidence

- SDK `@renderinc/sdk@1.6.0`, Linux/amd64 images pinned by digest, Render `1c-2g`, filesystem snapshots.
- Recipe preparation and offline verification ran with deny-all egress. Each model restore checked the captured baseline, started without a result receipt, and allowed only the selected model API hosts.
- The host kept the Render key. Only approved OpenRouter/Google keys entered guests at execution time.
- Independent graders checked produced artifacts or actual repaired source. Coding graders and shared runtime hashes were checked for modification.
- Termination was confirmed by readback; snapshot deletion was confirmed separately. Raw journals remain local because they contain workspace resource IDs.
- The report includes build revisions, image digests, recipe versions, selected models, command and receipt hashes, full redacted guest receipts and cleanup results. It contains no configured credentials or workspace resource IDs.

The strict TypeScript [matrix runner](../tools/validate-model-matrix.ts) and [usage instructions](contributing.md#validate-model-backed-workloads) provide the reusable host workflow. Runtime process continuity was not tested.

## Devin and Docling

[PR #24](https://github.com/render-examples/sandbox-images/pull/24) clears both build blockers and passes all native Linux image, recipe and security checks at `931035b19c21d1872ce54e5dafce93420853cb27`. Main merge, publication and hosted validation of Devin 0.1.1 and Docling 0.1.0 still require the repository review gate. These candidates are outside the published-image model matrix above.

Docling already passed actual CPU layout/table inference, malformed-input rejection, both local recipe checks and fresh-container restores. Devin’s authenticated agent test additionally needs an approved Devin/Windsurf login; no test credential is configured.
