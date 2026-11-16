# Toolchain images and snapshot recipes

The approved expansion is asset-first: build and validate images and prepared
filesystem recipes before writing the corresponding how-to guides. It adds 17
images and 34 recipes, and upgrades 3 images with 6 existing recipes. The full target is
47 images and 94 recipes. Docling and its two recipes are held locally while
the dependency-download review is unresolved, so this source batch contains
46 images and 92 recipes. These counts describe implementation scope, not released
or live-validated assets.

| Lane | Image packages | Current evidence |
| --- | --- | --- |
| Frameworks | LangChain/Deep Agents, Mastra, Pydantic AI, smolagents, DSPy | Source and scoped local tests; Docker validation progressing |
| Browsers/data | Playwright, LlamaIndex, Docling, Browser Use, Stagehand | Source; Playwright and LlamaIndex full local checks passed |
| Evaluations | promptfoo, Inspect AI, Ragas, DeepEval | Source and local evaluator tests; Inspect full local checks passed |
| Coding/providers | OpenCode, AI SDK, OpenRouter/gateway, mini-SWE-agent, OpenHands SDK, Goose | Source; local and authenticated checks progressing |

Each package has two prepared recipes. New manifests and upgraded versions have
null digest/revision and unverified status until immutable publication and hosted
evidence are available. Existing November 4 results apply only to their recorded
versions. Offline mocks/reference repairs must never be counted as real model
execution.

## Completion requirements

1. Pin source dependencies and licenses, and run genuine workload and failure checks.
2. Publish a unique internal candidate from main, retaining the tested image ID,
   configuration digest, OCI digest and source commit.
3. Import that exact image into the confirmed Render sandbox group.
4. Prepare inputs without solved outputs, capture, restore in fresh sandboxes,
   execute the workload and independently verify its outputs and isolation.
5. Run authenticated agents with supported explicit model routes; keep blocked
   routes and judge results separate from deterministic checks.
6. Clean up temporary sandboxes/snapshots and record evidence in source metadata,
   Notion and the global registry. Private/internal readiness is separate from
   public distribution readiness.

LangChain and Mastra connectors remain separate workstreams. These full-agent
images run against local guest files and commands in one sandbox; no nested
Render provisioning or guest control-plane credential is required.
