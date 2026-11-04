# TypeScript agents

Exercise Vercel AI SDK tool execution and structured outputs with a deterministic scripted model.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Node 24 on Debian Bookworm, linux/amd64. `/workspace/node_modules` links to the installed dependency set, so workspace programs can use bare package imports. `tsc` is on the default PATH. Dependencies are exact-pinned in `fixture/package.json` and its lockfile: `ai@7.0.162`, `@ai-sdk/openai@4.0.108`, `zod@4.6.7`, `typescript@7.0.2`, `@types/node@24.10.1`.

- [Agent tool loop](../../snapshots/agent-tool-loop/README.md): Run a real AI SDK tool loop, calculate an invoice, pass the result into the next model step, and verify the trace.
- [Agent structured output](../../snapshots/agent-structured-output/README.md): Validate a typed invoice through AI SDK Output.object; reject schema-invalid and malformed model output.

Run `python3 scripts/check-image.py typescript-agents` from the repository root to build and exercise smoke checks plus both recipe lifecycles. Workloads run with networking disabled, 2 GB memory, 2 CPUs and a 120-second timeout per lifecycle. Loopback HTTP is used only by fixtures that need an API transport; no external service or credentials are needed.

The fixture modules are deterministic examples for development and regression tests. Prepared filesystem state contains inputs and a hash baseline, not precomputed answers or running processes. Verification reopens generated artifacts, tests corruption rejection, and regenerates outputs.

Primary API reference: [https://ai-sdk.dev/docs/ai-sdk-core/testing](https://ai-sdk.dev/docs/ai-sdk-core/testing).

Scripted responses and synthetic token counts test SDK/application behavior. They do not assess hosted model quality, provider availability, or actual billing. No model credentials are present.
