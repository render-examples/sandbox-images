# TypeScript RAG pipelines

Exercise LangChain chunking, metadata preservation and bounded context assembly using explicitly scripted fixture embeddings.

The Node 24 Bookworm base is pinned by digest. Installed npm dependencies are exact versions with integrity hashes in `fixture/package-lock.json`; TypeScript is available on the default PATH. `/workspace/node_modules` links to the installed packages, so scripts in `/workspace` can use bare ESM imports without installing dependencies.

`typescript@7.0.2`, `@langchain/core@1.3.4`, `@langchain/textsplitters@1.0.2`.

Fixture embeddings are deterministic one-hot vectors for three explicit keywords. They test the LangChain interfaces and context/citation plumbing, not learned semantics. There is no model, provider request or RAG answer-quality claim.

## Prepared recipes

- [RAG chunking workbench](../../snapshots/rag-chunking-workbench): Split a synthetic corpus with LangChain and preserve source manifests, text spans and line metadata.
- [RAG context assembly](../../snapshots/rag-context-assembly): Run a LangChain retrieval/context pipeline with scripted fixture vectors, bounded prompts and checked citations.

Run `python3 scripts/check-image.py typescript-rag` for smoke and all recipe checks with Docker networking disabled. The runtime uses explicit prepare/analyze/verify/test steps, bounded execution, independent semantic checks, input hashes and artifact integrity checks.

Version 0.1.0 remains draft/unverified until publication and live Render import/capture/restore evidence are recorded. Local container results are separate evidence. All fixture content is synthetic and MIT-licensed; dependencies retain their upstream licenses.

Primary reference: [LangChain documentation](https://reference.langchain.com/javascript/langchain-textsplitters).
