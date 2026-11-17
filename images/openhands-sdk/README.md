# OpenHands SDK in Render Sandboxes

The full agent and local tools run inside the sandbox. No nested Docker, Render connector, GUI or control-plane key is required.

Pinned runtime 1.62.0. Two prepared filesystem recipes: `openhands-typescript-repair`, `openhands-python-repair`. Offline checks verify the installed tool and independently graded reference repairs. Actual local-container model runs passed all four cells: both recipes with OpenRouter `google/gemini-4-hydrogen` and `openai/gpt-6.1-terra`. See the [dated model report](../../docs/coding-agent-model-validation-2026-11-16.md) for independent grading evidence. A local model pass does not establish hosted Render capture/restore.

Use explicit provider/model configuration with runtime-only credentials. OpenAI, Anthropic and OpenRouter routes are configurable; each claimed route requires live validation. The outer launcher has a 300-second deadline; individual tools/turns are bounded.

The candidate has not been published or validated on Render yet.

The image uses LiteLLM 1.105.7+render.1 with a dependency-metadata patch for filelock 4.2.10. See [security patches](../../docs/security.md#dependency-metadata-patches).
