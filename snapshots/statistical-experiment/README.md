# Statistical experiment

Analyze a synthetic paired experiment and verify effect, uncertainty and significance independently.

Parent image: `scientific-python`. This is a filesystem recipe using synthetic inputs, not a live service or a hosted model.

Run `bash recipe.sh prepare` once before capture. The image runtime supplies the workload and dependencies. Capture `/workspace/statistical-experiment` before running analysis. After restore, run `bash recipe.sh analyze`, `bash recipe.sh verify`, and `bash recipe.sh test`. Preparation creates inputs and a hash-bound baseline without final outputs; analysis executes the workload; verification independently checks semantics and hashes; test corrupts inputs and outputs, requires rejection, then regenerates them.

All uploaded recipe files may be mode 0600 because the entrypoint uses `bash` explicitly. The shared runtime is invoked using its interpreter. No provider keys, production data or model downloads are required. Local copy/restore checks do not establish live Render validation.
