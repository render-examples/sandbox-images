# DSPy sandbox image

Run the complete DSPy application inside one Render sandbox. The guest works against local files and tools; no nested sandbox or Render control-plane credentials are needed. Host-side framework connectors remain separate integrations.

## Prepared tasks

- [dspy-heldout-classification](../../snapshots/dspy-heldout-classification/README.md)
- [dspy-structured-extraction](../../snapshots/dspy-structured-extraction/README.md)

## Run

After preparing and restoring one recipe, pass a provider and model explicitly:

```sh
timeout -k 5 240 python /opt/render/fixtures/dspy/workload.py /workspace/dspy-heldout-classification openrouter "$MODEL_ID"
```

Supported configuration routes are `openai` (`OPENAI_API_KEY`), `anthropic` (`ANTHROPIC_API_KEY`) and `openrouter` (`OPENROUTER_API_KEY`). Provide only the selected key at execution time, with provider egress enabled. Model IDs are caller-selected; no default silently picks a provider. Actual compatibility is established only by recorded live runs.

The task copies prepared inputs into fresh mutable state. An independent checker validates pricing against 707 cases or checks the exact invoice result, as appropriate. DSPy instead keeps training and held-out sets distinct and records its measured score. Filesystem snapshots capture files, not active processes.

The agent may execute code inside the guest. The Render sandbox is the execution isolation boundary; a local shell or Python executor is not an additional security sandbox. Keep host credentials out of the guest and run the launcher inside the sandbox.

## Verification and provenance

Dependency versions are exact with npm integrity locks or Python hash locks. Official Linux base images are digest-pinned. `python3 scripts/check-image.py dspy` builds and runs offline checks plus fresh-container filesystem restore. The offline path explicitly uses scripted models or reference repairs and makes no authenticated model claim.

Current release status: **draft/unverified**. Source commit, image digest, hosted snapshot evidence and authenticated provider results are unset until observed. This image is not yet represented as a public accepted release.

Implementation references: [upstream 1](https://dspy.ai/learn/programming/language_models/), [upstream 2](https://github.com/stanfordnlp/dspy). Package metadata and API signatures were checked against the pinned installed versions on November 16, 2026.

[Validation report](../../docs/framework-assets-validation-2026-11-16.md) distinguishes source checks, offline container restores, authenticated local runs and pending hosted evidence.
