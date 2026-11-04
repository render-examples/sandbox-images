# Integration image publication and live validation

Integration-test 0.1.0 is privately published and passed live Render import, image smoke, prepared filesystem capture, source workload, fresh restore and output verification with mcp-api-test-world 0.1.0. Release statuses remain draft pending public distribution.

## Provenance

Image, recipe inputs and host runner used commit `a53eaa4ace95b7a9b9c29a6a2a2bdf141a855808` on linux/amd64. The downloaded OCI manifest hash matches the published digest, and its configuration digest matches the tested-build receipt. Package visibility was independently confirmed private.

The live checks used `@renderinc/sdk@1.6.0`, plan `1c-2g`, deny-all egress, a 900-second runtime limit and a 300-second idle timeout. Snapshot kind was explicitly filesystem. Credentials stayed on the host and image-import API.

## Results

- Image: `ghcr.io/render-examples/sandbox-integration-test:0.1.0`
- Digest: `sha256:9c5708c9efc526699d080b1384546f0e8d50bfdc7629ed6ad318810f4dacc299`
- Configuration: `sha256:6cb78ba7f79ce221bbae04a75aeacc925c94c4371c8561bf4e530452ea89bf77`
- Publication: [Run 41816808283](https://github.com/render-examples/sandbox-images/actions/runs/41816808283)
- Started `2026-11-04T10:53:20.037Z`; completed `2026-11-04T10:55:59.726Z`.
- Image smoke: `{"status":"passed","clients":2,"checksPassed":24,"mcpTotalCents":3250,"httpRequests":24,"deliveries":2,"duplicates":2,"conflicts":2,"timeouts":2}`
- Restored result: `{"clients":2,"checksPassed":24,"mcpTotalCents":3250,"httpRequests":24,"deliveries":2,"duplicates":2,"conflicts":2,"timeouts":2}`

Recipe SHA-256 hashes:

- `recipe.sh`: `04656471e5764ecb07eb73ee9c7a408e3c48c05e1c2f097d368cbe8d3d486e17`
- `recipe.mjs`: `656f96e39d2e4403a78cd9f06959a3c67206ff9abe01c14526aff95fb155dbe2`

Downloaded artifact SHA-256 hashes:

- `summary.json`: `9327ca9396681a28f89521e679510bda2c6c2390b76be91805cef5f167c1067b`
- `clients.json`: `23b49050b3e798f949d289ed3af0c56388bb1fc2c6a047de6cf89019a6d44798`
- `server.json`: `02bafc296aaa59ee2fb19416fe24b8ec5039ae9a62828e9a4b8e362f2f6bb6bf`

Cleanup independently confirmed at `2026-11-04T10:56:31.860Z`: source and restored sandboxes terminated, snapshot deleted (typed not-found response), and imported image digest matched. The imported image remains available in its sandbox group.

## Scope

The prepared project contains locked dependencies and synthetic Python/TypeScript integration fixtures. Filesystem capture occurs before compilation or workload outputs. After restore, both clients start fresh MCP and loopback HTTP processes, verify 24 checks covering tool calls, schemas, retries, deadlines and webhook idempotency, and stop them. Baseline hashes and absent outputs were checked before execution.

These are deterministic functional checks, not an agent-quality assessment, a performance benchmark or a security evaluation of arbitrary MCP servers. Workspace, group and resource identifiers remain in ignored local journals. Recipes create snapshots in the caller's group; the registry does not distribute portable snapshot IDs.
