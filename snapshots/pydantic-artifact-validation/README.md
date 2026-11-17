# Pydantic artifact validation

Prepared filesystem task for the [Pydantic AI image](../../images/pydantic-ai/README.md).

Upload `recipe.sh` and `recipe.json` to `/workspace/pydantic-artifact-validation`. Run `bash recipe.sh prepare` there, capture the clean filesystem state, and restore into a fresh sandbox in the same group. The prepared state contains inputs and their baseline hashes, with task outputs absent.

`bash recipe.sh analyze`, `verify`, and `test` run offline acceptance. These are scripted/reference checks, not provider-authenticated execution. Outputs are independently decoded and corruption is rejected.

For a real agent run after restore, supply a provider key at execution time and run:

```sh
python /opt/render/fixtures/pydantic-ai/workload.py /workspace/pydantic-artifact-validation openrouter "$MODEL_ID"
```

Use `openai`, `anthropic`, or `openrouter` with a compatible tool-capable model. Agent-capable tasks use a separate fresh `agent-project`; reruns require another restore. DSPy records measured held-out accuracy. Inspect `agent-result.json`; offline success does not imply this live path passed. Do not include credentials in snapshots.

Status: draft, pending published digest and hosted capture/restore/model validation. Snapshot IDs are group-scoped; this reusable recipe is the distributed asset.
