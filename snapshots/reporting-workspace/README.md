# Reporting workspace

Generate a workbook and document from synthetic financial rows; reopen cells and inspect OOXML content.

Uses [TypeScript Office artifacts](../../images/office-artifacts) version 0.1.0. `prepare` writes a concrete synthetic input dataset and a baseline hash manifest under `/workspace/reporting-workspace`. Capture the filesystem after preparation, before any workload output exists. Installed dependencies and workload code live in the image; the snapshot preserves inputs, not a running process.

```sh
bash recipe.sh prepare
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

The caller uploads only `recipe.sh` and `recipe.json` as mode-0600 files and invokes Bash explicitly. An existing upload directory is accepted, but prepared state is never overwritten. `analyze` uses immutable `input/`, disposable `work/` and `/workspace/output`. `verify` decodes actual output artifacts and checks expected semantics, prepared-input hashes and output SHA-256 hashes. The test command corrupts the baseline, an input and each output, requires failure with receipt invalidation, then regenerates artifacts.

Expected summary: `{"rows":3,"totalCents":3351,"artifacts":2,"formulaCacheChecked":true}`.

Outputs: `report.xlsx`, `report.docx`, `report-data.json`, `summary.json`, and `verification.json`.

Workbook formulas have explicitly supplied cached results; ExcelJS does not recalculate formulas. OOXML structure and cell/text values are verified, not visual rendering in Office. No desktop office suite is included.

No external network, credentials or user data are required. Snapshots remain local to the caller's Render sandbox group. Version 0.1.0 is draft/unverified: local checks do not establish live Render capture/restore or a published image digest.
