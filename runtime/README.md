# Filesystem recipe lifecycle

Node and Python workloads share a small lifecycle: `prepare`, `analyze`,
`verify`, and `test`. Images install the canonical runtime under
`/opt/render/runtime/`; recipes on older published images upload a generated
copy. Run `python3 scripts/sync-uploaded-runtimes.py` after runtime edits.

Each recipe declares `imageSlug`, `scenario`, and `slug` in `recipe.json`.
The runtime loads the image's fixture module, or the uploaded workload when
`localModule` is true. These modules are trusted bundled acceptance code;
their assertions are not a grading boundary against malicious modifications.

A Node module exports `scenarios`; a Python module exports `SCENARIOS`.
Each scenario contains:

- `expectedSummary`: a nonempty JSON object with concrete acceptance results.
- `artifacts`: flat output filenames, excluding summary and verification files.
- `prepare(inputDir)`: creates synthetic starting inputs, before task outputs.
- `run(context)`: performs the workload and returns its actual summary.
- `verify(context)`: decodes the outputs and returns independently checked results.

The context contains `inputDir`, `workDir`, and `outputDir`. Python receives
`pathlib.Path` values. Node callbacks may be asynchronous. Workloads must bound
subprocesses and close any database/client handles.

`prepare` accepts an existing upload root but refuses to replace prepared
inputs or a baseline. The baseline records configuration, workload-module,
and recursive input hashes. Inputs must be regular files without symlinks.
Capture the filesystem after this step, before `analyze`.

`analyze` invalidates any success receipt, checks the baseline, recreates the
work directory and declared outputs, runs the task, and independently verifies
the results. `verify` checks input integrity, semantic outputs, and artifact
hashes against the prior receipt. A failed check removes that receipt.
`test` corrupts inputs, baseline, and outputs in turn, checks rejection, then
deletes and regenerates the outputs.

Image smoke runs the same scenario with isolated temporary inputs and outputs.
It leaves only `/workspace/image-smoke/result.json` and preserves existing
recipe outputs. Run smoke in a fresh sandbox when that result path matters.

The Docker checker additionally restores prepared state into a separate clean
container with network disabled and a 2 GB memory limit. This is local
filesystem evidence; the host Render runner performs the separate live
import, snapshot, restore, workload, and cleanup checks before release metadata
can claim Render verification.
