# TypeScript AI interfaces

Build React chat and approval interfaces with Vite; test streamed text, escaping, and tool actions in jsdom.

Node 24 on Debian Bookworm, linux/amd64. `/workspace/node_modules` links to the installed dependency set, so workspace programs can use bare package imports. `tsc` is on the default PATH. Dependencies are exact-pinned in `fixture/package.json` and its lockfile: `react@19.3.1`, `react-dom@19.3.1`, `vite@8.3.5`, `jsdom@30.1.3`, `typescript@7.0.2`, `@types/node@24.10.1`.

- [Chat stream workbench](../../snapshots/chat-stream-workbench/README.md): Decode UTF-8 text across stream boundaries, render incremental React updates, and verify accessible escaped SSR markup.
- [Tool card workbench](../../snapshots/tool-card-workbench/README.md): Test explicit approval and rejection, duplicate-execution prevention, and escaped SSR output for AI tool cards.

Run `python3 scripts/check-image.py typescript-ai-ui` from the repository root to build and exercise smoke checks plus both recipe lifecycles. Workloads run with networking disabled, 2 GB memory, 2 CPUs and a 120-second timeout per lifecycle. Loopback HTTP is used only by fixtures that need an API transport; no external service or credentials are needed.

The fixture modules are deterministic examples for development and regression tests. Prepared filesystem state contains inputs and a hash baseline, not precomputed answers or running processes. Verification reopens generated artifacts, tests corruption rejection, and regenerates outputs.

This image remains draft and Render-unverified. Local checks do not publish a GHCR image or create a Render snapshot. A usable remote snapshot requires image publication/import, preparation, capture and restore validation in the target Render group.

Primary API reference: [https://vite.dev/guide/api-javascript.html](https://vite.dev/guide/api-javascript.html).

React tests use jsdom, DOM events and server rendering. No browser, Playwright, scraping or hosted model is involved. Vite compiles the same React components into an exported JavaScript artifact.
