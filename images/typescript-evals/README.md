# TypeScript AI evaluations

Score synthetic tool traces and retrieval outputs with local AutoEvals metrics and explicit negative controls.

The Node 24 Bookworm base is pinned by digest. Installed npm dependencies are exact versions with integrity hashes in `fixture/package-lock.json`; TypeScript is available on the default PATH. `/workspace/node_modules` links to the installed packages, so scripts in `/workspace` can use bare ESM imports without installing dependencies.

`typescript@7.0.2`, `autoevals@0.4.1`, `zod@4.6.7`.

Only local ExactMatch, JSONDiff and Levenshtein scorers run. Inputs are synthetic recorded outputs, not results from an agent model. Provider-backed scorers require caller configuration and are outside this acceptance fixture.

## Prepared recipes

- [Tool trace evaluation](../../snapshots/tool-trace-evaluation): Score synthetic tool-call traces for exact behavior, schema conformity and forbidden/missing operations.
- [Retrieval evaluation](../../snapshots/retrieval-evaluation): Compute retrieval precision/recall and local answer similarity for correct, partial and wrong synthetic outputs.

Run `python3 scripts/check-image.py typescript-evals` for smoke and all recipe checks with Docker networking disabled. The runtime uses explicit prepare/analyze/verify/test steps, bounded execution, independent semantic checks, input hashes and artifact integrity checks.

Version 0.1.0 remains draft/unverified until publication and live Render import/capture/restore evidence are recorded. Local container results are separate evidence. All fixture content is synthetic and MIT-licensed; dependencies retain their upstream licenses.

Primary reference: [AutoEvals documentation](https://github.com/braintrustdata/autoevals).
