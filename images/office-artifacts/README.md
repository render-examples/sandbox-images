# TypeScript Office artifacts

Generate and inspect XLSX, DOCX and PPTX files without a desktop application or provider credentials.

The Node 24 Bookworm base is pinned by digest. Installed npm dependencies are exact versions with integrity hashes in `fixture/package-lock.json`; TypeScript is available on the default PATH. `/workspace/node_modules` links to the installed packages, so scripts in `/workspace` can use bare ESM imports without installing dependencies.

`typescript@7.0.2`, `exceljs@4.4.0`, `docx@9.15.2`, `pptxgenjs@4.0.1`, `adm-zip@0.6.1`, `fast-xml-parser@5.12.0`.

Workbook formulas have explicitly supplied cached results; ExcelJS does not recalculate formulas. OOXML structure and cell/text values are verified, not visual rendering in Office. No desktop office suite is included.

## Prepared recipes

- [Reporting workspace](../../snapshots/reporting-workspace): Generate a workbook and document from synthetic financial rows; reopen cells and inspect OOXML content.
- [Presentation workspace](../../snapshots/presentation-workspace): Generate a two-slide presentation and inspect slide text, dimensions and shape positions in OOXML.

Run `python3 scripts/check-image.py office-artifacts` for smoke and all recipe checks with Docker networking disabled. The runtime uses explicit prepare/analyze/verify/test steps, bounded execution, independent semantic checks, input hashes and artifact integrity checks.

Version 0.1.0 remains draft/unverified until publication and live Render import/capture/restore evidence are recorded. Local container results are separate evidence. All fixture content is synthetic and MIT-licensed; dependencies retain their upstream licenses.

Primary reference: [ExcelJS documentation](https://github.com/exceljs/exceljs).
