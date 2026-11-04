# TypeScript AI gateway

Exercise OpenAI-compatible routing, provider fallback, bounded retries, and request cancellation against loopback fixtures.

Node 24 on Debian Bookworm, linux/amd64. `/workspace/node_modules` links to the installed dependency set, so workspace programs can use bare package imports. `tsc` is on the default PATH. Dependencies are exact-pinned in `fixture/package.json` and its lockfile: `openai@7.50.0`, `zod@4.6.7`, `typescript@7.0.2`, `@types/node@24.10.1`.

- [AI routing workbench](../../snapshots/ai-routing-workbench/README.md): Route SDK requests through a local gateway and fall back after a synthetic provider failure.
- [AI retry budget lab](../../snapshots/ai-retry-budget-lab/README.md): Retry synthetic rate limits, reject a nonretryable permission error, and cancel a stalled request.

Run `python3 scripts/check-image.py typescript-ai-gateway` from the repository root to build and exercise smoke checks plus both recipe lifecycles. Workloads run with networking disabled, 2 GB memory, 2 CPUs and a 120-second timeout per lifecycle. Loopback HTTP is used only by fixtures that need an API transport; no external service or credentials are needed.

The fixture modules are deterministic examples for development and regression tests. Prepared filesystem state contains inputs and a hash baseline, not precomputed answers or running processes. Verification reopens generated artifacts, tests corruption rejection, and regenerates outputs.

This image remains draft and Render-unverified. Local checks do not publish a GHCR image or create a Render snapshot. A usable remote snapshot requires image publication/import, preparation, capture and restore validation in the target Render group.

Primary API reference: [https://github.com/openai/openai-node#retries](https://github.com/openai/openai-node#retries).

Scripted responses and synthetic token counts test SDK/application behavior. They do not assess hosted model quality, provider availability, or actual billing. No model credentials are present.
