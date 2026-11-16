> Candidate 0.2.0: implementation in progress. Prior 0.1.0 results below apply only to that release; publication and hosted/model validation of 0.2.0 are pending.

# TypeScript AI gateway

Exercise OpenAI-compatible routing, provider fallback, bounded retries, and request cancellation against loopback fixtures.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Node 24 on Debian Bookworm, linux/amd64. `/workspace/node_modules` links to the installed dependency set, so workspace programs can use bare package imports. `tsc` is on the default PATH. Dependencies are exact-pinned in `fixture/package.json` and its lockfile: `openai@7.50.0`, `zod@4.6.7`, `typescript@7.0.2`, `@types/node@24.10.1`.

- [AI routing workbench](../../snapshots/ai-routing-workbench/README.md): Route SDK requests through a local gateway and fall back after a synthetic provider failure.
- [AI retry budget lab](../../snapshots/ai-retry-budget-lab/README.md): Retry synthetic rate limits, reject a nonretryable permission error, and cancel a stalled request.

Run `python3 scripts/check-image.py typescript-ai-gateway` from the repository root to build and exercise smoke checks plus both recipe lifecycles. Workloads run with networking disabled, 2 GB memory, 2 CPUs and a 120-second timeout per lifecycle. Loopback HTTP is used only by fixtures that need an API transport; no external service or credentials are needed.

The fixture modules are deterministic examples for development and regression tests. Prepared filesystem state contains inputs and a hash baseline, not precomputed answers or running processes. Verification reopens generated artifacts, tests corruption rejection, and regenerates outputs.

Primary API reference: [https://github.com/openai/openai-node#retries](https://github.com/openai/openai-node#retries).

Scripted responses and synthetic token counts test SDK/application behavior. They do not assess hosted model quality, provider availability, or actual billing. No model credentials are present.

## Candidate live runner

After preparing and restoring the recipe, supply the selected provider key at execution time and set `AGENT_MODEL` explicitly. Run `node /opt/render/fixtures/typescript-ai-gateway/live.ts /workspace/RECIPE/live-results`. Receipts are written separately from offline fixture results and refuse to overwrite earlier runs.

This live runner uses `OPENROUTER_API_KEY`. Run with two distinct model families and record requested/returned models, tool execution and usage. Existing loopback retry/failover fixtures are deterministic failure controls, not evidence of real upstream outages or routing.

Actual local-container model runs passed with Google and OpenAI model options for the prepared tasks; the report identifies the tested direct-provider and OpenRouter routes. See [the scoped validation report](../../docs/coding-provider-assets-validation-2026-11-16.md). These results do not establish hosted snapshot or publication success.
