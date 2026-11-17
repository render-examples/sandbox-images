# Stagehand local browser sandbox

Stagehand 4.4.0 with matching Zod 4.6.6, Playwright 1.65.1 and its Chromium binary. The current v4 `localBrowser.launch` and `Stagehand.create` APIs run a local browser inside the sandbox. No Browserbase browser or nested Render sandbox is provisioned.

Offline acceptance starts the actual Stagehand browser runtime, submits a form through deterministic selectors, extracts table data and decodes a screenshot. Independent server state proves the submission occurred. This is explicitly `modelInvoked: false`; it is not an agent-model test.

The authenticated launcher consumes an already prepared recipe root and supports OpenAI or Google. Supply the selected model ID and corresponding `OPENAI_API_KEY` or `GOOGLE_API_KEY` (`GEMINI_API_KEY` accepted) only at execution time:

```sh
timeout -k 5 180 node /opt/render/fixtures/stagehand/run-agent.ts /workspace/stagehand-browser-actions openai MODEL_ID
timeout -k 5 180 node /opt/render/fixtures/stagehand/run-agent.ts /workspace/stagehand-structured-extraction google MODEL_ID
```

The launcher uses real `act` and schema-checked `extract`, verifies application state and known table values, writes a screenshot and records returned result/usage metadata under the recipe root's `live-PROVIDER` directory. It refuses to overwrite prior evidence. Use a separate restored sandbox for each model route. Shell timeout and sandbox cleanup are still required if a process is interrupted. No credentials belong in the image or captured filesystem.

Both recipes prepare the order app fixture. `browser-actions` is the action starting point; `structured-extraction` is the schema extraction starting point. For custom automation import dependencies from `/workspace/node_modules`. Model calls require selected-provider network access; offline checks use deny-all except loopback.

```sh
python3 scripts/check-image.py stagehand
```

Strict type checking and full local Docker smoke, both recipe corruption/regeneration and fresh-container restore checks passed on 2026-11-16. Authenticated routes, internal publication and live Render capture/restore are pending. Manifests remain draft/unverified.

[Stagehand v4 quickstart](https://docs.stagehand.dev/v4/first-steps/quickstart) · [Official package](https://www.npmjs.com/package/@browserbasehq/stagehand/v/4.4.0)
