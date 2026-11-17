# Browser Use local browser sandbox

Browser Use 1.0.5+render.1 (dependency metadata patched for Pillow 13), browser-harness 0.1.13+render.1, Playwright 1.65.2 and matching local Chromium. Browser Use 1.0 defaults to a cloud browser; this image explicitly uses `Browser('chromium', ...)` so the browser runs inside the Render sandbox. No Browser Use Cloud key is required.

Offline acceptance starts Browser Use and its real browser-harness daemon, drives the synthetic app deterministically, verifies server-side form submissions and table values, and decodes the screenshot. It reports `modelInvoked: false` separately from browser execution.

The authenticated launcher runs the actual Browser Use agent with a bounded 12-step/180-second budget and supports OpenAI, Google and OpenRouter. Supply only the chosen provider key and model ID at runtime:

```sh
timeout -k 5 240 python /opt/render/fixtures/browser-use/run-agent.py /workspace/browser-use-form-task openai MODEL_ID
timeout -k 5 240 python /opt/render/fixtures/browser-use/run-agent.py /workspace/browser-use-table-extraction google MODEL_ID
timeout -k 5 240 python /opt/render/fixtures/browser-use/run-agent.py /workspace/browser-use-table-extraction openrouter MODEL_ID
```

Keys: `OPENAI_API_KEY`, `GOOGLE_API_KEY` (or `GEMINI_API_KEY`), `OPENROUTER_API_KEY`. Model inference requires selected-provider egress. The browser itself is limited to the local fixture. The launcher independently checks submitted app state and typed table output, decodes a screenshot, records a receipt and closes its browser. Use fresh restores per route; live evidence directories cannot be overwritten. Never capture provider credentials.

`browser-use-form-task` and `browser-use-table-extraction` prepare the same order fixture as starting points for action and extraction tasks. Runtime outputs are under `/workspace/output`; model-run evidence is under the prepared root's `live-PROVIDER` directory. Filesystem restores restart processes.

```sh
python3 scripts/check-image.py browser-use
```

Publication, container/hosted validation and model-route status are recorded separately in `docs/browser-data-assets-validation-2026-11-16.md`; no authenticated model pass is claimed by these source files. Manifests remain draft/unverified.

[Browser Use 1.0 parameters](https://docs.browser-use.com/open-source/all-parameters) · [Models](https://docs.browser-use.com/open-source/models)
