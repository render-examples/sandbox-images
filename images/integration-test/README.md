# Python and TypeScript integration testing

A combined Node.js 24 / Python 3.13.18 image for testing agent tool and API integrations without credentials or external services. TypeScript 7.0.2, the official MCP TypeScript SDK 1.32.2, and Zod 4.6.7 are installed from an integrity-locked npm dependency graph. Both official runtime stages are pinned by digest and use Debian Bookworm. `node`, `npm`, `tsc`, `python`, and `python3` are available on Render's default execution PATH.

The bundled fixture is at `/opt/render/fixtures/mcp-api-test-world`. It contains an official SDK MCP stdio server, an official SDK TypeScript client, a small Python standard-library JSON-RPC client, and a loopback HTTP server. The Python client demonstrates this bounded fixture protocol; it is not a general-purpose MCP SDK.

Each client makes real requests and checks:

- MCP initialization, tool discovery, a successful typed tool call, invalid input, and an unknown tool.
- A transient HTTP failure that succeeds on attempt three, an exhausted three-attempt retry budget, and a nonretryable authentication error.
- Rejection of a malformed response and cancellation of a request that never receives a response.
- Webhook delivery, duplicate suppression with the same idempotency key, and rejection when that key is reused with different content.

The HTTP server independently counts requests and side effects. Both clients together must produce 24 passing checks, 24 HTTP requests, two deliveries, two duplicates, two conflicts, and two timeouts. All amounts and identities are synthetic. No model, provider key, browser, scraping, or external API is involved.

```sh
python3 scripts/check-image.py integration-test
```

The checker builds linux/amd64, verifies default-PATH tools, runs the image smoke test and the linked [`mcp-api-test-world`](../../snapshots/mcp-api-test-world) recipe with Docker networking disabled. Python shared-library imports and every copied extension's `ldd` dependencies are checked during the build; the required Tcl/Tk runtime packages are version-pinned. All fixture servers and clients are started for each workload and stopped before it returns, including failure and termination paths.

Version 0.1.0 is privately published and passed live Render image import, prepared filesystem capture and fresh restore validation. See the [evidence report](../../docs/integration-validation-2026-11-04.md). The release remains draft pending public distribution.

Protocol references: [MCP lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle), [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), and [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk). This fixture uses the SDK's stable 1.x APIs.
