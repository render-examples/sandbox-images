# DeepEval regression evaluation image

Pinned DeepEval 4.3.4 with hash-locked dependencies. The offline workload invokes real DeepEval metrics and compares their scores against independent assertions.

## Prepared snapshots

- `deepeval-tool-correctness`: exact ordered tool-call matching, including argument/output equality, with wrong-path and extra-tool negative controls.
- `deepeval-answer-regression`: exact output comparison with wrong and missing-value controls.

DeepEval's current tool metric initializes a judge interface even for deterministic exact matching. The offline fixture supplies a fail-closed `NoNetworkModel`: any generation request fails the check. It does not return synthetic judge decisions. `include_reason=False`, no available-tools selection judge, and exact matching keep acceptance deterministic. The answer fixture uses the built-in `ExactMatchMetric`.

## Optional real judge

`judge.py` uses GEval and a real OpenAI-compatible client for OpenAI or OpenRouter. Supply JSON rows with `id`, `question`, `response`, and `reference`.

```sh
timeout -k 5 300 python /opt/render/fixtures/deepeval/judge.py \
  --provider openrouter --model SELECT_MODEL \
  --cases /workspace/judge-cases.json --output /workspace/deepeval-judge.json
```

Use runtime `OPENROUTER_API_KEY`, or choose `--provider openai` with `OPENAI_API_KEY`. Requests have 60-second timeouts, one retry and at most 1,024 output tokens. Record actual returned identities/usage separately from requested models. Invalid structured responses and other failures remain in the receipt and cause nonzero exit. Wrap the entire operation with the shown guest timeout.

## Acceptance and release

`python3 scripts/check-image.py deepeval` builds and checks both recipes without networking, including semantic assertions, corruption rejection, regeneration and fresh-container filesystem restore. Published digests and actual Render/live judge evidence remain required before release readiness.

Sources: [Tool Correctness](https://deepeval.com/docs/metrics-tool-correctness), [DeepEval source](https://github.com/confident-ai/deepeval), [DeepEval 4.3.4](https://pypi.org/project/deepeval/4.3.4/).
