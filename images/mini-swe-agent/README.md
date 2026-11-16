# Mini SWE agent in Render Sandboxes

The full agent and local tools run inside the sandbox. No nested Docker, Render connector, GUI or control-plane key is required.

Pinned runtime 2.4.6. Two prepared filesystem recipes: `mini-swe-typescript-issue`, `mini-swe-python-issue`. Offline checks verify the installed tool and independently graded reference repairs. Actual model execution is a separate runtime operation; current per-model results are recorded in the [dated local model report](../../docs/coding-agent-model-validation-2026-11-16.md). A local model pass does not establish hosted Render capture/restore.

Use explicit provider/model configuration with runtime-only credentials. OpenAI, Anthropic and OpenRouter routes are configurable; each claimed route requires live validation. The outer launcher has a 300-second deadline; individual tools/turns are bounded.

OpenRouter runs fetch the selected model's current text-token rates from the [official model catalog](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties) without sending a key. The launcher registers conservative maximum listed token rates with LiteLLM; cache discounts are ignored. Missing, invalid or unsupported per-request pricing stops the run. Default cost-error enforcement stays enabled with a $0.50 estimated budget, 20 steps and 240 seconds. The budget is checked between turns, so it is not a hard provider billing ceiling.

The candidate has not been published or validated on Render yet.
