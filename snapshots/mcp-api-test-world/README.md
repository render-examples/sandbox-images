# MCP and API test world

A filesystem snapshot recipe for [`integration-test`](../../images/integration-test). It prepares a small Python/TypeScript project with installed, locked dependencies and synthetic local integrations. It captures files only. HTTP listeners and MCP subprocesses are started and stopped for every workload; no running process or bound port is expected to survive a snapshot restore.

The runner uploads only `recipe.sh` and `recipe.mjs` as ordinary mode-0600 files. Invoke the shell explicitly:

```sh
bash recipe.sh prepare
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

`prepare` accepts an already-created `/workspace/mcp-api-test-world` upload directory. It copies source and dependencies into `project/`, writes a hash baseline, and leaves no compiled project, outputs, sockets, or servers. It refuses to overwrite existing prepared state.

`analyze` compiles the TypeScript fixture and runs both clients against a real SDK MCP stdio server and a loopback HTTP mock. It checks 12 cases per client: initialization, discovery, successful and invalid tool calls, missing tool, retry success and exhaustion, nonretryable failure, response schema rejection, timeout, webhook deduplication, and conflicting idempotency-key reuse. No external network or credentials are needed.

`verify` compares the baseline and source hashes with the bundled originals, independently checks exact client and server results, verifies output hashes, and reruns the workload. Any failed command removes the prior success receipt. `test` corrupts six independent inputs/results, requires rejection and receipt invalidation, restores them, and regenerates all outputs from scratch.

Expected output in `/workspace/output`:

| File | Meaning |
| --- | --- |
| `summary.json` | Two clients, 24 checks, 24 HTTP requests, two deliveries, two duplicates, two conflicts, two timeouts, and MCP total 3250 cents |
| `clients.json` | Ordered checks performed by each client |
| `server.json` | Independent HTTP request and side-effect counts for each client |
| `verification.json` | Passing summary and SHA-256 hashes of the three result files |

This is a deliberately small deterministic integration playground. It checks integration behavior, not the quality of an agent or the security of an arbitrary external MCP server. Only local filesystem preparation/restoration can be checked before publication; a Render capture and fresh sandbox restore remain separate live verification steps. Draft 0.1.0 source revision and image digest remain unset until publication.
