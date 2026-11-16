# Goose in Render Sandboxes

The full agent and local tools run inside the sandbox. No nested Docker, Render connector, GUI or control-plane key is required.

Pinned runtime 1.59.2. Two prepared filesystem recipes: `goose-repo-repair`, `goose-mcp-workspace`. Offline checks verify the installed tool and independently graded reference repairs. Actual model execution is a separate runtime operation and remains unverified until a report records it.

Use explicit provider/model configuration with runtime-only credentials. OpenAI, Anthropic and OpenRouter routes are configurable; each claimed route requires live validation. The outer launcher has a 300-second deadline; individual tools/turns are bounded.

The candidate has not been published or validated on Render yet.

Run `node /opt/render/fixtures/goose/live.ts /workspace/RECIPE` with explicit `AGENT_PROVIDER` and `AGENT_MODEL` to invoke the actual CLI and independently grade its output. The MCP recipe additionally requires a recorded local tool invocation and exact invoice artifact. Failure receipts are retained separately from the offline reference results.

Actual local-container model runs passed with Google and OpenAI model options for the prepared tasks; the report identifies the tested direct-provider and OpenRouter routes. See [the scoped validation report](../../docs/coding-provider-assets-validation-2026-11-16.md). These results do not establish hosted snapshot or publication success.
