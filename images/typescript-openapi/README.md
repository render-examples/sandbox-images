# TypeScript OpenAPI tools

Generate policy-restricted AI tool schemas and compile a typed client from a validated OpenAPI contract.

Node 24 on Debian Bookworm, linux/amd64. `/workspace/node_modules` links to the installed dependency set, so workspace programs can use bare package imports. `tsc` is on the default PATH. Dependencies are exact-pinned in `fixture/package.json` and its lockfile: `openapi-typescript@7.13.0`, `@apidevtools/swagger-parser@13.1.0`, `ajv@8.20.0`, `typescript@5.9.3`, `@types/node@24.10.1`.

- [OpenAPI tool contracts](../../snapshots/openapi-tool-contracts/README.md): Allowlist read-only operations as AI tools and reject missing, malformed, or unexpected arguments.
- [OpenAPI tool client](../../snapshots/openapi-tool-client/README.md): Generate TypeScript definitions, compile a client, reject an incompatible response type, and exercise a loopback API.

Run `python3 scripts/check-image.py typescript-openapi` from the repository root to build and exercise smoke checks plus both recipe lifecycles. Workloads run with networking disabled, 2 GB memory, 2 CPUs and a 120-second timeout per lifecycle. Loopback HTTP is used only by fixtures that need an API transport; no external service or credentials are needed.

The fixture modules are deterministic examples for development and regression tests. Prepared filesystem state contains inputs and a hash baseline, not precomputed answers or running processes. Verification reopens generated artifacts, tests corruption rejection, and regenerates outputs.

This image remains draft and Render-unverified. Local checks do not publish a GHCR image or create a Render snapshot. A usable remote snapshot requires image publication/import, preparation, capture and restore validation in the target Render group.

Primary API reference: [https://openapi-ts.dev/node](https://openapi-ts.dev/node).

The adapter supports the bundled OpenAPI 3.0 parameter-based example and an explicit method allowlist. It is not a general-purpose converter for every OpenAPI feature. TypeScript 5.9.3 matches the generator peer dependency.
