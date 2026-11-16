# Coding-agent model validation, 2026-11-16

Actual local-container coding runs for OpenCode, OpenHands SDK and mini-SWE-agent are tracked separately from their offline reference-workload checks. This report does not establish hosted Render import/capture/restore or public package access.

The scoped matrix is two prepared languages (TypeScript and Python) against two approved OpenRouter model routes: `google/gemini-4-hydrogen` and `openai/gpt-6.1-terra`. Each cell uses a fresh container and prepared repository, with only the OpenRouter credential supplied at runtime. Render control-plane credentials never enter the guest.

## Acceptance

1. Prepare the native recipe and prove the broken baseline fails independent grading.
2. Invoke the actual installed agent through `run-agent.mjs` with an explicit provider/model and a bounded process timeout.
3. Verify that the grader script and installed runtime module hashes did not change.
4. Run `grade-project.sh`, which replays only the candidate implementation against fresh independent tests.
5. Require agent exit zero, grader exit zero, all five independent tests passed, 100 generated cases represented, and changed candidate source.
6. Capture the installed CLI version, requested model, actual exit statuses, image ID, candidate hash and patch. Redact logs and remove the owned container.

The guest grading machinery is trusted bundled acceptance code. Hash checks detect unexpected modifications during these runs; this is not an isolation boundary against a malicious root-level agent. A passing reference repair is never counted as a model run.

## Local model results

| Image | TypeScript / Gemini | TypeScript / Terra | Python / Gemini | Python / Terra |
| --- | --- | --- | --- | --- |
| OpenCode 2.3.0 | Passed | Passed | Passed | Passed |
| OpenHands SDK 1.62.0 | Passed | Passed | Passed | Passed |
| mini-SWE-agent 2.4.6 | Pricing fix recheck pending | Pricing fix recheck pending | Pricing fix recheck pending | Pricing fix recheck pending |

Every passed cell returned agent exit zero and independently passed 5/5 tests including 100 generated cases. Gemini means OpenRouter `google/gemini-4-hydrogen`; Terra means OpenRouter `openai/gpt-6.1-terra`. These observations establish local authenticated execution, not hosted Render validation.

| Image | Checked local image ID |
| --- | --- |
| opencode | `sha256:5cd9a7a78e3450dbd522f948300e61eaa33e24620232173c982bb67d6f332f6d` |
| openhands-sdk | `sha256:bec6e1a3adda07425f09ed3075b7f461e7bfef2a938e07bd673a5d47b3754d9d` |

## Mini pricing failure and fix

All four initial mini-SWE-agent calls received a model response, then failed before the first action because the pinned LiteLLM cost map lacked the two selected models. Those failed receipts remain under the original cell directories, with agent and grader exits both 1. They are not counted as passes.

The launcher now reads the selected model's text-token prices from the [official OpenRouter model catalog](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties) at runtime, registers them with LiteLLM and preserves its default cost-error enforcement. The public metadata request has a 15-second timeout and 8 MB limit; no key is sent. Invalid or missing prices and unsupported per-request charges fail closed. Accounting uses the maximum listed prompt/completion tiers and ignores cache discounts. This is a conservative estimate for these text-only local-shell tasks, not a billing guarantee. The $0.50 estimated budget, 20-step limit, 240-second agent deadline and required `Submitted` completion are unchanged. The budget is checked between turns.

The committed `images/mini-swe-agent/test-pricing.py` runs during every Docker build, including CI. Offline regression checks exercised both exact model IDs through the installed LiteLLM cost calculator and Mini's own `_calculate_cost`, including a context price override and a no-override model. They rejected NaN, infinity, negative rates and nonzero per-request fees. The provider metadata in the synthetic responses matches OpenRouter responses. The selected runtime pricing is included in the actual agent receipt.

Raw redacted evidence stays under ignored `evidence/coding-agent-models-2026-11-16/`. `results-opencode-openhands-sdk.json` records eight passes; `results-mini-swe-agent.json` preserves four initial failures. Pricing-fix reruns use a separate `mini-pricing-fixed/` directory. Docker IDs are local identities, not GHCR publication digests.

## Hosted handoff

`evidence/coding-agent-models-2026-11-16/hosted-execution-mapping.json` is prepared but not executed. It maps both recipes and both model routes for each coding agent, both BrowserUse recipes against Google and OpenRouter, and both Stagehand recipes against Google. Each entry contains its trusted command, runtime credential name, explicit model settings, expected receipt path and timeout.

The coordinator must first provide a main-branch publication digest and completed retained prepared-snapshot journal. `tools/validate-model.ts` then executes each mapping on two independent restores and requires `passed: true` receipts plus confirmed cleanup. The coding command asserts a failing baseline, unchanged grading machinery, successful actual agent execution and independent 5/5 grading before writing its receipt. BrowserUse and Stagehand use their installed agent helpers and independent table/server-state assertions. Stagehand's second provider remains untested; no OpenAI credential or pass is implied.
