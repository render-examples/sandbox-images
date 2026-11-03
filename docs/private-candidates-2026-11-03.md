# Private candidate publication and live validation — 2026-11-03

Five version 0.1.0 image candidates were published to GHCR. Package visibility was
independently checked as private. This is not a public registry release: all asset
release statuses remain draft.

## Publication receipts

All five images were built from `da64cb138f0a8866ac6b7cf47de091446fdaf532` for
`linux/amd64`. For each workflow, the published configuration digest matched its
checked-image receipt; hashing the downloaded OCI manifest reproduced the published
manifest digest. Credentials were never sent into guest environments.

| Image package | Version | Manifest digest | Publication |
| --- | --- | --- | --- |
| `ghcr.io/render-examples/sandbox-coding-workspace` | 0.1.0 | `sha256:d51a3622ce19d50177045bc4c4b60c050fdf41697cc41e3a63c2da3922d277b6` | [Run 41674517179](https://github.com/render-examples/sandbox-images/actions/runs/41674517179) |
| `ghcr.io/render-examples/sandbox-document-extraction` | 0.1.0 | `sha256:fcbb5b6013dd9eae51fdd79271ba9826549d754e85ab0c80ba3c76abf5435aff` | [Run 41674559004](https://github.com/render-examples/sandbox-images/actions/runs/41674559004) |
| `ghcr.io/render-examples/sandbox-postgres-lab` | 0.1.0 | `sha256:2d3d1228961c9cb51e8c4bd00ec01a4d7c5a573102764cf9e562502efd95d6bf` | [Run 41674564428](https://github.com/render-examples/sandbox-images/actions/runs/41674564428) |
| `ghcr.io/render-examples/sandbox-python-coding` | 0.1.0 | `sha256:104f04f5a91273080b02a9c9ccfdbe34a0dba86de4c1928b476c65f836296a4a` | [Run 41674569760](https://github.com/render-examples/sandbox-images/actions/runs/41674569760) |
| `ghcr.io/render-examples/sandbox-typescript-tools` | 0.1.0 | `sha256:5011ec0d47014b31e6e1c927d51d81e9b64f60aa1520a2287945b971ea685b8e` | [Run 41674575952](https://github.com/render-examples/sandbox-images/actions/runs/41674575952) |

## Live results

The validator used `@renderinc/sdk@1.6.0`, plan `1c-2g`, deny-all egress on both
source and restored sandboxes, a 900-second runtime limit and a 300-second idle
timeout. It captured prepared filesystem state before running the task, then
verified a fresh restore, known output values, recipe-file hashes and downloaded
artifact hashes. These are functional checks, not performance benchmarks.

| Image / recipe | Tested recipe version | Result |
| --- | --- | --- |
| coding-workspace / repo-ready-typescript | 0.1.0 | Image smoke failed: global `tsc` was absent from the sandbox command PATH. No verified recipe result. |
| document-extraction / document-processing-lab | 0.1.0 | Passed: `{"documents":2,"pages":2,"tableRows":2,"invoiceTotalCents":21000,"receiptTotalCents":4250}` |
| python-coding / repo-ready-python | 0.1.0 | Passed: `{"baselineTests":3,"regressionFailuresBeforeFix":1,"testsPassed":5,"totalCents":3250,"discountedCents":2600,"roundedCents":51,"changedFiles":2}` |
| postgres-lab / sql-vector-playground | 0.1.1 | Passed: `{"rows":4,"nearestIds":[1,2,4],"revenueCents":4500,"rollbackPassed":true}` |
| typescript-tools / typescript-tool-workbench | 0.1.0 | Passed: `{"inputRows":3,"orders":2,"totalCents":3250,"attempts":3,"deliveries":1,"testsPassed":8}` |

All successful runs' source and restored sandboxes were independently confirmed
terminated. Their snapshots returned typed not-found responses after deletion.
Imported images remain available in the selected group. Known resources from
failed attempts and diagnostics were also independently checked for cleanup.
Workspace, group and resource identifiers are intentionally omitted here.

## Corrective changes

- This group permits only two concurrent image imports. Three requests were
  explicitly rejected before resource creation; they were retried at a limit of two.
- Render SDK uploads produced caller-owned mode 0600 files. Postgres recipe 0.1.0
  attempted to open the SQL fixture as the postgres OS user and failed. Recipe
  0.1.1 opens it as the caller and passes it through stdin, retaining permissions.
  The published Postgres image remains 0.1.0; no image rebuild was needed.
- One corrected Postgres attempt encountered a transient 502 downloading a restored
  file. The runner now retries only 502/503/504 file reads, with at most three
  attempts and bounded delays. Mutations are not retried. The next run passed.
- Render commands did not retain the Dockerfile PATH addition. Coding-workspace
  0.1.0 failed `tsc --version` with ENOENT. Both TypeScript-based images now expose
  the compiler through `/usr/local/bin/tsc` in new 0.1.1 candidates. Their local
  smoke checks use the sandbox-default PATH. TypeScript-tools 0.1.0 passed its
  fixture, which uses project-local tools, but also needs this global-command fix.

The 0.1.1 TypeScript-based images passed local build, offline workload and corruption
checks. They have not been published or validated live yet. Merge the correction
before invoking the main-only publisher for their new versions; never overwrite
0.1.0 tags. Current 0.1.1 manifests remain unverified until their own live runs pass.

## Run provenance

Image sources are the publication commit above. The document, Python coding and
TypeScript-tools 0.1.0 recipes and host runner used that same commit. The successful
Postgres 0.1.1 recipe and retry-capable runner used
`5f02082` (the committed correction before later metadata changes).

### document-extraction

Started `2026-11-03T16:30:47.271Z`; completed `2026-11-03T16:31:59.049Z`.

Recipe files:

- `recipe.sh`: `3bfb21eb4ed037abcdcfd14d1fefb651c352e67de56cc7160ec29554d745308f`
- `recipe.py`: `a505752bf97530ae340d2e69b123310360f441e9e7d5bb37654823a0032351ca`

Artifact hashes:

- `extracted.json`: `642d9e3cea899f0e7a8ca6d1675c561d6e0750a51d2d86a84acd9e5847b2d5fb`
- `text.md`: `45b2bee01c3b7295168776b85013e9bd2b4523a337a9ba8fa3376ed4a51e0076`
- `tables.csv`: `3be0ae92bba82be0115cf94e3930b5bd8f2a53f5022e801fc4d4a5e1005e5a95`

### python-coding

Started `2026-11-03T16:30:47.271Z`; completed `2026-11-03T16:32:12.554Z`.

Recipe files:

- `recipe.sh`: `3bfb21eb4ed037abcdcfd14d1fefb651c352e67de56cc7160ec29554d745308f`
- `recipe.py`: `b6a4e22924d4d05a68780c26e1625b93bac9ae93b9ce713c7069862df59d8d98`

Artifact hashes:

- `summary.json`: `81b48443f9c1949c2bb323a437eb011109de5f758e840acbfbf45b00d5c11f02`
- `tests.xml`: `4b7f4437c6566b169959494f173e095f87f855391b0bbc17d71aff95000718d5`
- `tests.txt`: `9310d484212a1fe2c33b4b8accdf50a2639f09ba039354f8448f8aa8d173e1ff`
- `regression.xml`: `7c7ccefef61c5548b6cd67a794748b21c30ae302a61fa59e3e510b4e892f3184`
- `lint.json`: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- `change.patch`: `dc45bad748417357014a169fa4f4685067bdea7c42fdd2254d492176b13da043`

### postgres-lab

Started `2026-11-03T16:40:25.926Z`; completed `2026-11-03T16:41:09.642Z`.

Recipe files:

- `recipe.sh`: `1eefdd771b2bfe916dc9bf5fd358e6253fe00678c0f47a4faeb708a432d5705f`
- `fixture.sql`: `26b98efad3d63d3bbb273c4ab89ee058b3e7b6554aa5173d04a02ca9e91942cc`

Artifact hashes:

- `summary.json`: `da8b1fb61e6c272a6720494b603b435952480fc122721c5e03a6ed5874814e22`
- `nearest.csv`: `9673f2aa3712a37595bf5eb1e2b7aaec2c39d13da2dae6f28ba9042de5b4d2f1`

### typescript-tools

Started `2026-11-03T16:33:20.075Z`; completed `2026-11-03T16:37:53.354Z`.

Recipe files:

- `recipe.sh`: `4609dd2788681bd9fc6ea8913f8e37bf9aa389d8418d2324c08b5f4e33d74833`
- `recipe.mjs`: `3cced7b28077b2e0cddbb3a82f7c60a48eb18acf3a334bc42de27bc9a382dc26`

Artifact hashes:

- `summary.json`: `0deff7d99e279c21d8c2de3ac60550b0d4a0c553ce33434162743e14e6bb846e`
- `transformed.json`: `2ba80b60d881553a6043b57d0c48b373bc5c423e0106ddcb9fb08d4902e348e8`
- `receipt.json`: `948eda8b3cd62b1219eb9ba19f6e96654fe70b555f0feba8dfd8990eeac7df22`
- `requests.json`: `25dc9558ad748db82dad7e4053a20b8ba5860f05aaeef52109e1a73de5c1cd19`
- `tests.tap`: `62fb978bb1464d43dcda256a41cc8aec178701a3c054d616f21c75082cd038dd`
