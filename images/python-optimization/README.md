# Python optimization

Solve agent planning, scheduling and allocation tasks using CPU OR-Tools with independent constraint checks.

Linux/amd64, CPU only. Dependencies are pinned; synthetic fixtures require no provider credentials or model downloads. Included recipes: `constraint-scheduling`, `resource-allocation`.

Image smoke executes a real workload and independent semantic verification. Snapshot recipes prepare input-only filesystem state; analyze regenerates outputs, verify checks their contents and hashes, and test rejects input/baseline/artifact corruption. Local checks are not Render snapshot validation or publication evidence.
