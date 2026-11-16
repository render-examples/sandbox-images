# OpenHands SDK python workspace

Prepare with `bash recipe.sh prepare`; capture before running. Restore into a fresh sandbox, then run `bash recipe.sh analyze`, `verify` and `test` for offline reference checks. These do not invoke a model.

Supply only a provider key at runtime and invoke `node run-agent.mjs --model PROVIDER/MODEL` (Goose: `--provider PROVIDER --model MODEL`). Run `bash grade-project.sh` afterwards. Keep live agent results separate from the offline reference results. No hosted result has been recorded for this candidate.
