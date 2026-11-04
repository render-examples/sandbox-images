# TypeScript agent workflows

Persist LangGraph checkpoints and resume scripted agent steps and human approval flows from SQLite.

Linux/amd64, CPU only. Dependencies are pinned; synthetic fixtures require no provider credentials or model downloads. Included recipes: `agent-checkpoint-workflow`, `human-approval-workflow`.

Image smoke executes a real workload and independent semantic verification. Snapshot recipes prepare input-only filesystem state; analyze regenerates outputs, verify checks their contents and hashes, and test rejects input/baseline/artifact corruption. Local checks are not Render snapshot validation or publication evidence.

Dependencies are available to scripts under `/workspace` through `/workspace/node_modules`, including native SQLite bindings. The image smoke imports LangGraph, its SQLite saver and Zod directly from the workspace before executing the checkpoint workflow. `tsc` is available on the default PATH.
