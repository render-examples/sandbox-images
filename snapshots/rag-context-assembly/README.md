# RAG context assembly

Run a LangChain retrieval/context pipeline with scripted fixture vectors, bounded prompts and checked citations.

Uses [TypeScript RAG pipelines](../../images/typescript-rag) version 0.1.0. `prepare` writes a concrete synthetic input dataset and a baseline hash manifest under `/workspace/rag-context-assembly`. Capture the filesystem after preparation, before any workload output exists. Installed dependencies and workload code live in the image; the snapshot preserves inputs, not a running process.

```sh
bash recipe.sh prepare
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

The caller uploads only `recipe.sh` and `recipe.json` as mode-0600 files and invokes Bash explicitly. An existing upload directory is accepted, but prepared state is never overwritten. `analyze` uses immutable `input/`, disposable `work/` and `/workspace/output`. `verify` decodes actual output artifacts and checks expected semantics, prepared-input hashes and output SHA-256 hashes. The test command corrupts the baseline, an input and each output, requires failure with receipt invalidation, then regenerates artifacts.

Expected summary: `{"questions":2,"citations":2,"unknownCitations":0,"scriptedEmbeddings":true}`.

Outputs: `contexts.json`, `summary.json`, and `verification.json`.

Fixture embeddings are deterministic one-hot vectors for three explicit keywords. They test the LangChain interfaces and context/citation plumbing, not learned semantics. There is no model, provider request or RAG answer-quality claim.

No external network, credentials or user data are required. Snapshots remain local to the caller's Render sandbox group. Version 0.1.0 is draft/unverified: local checks do not establish live Render capture/restore or a published image digest.
