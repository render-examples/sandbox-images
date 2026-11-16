# LlamaIndex offline indexing sandbox

LlamaIndex Core 0.14.26, FastEmbed integration 0.8.0 and FastEmbed 0.9.1 run actual CPU ONNX embeddings. Python 3.12 matches the integration package's supported version range. No model API or vector database service is required.

The MIT-licensed `Qdrant/bge-small-en-v1.5-onnx-Q` model is pinned to commit `aa8f8b060edb00e03bfdd08813a2949946c8ba55`. `model-lock.json` records every installed model file's SHA-256; the downloader checks each hash, and the workload checks installed artifacts before inference. The model card is included in the image. Offline acceptance never downloads weights.

- `llamaindex-index-ready` prepares a persisted three-document index before capture, restores it, and retrieves independently known source citations.
- `llamaindex-index-update` restores that index, changes one source document, persists and reloads the update, and checks the changed answer and source identity.

Both reject an incompatible embedding identity before loading the index. They verify actual retrieved text and citations independently of the generated summary. The shared runtime detects corrupt prepared index files and output changes.

```sh
python3 scripts/check-image.py llamaindex
```

Prepared indexes live in each recipe's `input/index`; analysis copies them into mutable work state. Outputs go to `/workspace/output`. Credentials are not required. Custom corpus users should preserve the embedding identity and rebuild after changing embedding model/dimensions. This is a retrieval image; answer-generation providers can be added by the calling application.

Local Docker smoke, both recipe lifecycles, corruption checks and fresh-container restore passed on 2026-11-16. Internal publication and actual Render import/capture/restore are pending; manifests remain draft/unverified.

[LlamaIndex FastEmbed integration](https://developers.llamaindex.ai/python/framework-api-reference/embeddings/fastembed/) · [Pinned model card](https://huggingface.co/Qdrant/bge-small-en-v1.5-onnx-Q/blob/aa8f8b060edb00e03bfdd08813a2949946c8ba55/README.md)
