# Document processing lab

A filesystem snapshot recipe for the `document-extraction` image. It prepares a
small synthetic corpus and captures inputs, not precomputed extraction results.
After restore, the workload must regenerate and verify fresh output artifacts.

| Input | Required result |
| --- | --- |
| `invoice.pdf` | One digital page; invoice `INV-1042`; two ruled-table rows; total 21,000 cents |
| `receipt-scan.pdf` | One image-only page; OCR recovers receipt `R2042`, three items, and total 4,250 cents |

Each extraction record identifies its source filename, page number, and method.
The verifier re-extracts the documents and compares the text, table data, and
page provenance to the output. Input hashes must still match the prepared
baseline. Negative tests corrupt an input, a CSV artifact, and an extraction
record and require rejection.

## Offline local check

Build `document-extraction`, then run from the repository root:

```sh
docker run --rm --platform linux/amd64 --network none --memory 2g \
  -v "$PWD/snapshots/document-processing-lab:/opt/recipe:ro" \
  render-sandbox-document-extraction:0.1.0 timeout -k 5 120 bash -ec '
    bash /opt/recipe/recipe.sh prepare
    bash /opt/recipe/recipe.sh analyze
    bash /opt/recipe/recipe.sh verify
    bash /opt/recipe/recipe.sh test
  '
```

Preparation writes `/workspace/document-processing-lab/input` and `baseline.json`.
Analysis writes `/workspace/output/extracted.json`, `text.md`, `tables.csv`, and
`verification.json`. The verification record includes the expected summary and
SHA-256 hashes of the three output artifacts.

## Render capture and restore

Use the parent image by its published digest, with deny-all egress and an explicit
workspace/group. Upload only `recipe.sh` and `recipe.py`; the pinned extraction
library and all PDF/OCR dependencies are already in the image. Run preparation, verify outputs are absent, and capture a filesystem snapshot.
Wait for capture to finish before running analysis and verification on the source.
Terminate the source sandbox, restore within the same group, verify the baseline
hash and absence of outputs, then run analysis and download the checked artifacts.

Filesystem capture is sufficient because the reusable state is input files.
There is no running OCR process to preserve. The recipe does not distribute a
universal snapshot ID or make a startup-performance claim. Live import,
capture/restore, and cleanup remain unverified until that separate run passes.
The corpus uses clean English print; it is a functional test, not an OCR benchmark.
