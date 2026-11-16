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
| Frameworks | LangChain/Deep Agents, Mastra, Pydantic AI, smolagents, DSPy | 5 final image/10 recipe checks and 6 final receipt-contract runs passed; prior-image 18-run matrix separately recorded |
| Browsers/data | Playwright, LlamaIndex, Docling, Browser Use, Stagehand | 4 unblocked images/8 recipes passed; Browser Use two model routes and Stagehand Google passed; Docling held locally |
| Evaluations | promptfoo, Inspect AI, Ragas, DeepEval | 4 local image checks passed; Inspect/DeepEval two routes and promptfoo eight CLI/skill variants passed; Ragas Google judge failures retained |
| Coding/providers | OpenCode, AI SDK, OpenRouter/gateway, mini-SWE-agent, OpenHands SDK, Goose | 6 local image checks passed; coding agent 12, AI SDK 4, gateway 2 and Goose 4 actual model runs passed; final search-binary checks passed |

Each package has two prepared recipes. New manifests and upgraded versions have
null digest/revision and unverified status until immutable publication and hosted
evidence are available. Existing November 4 results apply only to their recorded
versions. Offline mocks/reference repairs must never be counted as real model
execution.

## TypeScript migration

The checks above are historical results from the pre-migration source at
`4953e6d4f84b894c6a6041343251751367af0749`. Maintained Node code now uses strict
TypeScript, with enforced source coverage and type-safety rules in CI. Follow the
[migration report](typescript-migration-2026-11-16.md) for new candidate versions
and fresh checks; old model receipts do not verify these rebuilt images.

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

## Source review checkpoint

[PR #20](https://github.com/render-examples/sandbox-images/pull/20) contains the 19 unblocked packages. Its initial 48 checks passed; subsequent fixes require checks on the final source commit. All 20 image and 40 recipe Notion records link to their source and lane evidence. They remain in progress until publication and hosted validation are complete.

## Required repository review

Implementation commit `937106f2db147dcdc3f4810b735028e576707d12` passed all 48 CI checks. The merge attempt was refused by the organization ruleset: one DevRel team/code-owner approval and last-push approval are required. Auto-merge is disabled. The search-binary and failed-receipt fixes passed local checks and are included for CI on the final head before approval. No package publication or hosted mutation has occurred. Required review is distinct from the user approval already granted for public source and bounded Google/OpenRouter test calls.
