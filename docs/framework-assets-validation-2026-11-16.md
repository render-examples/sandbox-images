# Framework asset validation — November 16, 2026

This report covers five candidate images and ten filesystem recipes. They remain draft/unverified until publication and hosted evidence are recorded. These assets run the full agent application inside the existing sandbox; they do not create nested Render sandboxes or replace the independent connector workstreams.

| Image | Recipes | Local source checks | Container checks | Hosted / authenticated |
| --- | --- | --- | --- | --- |
| langchain-agent | langchain-repo-repair; langchain-data-analysis | Strict TypeScript build, both workload/corruption checks, Python graph and 707-case independent grader passed | Passed: final image including TS/Python smoke, both native recipes, corruption/regeneration and fresh-container restores | Local authenticated 8/8 passed; hosted pending |
| mastra-agent | mastra-repo-repair; mastra-invoice-analysis | Strict TypeScript build and both workload/corruption checks passed | Passed: final image, both recipes, corruption/regeneration and fresh-container restores | Local authenticated 4/4 passed; hosted pending |
| pydantic-ai | pydantic-typed-analysis; pydantic-artifact-validation | Actual Pydantic AI TestModel tool loop, typed result, invalid-schema rejection and corruption checks passed | Passed: image, both recipes, corruption/regeneration and fresh-container restores | Local authenticated 2/2 smokes passed; hosted pending |
| smolagents | smolagents-data-analysis; smolagents-code-repair | Actual CodeAgent scripted execution, persistent Python state across steps, independent invoice/707-case code checks and corruption rejection passed | Passed: image, both recipes, corruption/regeneration and fresh-container restores | Local authenticated 2/2 smokes passed; hosted pending |
| dspy | dspy-heldout-classification; dspy-structured-extraction | Actual DSPy program/typed signature execution with DummyLM, train-only few-shot compilation, held-out scoring and corruption checks passed | Passed: image, both recipes, corruption/regeneration and fresh-container restores | Local authenticated 2/2 smokes passed; hosted pending |

## Evidence boundaries

Local checks above use pinned installed packages on macOS and scripted models or reference repairs. They prove actual framework execution and output verification, not authenticated model behavior. The source manifests intentionally contain null source/image release pins and unverified hosted status until those facts exist.

The standard image checker builds Linux/amd64, runs offline smoke and recipe checks, deliberately corrupts inputs/baselines/artifacts, and restores prepared files into fresh containers. That establishes container filesystem behavior only. Render import, capture/restore, model execution after restore and cleanup are separate gates.

All agent launchers require an explicit provider and model. OpenAI, Anthropic and OpenRouter configuration paths are included; supported configuration is not a claim that every model was tested. Keys are runtime-only and the control-plane Render key is never passed to the guest.

## Runtime commands

TypeScript LangChain and Mastra:

```sh
timeout -k 5 240 node /opt/render/fixtures/IMAGE/dist/run-agent.js /workspace/RECIPE openrouter "$MODEL_ID"
```

Python LangChain:

```sh
timeout -k 5 240 /opt/render/python/bin/python /opt/render/fixtures/langchain-agent/run_agent.py /workspace/RECIPE openrouter "$MODEL_ID"
```

Other Python images:

```sh
timeout -k 5 240 python /opt/render/fixtures/IMAGE/workload.py /workspace/RECIPE openrouter "$MODEL_ID"
```

Use a fresh restore for each run. Inspect `agent-result.json` (or `agent-result-python.json`). Pricing candidates must pass an independent 707-case oracle; invoice artifacts must equal the independently calculated result. DSPy records actual held-out accuracy and makes no improvement promise.

## Current pins

- TypeScript Deep Agents 1.16.5; LangChain 1.6.6; core 1.4.1; OpenAI adapter 1.8.4; Anthropic adapter 1.6.5.
- Python Deep Agents 0.7.38; OpenAI adapter 1.8.0; Anthropic adapter 1.7.10.
- Mastra core 1.83.0; Pydantic AI slim 2.68.0; smolagents 1.26.0; DSPy 3.5.0.
- Complete npm integrity locks and Python hash locks are checked in. Official Node/Python base images are digest-pinned.

Official registry metadata and installed API definitions were inspected during implementation. Upstream links are recorded in each image README. A later release/evidence commit must record the checked input revision, published OCI digest and hosted report without retroactively labeling these source checks as live validation.

Constructor-only checks also passed for configured DSPy/smolagents OpenAI, Anthropic and OpenRouter routes and the Pydantic OpenRouter adapter. Dummy credentials were used without API requests; these are not authenticated provider results.

## Mastra authenticated local-container matrix

All four runs used immutable local image ID `sha256:e6c93dc1cfbb225f8fc3a2adc71833b34b075dbcf6d014fac8fb59439100fe4f`. Each run started a fresh disposable container, prepared the task without credentials in its files, then injected only the OpenRouter credential at execution time. All containers were removed by Docker after completion. These runs **did not capture or restore a Render snapshot**.

| Recipe | Requested and returned model through OpenRouter | Independent result | Elapsed |
| --- | --- | --- | --- |
| mastra-invoice-analysis | google/gemini-4-hydrogen | 3250 USD cents; 4 agent steps; 2961 tokens | 8.76 s |
| mastra-repo-repair | google/gemini-4-hydrogen | 707 pricing cases passed; 6 agent steps; 9856 tokens | 17.55 s |
| mastra-invoice-analysis | openai/gpt-6.1-terra | 3250 USD cents; 4 agent steps; 1933 tokens | 11.90 s |
| mastra-repo-repair | openai/gpt-6.1-terra | 707 pricing cases passed; 5 agent steps; 3389 tokens | 19.23 s |

Raw sanitized receipts remain in ignored local `evidence/framework-models-2026-11-16/`. Direct OpenAI/Anthropic endpoints were not exercised. Model routing compatibility is scoped to these actual returned identities, image and tasks. The durations are observed local runs, not a sandbox startup or performance claim.

## LangChain authenticated local-container matrix

All eight runs passed against immutable local image ID `sha256:6896dabd3a7249b3919107d9f96713214012da1337bb5619dfb0043b561320c4`. Both TypeScript and Python executed the actual Deep Agents application against local guest files. Requested and returned model identities matched in every run. Each run used a fresh container; this remains separate from hosted snapshot restoration.

| Recipe | Language | Model through OpenRouter | Independent result | Elapsed |
| --- | --- | --- | --- | --- |
| langchain-data-analysis | python | google/gemini-4-hydrogen | 3250 USD cents | 10.87 s |
| langchain-data-analysis | typescript | google/gemini-4-hydrogen | 3250 USD cents | 9.66 s |
| langchain-data-analysis | python | openai/gpt-6.1-terra | 3250 USD cents | 14.02 s |
| langchain-data-analysis | typescript | openai/gpt-6.1-terra | 3250 USD cents | 10.12 s |
| langchain-repo-repair | python | google/gemini-4-hydrogen | 707 pricing cases | 34.80 s |
| langchain-repo-repair | typescript | google/gemini-4-hydrogen | 707 pricing cases | 20.62 s |
| langchain-repo-repair | python | openai/gpt-6.1-terra | 707 pricing cases | 21.73 s |
| langchain-repo-repair | typescript | openai/gpt-6.1-terra | 707 pricing cases | 17.70 s |

## Checked local image identities

These are Docker checked image/config identities, not GHCR publication receipts.

| Image | Checked image ID |
| --- | --- |
| langchain-agent | `sha256:6896dabd3a7249b3919107d9f96713214012da1337bb5619dfb0043b561320c4` |
| mastra-agent | `sha256:e6c93dc1cfbb225f8fc3a2adc71833b34b075dbcf6d014fac8fb59439100fe4f` |
| pydantic-ai | `sha256:053a4e8251a969216ee9c145c9a79b6ea1a4855addea44af7f5c77735177dfb3` |
| smolagents | `sha256:48ca225c8fec6ef0f7d5873ca8dbe404ab7f0270f816c759791780c828c47925` |
| dspy | `sha256:595eaee4ae3fd074b6ae1551eb4cc52ebc18a355e4f16513cc1cddb3e551846d` |

## Additional authenticated local-container smokes

The following six bounded runs passed on their checked images. They cover both recipes and both requested model families per image, with only the specific pairings below tested. They are not a full cross-product matrix, direct-provider test, hosted snapshot test or benchmark. These three launchers record the requested model; unlike the LangChain/Mastra receipts, they do not separately expose the response model identity.

| Image / recipe | Requested model through OpenRouter | Independent result | Elapsed |
| --- | --- | --- | --- |
| pydantic-ai / pydantic-artifact-validation | openai/gpt-6.1-terra | 3250 USD cents | 10.72 s |
| pydantic-ai / pydantic-typed-analysis | google/gemini-4-hydrogen | 3250 USD cents | 6.29 s |
| smolagents / smolagents-code-repair | openai/gpt-6.1-terra | 707 pricing cases passed | 27.59 s |
| smolagents / smolagents-data-analysis | google/gemini-4-hydrogen | 3250 USD cents | 34.26 s |
| dspy / dspy-heldout-classification | google/gemini-4-hydrogen | 4/4 held-out labels correct; observed score 1.0 | 7.62 s |
| dspy / dspy-structured-extraction | openai/gpt-6.1-terra | 3250 USD cents | 4.70 s |

Overall authenticated local coverage: **18/18 runs passed** (LangChain 8, Mastra 4, Pydantic 2, smolagents 2, DSPy 2). No claims about hosted Render snapshots or public distribution follow from these results.

## Local image footprint

These are Docker-reported image sizes, not measured registry transfer sizes or writable snapshot sizes. Native acceptance used Linux/amd64 containers capped at 2 CPUs and 2 GiB RAM, with networking disabled.

| Image | Bytes | MiB |
| --- | ---: | ---: |
| langchain-agent | 501672924 | 478.4 |
| mastra-agent | 460625298 | 439.3 |
| pydantic-ai | 67038399 | 63.9 |
| smolagents | 163734623 | 156.1 |
| dspy | 56473130 | 53.9 |
