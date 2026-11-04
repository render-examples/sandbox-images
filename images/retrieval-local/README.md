# TypeScript local retrieval

Build and restore a local lexical index with citations, filters, typo tolerance and index updates.

The Node 24 Bookworm base is pinned by digest. Installed npm dependencies are exact versions with integrity hashes in `fixture/package-lock.json`; TypeScript is available on the default PATH. `/workspace/node_modules` links to the installed packages, so scripts in `/workspace` can use bare ESM imports without installing dependencies.

`typescript@7.0.2`, `minisearch@7.2.0`.

Retrieval is lexical MiniSearch search. This image does not contain embeddings, an LLM, or a semantic-quality benchmark.

## Prepared recipes

- [Local retrieval corpus](../../snapshots/rag-corpus): Search a prepared lexical corpus and verify exact source citations and unknown-query handling.
- [Search ranking workbench](../../snapshots/search-ranking-workbench): Exercise metadata filters, typo tolerance, document removal and persistent index updates.

Run `python3 scripts/check-image.py retrieval-local` for smoke and all recipe checks with Docker networking disabled. The runtime uses explicit prepare/analyze/verify/test steps, bounded execution, independent semantic checks, input hashes and artifact integrity checks.

Version 0.1.0 remains draft/unverified until publication and live Render import/capture/restore evidence are recorded. Local container results are separate evidence. All fixture content is synthetic and MIT-licensed; dependencies retain their upstream licenses.

Primary reference: [MiniSearch documentation](https://github.com/lucaong/minisearch).
