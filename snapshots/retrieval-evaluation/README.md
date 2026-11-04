# Retrieval evaluation

Compute retrieval precision/recall and local answer similarity for correct, partial and wrong synthetic outputs.

Uses [TypeScript AI evaluations](../../images/typescript-evals) version 0.1.0. `prepare` writes a concrete synthetic input dataset and a baseline hash manifest under `/workspace/retrieval-evaluation`. Capture the filesystem after preparation, before any workload output exists. Installed dependencies and workload code live in the image; the snapshot preserves inputs, not a running process.

```sh
bash recipe.sh prepare
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

The caller uploads only `recipe.sh` and `recipe.json` as mode-0600 files and invokes Bash explicitly. An existing upload directory is accepted, but prepared state is never overwritten. `analyze` uses immutable `input/`, disposable `work/` and `/workspace/output`. `verify` decodes actual output artifacts and checks expected semantics, prepared-input hashes and output SHA-256 hashes. The test command corrupts the baseline, an input and each output, requires failure with receipt invalidation, then regenerates artifacts.

Expected summary: `{"cases":3,"perfect":1,"negativeControls":2,"meanPrecisionAt2":0.5,"meanRecallAt2":0.5,"providerCalls":0}`.

Outputs: `scores.json`, `summary.json`, and `verification.json`.

Only local ExactMatch, JSONDiff and Levenshtein scorers run. Inputs are synthetic recorded outputs, not results from an agent model. Provider-backed scorers require caller configuration and are outside this acceptance fixture.

No external network, credentials or user data are required. Snapshots remain local to the caller's Render sandbox group. Version 0.1.0 is draft/unverified: local checks do not establish live Render capture/restore or a published image digest.
