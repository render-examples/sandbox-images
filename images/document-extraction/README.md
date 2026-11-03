# Document extraction

CPU tools for agents that receive PDF attachments and need text, structured
tables, or page-level evidence. The image contains Poppler, Tesseract with
English language data, pdfplumber, Pillow, and ReportLab. It does not call a model
API or download models at execution time.

## Included workloads

- Digital PDF text and ruled-table extraction with pdfplumber.
- Scanned-PDF rasterization with `pdftoppm`, followed by English OCR with Tesseract.
- JSON extraction results with source filename, page number, and extraction method.
- Markdown text and CSV table artifacts.

This is a draft candidate until its immutable published image passes import and
execution on Render. A local Docker check is not Render verification.

## Build and check

From the repository root:

```sh
docker buildx build --load --provenance=false --platform linux/amd64 \
  -f images/document-extraction/Dockerfile \
  -t render-sandbox-document-extraction:0.1.0 .
docker run --rm --platform linux/amd64 --network none --memory 2g \
  render-sandbox-document-extraction:0.1.0 \
  timeout -k 5 120 python /opt/render/examples/document-extraction/smoke.py
```

The smoke workload generates two synthetic PDFs. It extracts a digital invoice
table totaling 21,000 cents and recovers a scanned receipt totaling 4,250 cents.
The scanned PDF has no embedded text layer, so success requires actual OCR.
Results appear under `/workspace/image-smoke` inside the container; mount an
output directory if you want to retain them.

See the [document processing lab recipe](../../snapshots/document-processing-lab)
for a prepared input corpus with capture/restore verification.

## Scope and reproducibility

- The official Python base is pinned by Linux amd64 manifest digest. Python
  wheels and all transitive Python dependencies are exact and hash-locked.
- The top-level Debian package versions are explicit. Debian transitive package
  resolution still uses its repositories; `/opt/render/system-packages.txt`
  records the installed package set. The published OCI digest is the immutable
  distribution artifact. Rebuilding after a Debian repository change may fail
  or change transitive OS packages and must receive a new candidate/version.
- English OCR only. Additional languages require deliberate image updates.
- The fixture validates clear printed text and a ruled table, not handwriting,
  arbitrary layouts, OCR accuracy across languages, or semantic document analysis.
- Supplied fixtures contain no real people, customer data, or external documents.

Primary references checked for this implementation:

- [pdfplumber](https://github.com/jsvine/pdfplumber): digital PDF text and table APIs.
- [Tesseract command-line usage](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html): language and page segmentation options.
- [ReportLab](https://www.reportlab.com/): synthetic PDF fixture generation.
- [PyPI pdfplumber metadata](https://pypi.org/project/pdfplumber/): dependency/version resolution.

This repository's code uses MIT. Bundled libraries, system packages, fonts, and
OCR data retain their upstream licenses; installed Debian copyright metadata is
available under `/usr/share/doc/`.
