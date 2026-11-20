# Docling document sandbox

Docling 2.150.1 with CPU-only PyTorch, a pinned layout model, the accurate TableFormer model and Tesseract English tooling. `model-lock.json` pins upstream revisions, licenses and SHA-256 values; every model download is checked. Installed model cards preserve the upstream Apache-2.0 and CDLA-Permissive-2.0 notices. The image does not download model weights during offline use.

The two prepared recipes convert a synthetic one-page invoice. The layout recipe checks reading order and page provenance; the table recipe checks every cell and the total. Both acceptance paths check those invariants, reject malformed PDFs, and decode exported Docling JSON, Markdown and table data rather than trusting a summary. The sample uses digital text with OCR disabled; Tesseract is installed for callers who explicitly configure `TesseractCliOcrOptions`. Scanned-document OCR is not part of this asset's current validation claim.

```sh
python3 scripts/check-image.py docling
```

`/opt/render/models/docling` contains the immutable models. User inputs and outputs belong in `/workspace`. Filesystem recipes capture prepared input PDFs before conversion. The fast table model failed the cell oracle during development; the accurate model is pinned and the incorrect output is not accepted as a pass.

Linux/amd64 container acceptance passed on November 20, 2026 for actual CPU layout/table inference, field values, reading order, page provenance and malformed-input rejection. Both prepared recipes also passed corruption checks and filesystem restoration into fresh offline containers. The original CPU PyTorch TLS failure did not recur after the user confirmed there were no matching Aikido blocks; dependencies retain their original official index and required hashes. Internal publication and Render capture/restore remain pending; manifests stay draft/unverified.

[Docling pipeline options](https://docling-project.github.io/docling/reference/pipeline_options/) · [Layout model](https://huggingface.co/docling-project/docling-layout-heron) · [Table models](https://huggingface.co/docling-project/docling-models/tree/v2.3.0)
