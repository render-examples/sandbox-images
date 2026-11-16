# Deepeval tool correctness

Parent: [`deepeval`](../../images/deepeval/README.md). Version 0.1.0; unpublished, unverified candidate.

Upload the declared recipe files to a fresh workspace. Run `bash recipe.sh prepare`, capture a filesystem snapshot with no outputs, then restore into a different sandbox in the same group. Run `bash recipe.sh analyze`, `bash recipe.sh verify` and `bash recipe.sh test`. The final command checks input, baseline and artifact corruption rejection, then regenerates outputs. Processes are restarted after filesystem restore.

Offline acceptance executes the real evaluator with explicit deterministic fixtures. It does not claim authenticated model or judge validation. The parent README describes separately bounded real-provider execution. Keep credentials out of prepared snapshots and image build inputs.

Release digest, source revision and Render capture/restore evidence remain unset until publication and actual validation.
