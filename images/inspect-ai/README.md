# Inspect AI evaluation image

Pinned Inspect AI 0.3.290 with OpenAI and Anthropic provider clients. Other Inspect providers can be configured only when their dependencies are installed and tested. The image runs the evaluator inside one Render sandbox; a host-side per-sample Render sandbox adapter is a separate integration.

## Prepared snapshots

- `inspect-coding-samples`: three frozen programming-result questions, with two correct mocked outputs and one deliberate failure.
- `inspect-tool-use-samples`: three tool-selection questions, including a prohibited selection. This fixture scores selected tool names; it does not claim real tool execution.

The actual Inspect task, generation and exact-match scorer pipeline executes offline. Mock outputs explicitly carry synthetic token usage to avoid tokenization downloads; these values are not usage measurements. No provider authentication occurs in catalog checks.

## Real provider evaluation

After recipe preparation, run inside the sandbox, supplying the chosen provider credential at execution time:

```sh
timeout -k 5 300 python /opt/render/fixtures/inspect-ai/live.py \
  /workspace/inspect-coding-samples/input/samples.json \
  --model openai/SELECT_MODEL --output /workspace/inspect-live-openai
```

Use `anthropic/SELECT_MODEL` with `ANTHROPIC_API_KEY` for a second route. Use `openrouter/PROVIDER/MODEL` with `OPENROUTER_API_KEY` for the installed OpenRouter route; this uses the bundled OpenAI-compatible client. Validate each selected route separately. The runner refuses mock providers, retains all sample statuses/errors, requests at most 128 output tokens per sample, one concurrent sample, one retry and a 120-second sample limit. It records returned model identity and usage. A wrong answer stays a scored failure; a missing sample fails execution.

## Acceptance and release

`python3 scripts/check-image.py inspect-ai` builds linux/amd64 and runs smoke, both recipes, corruption rejection, output regeneration and clean-container filesystem restores with networking disabled. Manifests remain draft/unverified until actual Render capture/restore evidence and publication digests are recorded. Local evaluation is not proof of model quality.

Sources: [Inspect models](https://inspect.aisi.org.uk/models.html), [task/scorer documentation](https://inspect.aisi.org.uk/scorers.html), [pinned package](https://pypi.org/project/inspect-ai/0.3.290/).
