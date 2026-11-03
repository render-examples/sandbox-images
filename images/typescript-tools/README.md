# TypeScript tools

A Node.js/TypeScript environment for small generated transforms and API adapter
workloads. The bundled project includes TypeScript 7.0.2, Zod 4.6.7, and Node's
built-in test runner. All npm dependencies are exact and integrity-locked.
The official Node 24 Bookworm base is pinned to its linux/amd64 manifest digest.

This image is a draft. Local checks do not establish GHCR publication, Render
image import, or snapshot restore compatibility.

## Included workload

The synthetic order transform validates unknown JSON, rejects unexpected fields
and conflicting duplicate IDs, and collapses exact duplicates. The API adapter
validates its request and response schemas, retries only HTTP 429/503 up to three
attempts, and preserves one idempotency key. An injected Fetch-compatible mock
records requests, simulates one failure, and deduplicates repeated deliveries.
No socket is opened, no DNS lookup occurs, and no provider key is needed.

Eight behavioral tests exercise input validation, transformation, duplicate
conflicts, retry limits, non-retryable errors, provider response validation, and
idempotency. The successful workload produces two orders totaling 3,250 cents,
three attempts (one failure and two successful responses), and one delivery.

The dependencies and fixture are installed at
`/opt/render/fixtures/typescript-tool-workbench`. Copy that project into a
writable workspace to modify it; its `node_modules` are already installed.
`node`, `npm`, and `tsc` are on PATH. Zod resolves within the project, not as a
global module for arbitrary scripts.

## Validate locally

From the repository root:

```sh
python3 scripts/check-image.py typescript-tools
```

This builds linux/amd64, checks the required sandbox tools, runs the image smoke
workload, and exercises the paired recipe with networking disabled, 2 CPUs,
and a 2 GB memory limit. The recipe also checks input/output corruption and
regenerates all declared artifacts after deleting them.

The smoke command writes `/workspace/image-smoke/result.json` with
`status: "passed"` only after the expected workload results are checked.

## Boundaries

This is a deterministic adapter-testing example, not a general HTTP client.
It deliberately omits wall-clock backoff and remote-provider semantics. Real
integrations need an explicit allow-list, transport cancellation/deadlines,
response-size limits, provider-specific retry policy, and runtime credentials.
The example uses a bounded guest process timeout; it makes no performance claim.
It has no browser automation, scraping, agent CLI, or paid model dependency.

The source fixture and expected results are synthetic. Keep credentials out of
images and snapshots. Private publication and live Render validation must pass
before changing the manifest's release status.

## References

- [Official Node image](https://github.com/nodejs/docker-node)
- [Zod schema parsing](https://zod.dev/basics)
- [Node 24 test runner](https://nodejs.org/docs/latest-v24.x/api/test.html)
- [npm clean installs](https://docs.npmjs.com/cli/v11/commands/npm-ci)
