# Goose python workspace

Prepare with `bash recipe.sh prepare`; capture before running. Restore into a fresh sandbox, then run `bash recipe.sh analyze`, `verify` and `test` for offline reference checks. These do not invoke a model.

Supply only a provider key at runtime and invoke `node run-agent.mjs --model PROVIDER/MODEL` (Goose: `--provider PROVIDER --model MODEL`). Run `bash grade-project.sh` afterwards. Keep live agent results separate from the offline reference results. No hosted result has been recorded for this candidate.

The prepared `project/invoice.json` is served by the installed local stdio MCP extension. Set `MCP_RECORD_CALLS=1` for live execution; require at least one recorded `invoice_total` call and independently compare `project/invoice-answer.json` to `{ "id": "demo-001", "currency": "USD", "totalCents": 3250 }`, in addition to code grading. Offline acceptance connects a real MCP client to the server; no model is invoked.
