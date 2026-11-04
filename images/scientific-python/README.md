# Scientific Python

Run interpretable statistical experiments and regression forecasts with pinned CPU numerical libraries.

Linux/amd64, CPU only. Dependencies are pinned; synthetic fixtures require no provider credentials or model downloads. Included recipes: `statistical-experiment`, `demand-forecast`.

Image smoke executes a real workload and independent semantic verification. Snapshot recipes prepare input-only filesystem state; analyze regenerates outputs, verify checks their contents and hashes, and test rejects input/baseline/artifact corruption. Local checks are not Render snapshot validation or publication evidence.
