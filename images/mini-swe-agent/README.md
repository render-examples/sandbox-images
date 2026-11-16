# Mini SWE agent in Render Sandboxes

The full agent and local tools run inside the sandbox. No nested Docker, Render connector, GUI or control-plane key is required.

Pinned runtime 2.4.6. Two prepared filesystem recipes: `mini-swe-typescript-issue`, `mini-swe-python-issue`. Offline checks verify the installed tool and independently graded reference repairs. Actual model execution is a separate runtime operation and remains unverified until a report records it.

Use explicit provider/model configuration with runtime-only credentials. OpenAI, Anthropic and OpenRouter routes are configurable; each claimed route requires live validation. The outer launcher has a 300-second deadline; individual tools/turns are bounded.

The candidate has not been published or validated on Render yet.
