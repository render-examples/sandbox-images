# Ragas retrieval evaluation image

Pinned Ragas 0.4.4 and RapidFuzz with hash-locked Python dependencies. No embedding model or vector service is required for the bundled frozen retrieval experiment.

## Prepared snapshots

- `ragas-rag-quality`: context precision, context recall and exact answer matching over correct, noisy and missing evidence.
- `ragas-retrieval-ablations`: compare the same reference context with clean, noise-first and missing-context retrieval variants.

These use Ragas' real non-LLM metrics. Independent Python calculations verify each value, including rank-sensitive precision. Scores are fixture results, not claims about a retrieval model. The pinned legacy non-LLM metric API emits deprecation notices; no direct replacement existed in the checked version.

## Optional judge evaluation

`judge.py` separately runs Ragas Faithfulness against real OpenAI or OpenRouter routes. Provide an input JSON array with `id`, `question`, `response`, and `retrieved` (a list of context strings). Credentials enter only at run time.

```sh
timeout -k 5 300 python /opt/render/fixtures/ragas/judge.py \
  --provider openrouter --model SELECT_MODEL \
  --cases /workspace/judge-cases.json --output /workspace/ragas-judge.json
```

Use `--provider openai` and `OPENAI_API_KEY`, or `--provider openrouter` and `OPENROUTER_API_KEY`. Each case has a 120-second bound; API requests use 60-second timeouts and one retry. The output must be new. Errors are retained by type; a partial run exits nonzero. Judge scores are separate from deterministic retrieval assertions and require their own live validation.

## Acceptance and release

`python3 scripts/check-image.py ragas` checks both prepared recipes offline, including corruption and independent clean-container filesystem restores. The image and recipes remain draft/unverified until immutable publication and actual Render evidence are recorded.

Sources: [Ragas context precision](https://docs.ragas.io/en/latest/concepts/metrics/available_metrics/context_precision/), [Ragas 0.4.4](https://pypi.org/project/ragas/0.4.4/).
