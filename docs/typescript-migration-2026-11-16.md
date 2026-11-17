# TypeScript migration evidence, November 16, 2026

This migration reconciles 30 image candidates and 61 dependent filesystem recipes. It compares the working migration against pre-migration branch commit `4953e6d4f84b894c6a6041343251751367af0749` and published catalog metadata on `origin/main` at [`5c517299aa45`](https://github.com/render-examples/sandbox-images/tree/5c517299aa45eee342dc0dab151bb4e9c5bb82a5). Docling and its recipes are excluded.

## Current candidates

All affected manifests now have `status: draft`, `verification.status: unverified`, and null source revision, image digest, verification date, evidence URL, client version and compute plan. These values mean that the changed runtime has no recorded published identity or hosted validation. Local typechecks and fixture checks do not restore hosted verification.

Previously published artifacts receive a patch version when the candidate still used the published version. The already-unpublished OpenCode, TypeScript agents and AI gateway 0.2.0 candidates keep that version; new batch candidates keep 0.1.0. Each dependent recipe has its own version and references the candidate parent image tag. No published tag or digest is overwritten by this reconciliation.

## Prior image evidence and current versions

Each prior-manifest link is pinned to the immutable comparison commit and retains the complete previous metadata, including source revision, digest and verification details. A prior pass belongs only to that recorded artifact. It is not evidence for the TypeScript candidate.

| Image | Prior version | Candidate version | Prior verification | Prior manifest |
| --- | --- | --- | --- | --- |
| `claude-code` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/claude-code/manifest.json) |
| `codex` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/codex/manifest.json) |
| `coding-workspace` | 0.1.1 | 0.1.2 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/coding-workspace/manifest.json) |
| `cursor-cli` | 0.1.1 | 0.1.2 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/cursor-cli/manifest.json) |
| `devin-cli` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/devin-cli/manifest.json) |
| `goose` | New | 0.1.0 | No published record | — |
| `integration-test` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/integration-test/manifest.json) |
| `langchain-agent` | New | 0.1.0 | No published record | — |
| `mastra-agent` | New | 0.1.0 | No published record | — |
| `media-processing` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/media-processing/manifest.json) |
| `mini-swe-agent` | New | 0.1.0 | No published record | — |
| `office-artifacts` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/office-artifacts/manifest.json) |
| `opencode` | 0.1.0 | 0.2.0 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/opencode/manifest.json) |
| `openhands-sdk` | New | 0.1.0 | No published record | — |
| `playwright` | New | 0.1.0 | No published record | — |
| `promptfoo` | New | 0.1.0 | No published record | — |
| `retrieval-local` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/retrieval-local/manifest.json) |
| `stagehand` | New | 0.1.0 | No published record | — |
| `typescript-agent-workflows` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-agent-workflows/manifest.json) |
| `typescript-agents` | 0.1.0 | 0.2.0 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-agents/manifest.json) |
| `typescript-ai-gateway` | 0.1.0 | 0.2.0 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-ai-gateway/manifest.json) |
| `typescript-ai-ui` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-ai-ui/manifest.json) |
| `typescript-api-postgres` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-api-postgres/manifest.json) |
| `typescript-data` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-data/manifest.json) |
| `typescript-evals` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-evals/manifest.json) |
| `typescript-image` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-image/manifest.json) |
| `typescript-openapi` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-openapi/manifest.json) |
| `typescript-rag` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-rag/manifest.json) |
| `typescript-sqlite` | 0.1.0 | 0.1.1 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-sqlite/manifest.json) |
| `typescript-tools` | 0.1.1 | 0.1.2 | passed | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/images/typescript-tools/manifest.json) |

## Immutable identities from prior published images

| Image and prior version | Prior source revision | Prior OCI digest | Prior hosted evidence |
| --- | --- | --- | --- |
| `claude-code` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:ec7b03eaeb6b32cf60eecefd8c860eee0cb04a5cbd2bb855bee52517803a7c50` | [2026-11-04T21:25:36.921Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `codex` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:0b50a9fc812951c2930b64dbc25dfbe8d8ea5bafb2fe00ae300ed2b8beb19973` | [2026-11-04T21:27:02.054Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `coding-workspace` 0.1.1 | `8d7196d95d4889863d4e0b59c7c6be2b7f6927b6` | `sha256:978f6b05e6b10fd332ed351989bf72269ce4014b3af67812675a86a78f330914` | [2026-11-04T21:28:17.805Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `cursor-cli` 0.1.1 | `455352bf4be44f169f2a2db3b93aa55ecb8755f0` | `sha256:c14f8bfe1dd3e35c0d82829c9715e4715e21c75384a47058d2383f63f49675a4` | [2026-11-04T21:59:40.518Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `devin-cli` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:662f563078d24edbcd088c912b307e24833fc20bcd3b73cb96c27a4fccae70fe` | [2026-11-04T21:29:18.690Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `integration-test` 0.1.0 | `a53eaa4ace95b7a9b9c29a6a2a2bdf141a855808` | `sha256:9c5708c9efc526699d080b1384546f0e8d50bfdc7629ed6ad318810f4dacc299` | [2026-11-04T21:31:01.733Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `media-processing` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:78fe9c5f7f430da8821c91964bae94985ba78599e2b956815675bfbe43d67f01` | [2026-11-04T21:33:45.376Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `office-artifacts` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:180149da99073e70fe0350f44d999a058dda16b8ee60eeeab5865b655ec90888` | [2026-11-04T21:31:40.856Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `opencode` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:191bab6b5bbbc59b054570b1c35efa7a6db12e19ffdd114fa7fa72cc7efc4bf3` | [2026-11-04T21:35:19.913Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `retrieval-local` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:2f184a1c88f5867a358b2f1a47bf84960abc6ddfb7191fd46a55b3d23ca2e1cc` | [2026-11-04T21:36:10.593Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-agent-workflows` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:96eb5cd199fc72d1c98dfbe4b8528314980748a496a77e69ae5e1dc6ed55b58a` | [2026-11-04T21:37:18.829Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-agents` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:665d468b547e0369b794de5419d7ec7c803fb4fa7fc1dd12612abbf2c5d94b16` | [2026-11-04T21:36:56.415Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-ai-gateway` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:a73d98746d912379aae6f752718ecfa4da1de5d8962c64dcd32de64c84224ff0` | [2026-11-04T21:38:23.349Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-ai-ui` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:2598b6ce7f559a84ea6d1abdcb3dac269be7c2940839f4c99dec73bf094b84c9` | [2026-11-04T21:39:43.003Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-api-postgres` 0.1.0 | `7b2b96b598d1e251231166995d187ea5f4331a48` | `sha256:a145a46b56c759e90ec93f921b709a65ccfed8bd13a586a022060eb956244e8b` | [2026-11-04T21:39:50.281Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-data` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:1f8429cec328b8ee71bcb8bc7aaf00749775a54bd6344a7a67272d0db36b9f5e` | [2026-11-04T21:40:38.465Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-evals` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:c9a9cd232963907541622c6bcba6db6a03f1aea2b2448b3558c28e87c0edaa3a` | [2026-11-04T21:41:20.986Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-image` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:a450ffd95976693bceb117c77be712c2334739dc37f6df540fe97e09962f7baf` | [2026-11-04T21:42:23.590Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-openapi` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:9f2626335fb681cda6132171265d1dde825ecd1d527a3937180997d21fc23596` | [2026-11-04T21:42:54.870Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-rag` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:b2b74d188789a133c385b63b313dc5f42d9e74148ffad93d1d568a9509a2edcc` | [2026-11-04T21:44:25.954Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-sqlite` 0.1.0 | `2f74db60e5f6ddbfa5b2fe871f5815ecd8fba1c1` | `sha256:cd6f13655e3c30014ae1aa0095c95938a376d8c18b0e9eae41d825b6c7d6b45c` | [2026-11-04T21:44:43.437Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |
| `typescript-tools` 0.1.1 | `8d7196d95d4889863d4e0b59c7c6be2b7f6927b6` | `sha256:579929809c1528c939ad10ce0c1deaf322e394ac438b0e09f90599b9df435158` | [2026-11-04T21:46:57.483Z](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md) |

## Recipe versions and parent references

| Recipe | Prior → candidate version | Candidate parent image | Prior manifest |
| --- | --- | --- | --- |
| `agent-checkpoint-workflow` | 0.1.0 → 0.1.1 | `typescript-agent-workflows:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/agent-checkpoint-workflow/manifest.json) |
| `agent-regression-typescript` | 0.1.0 → 0.1.1 | `coding-workspace:0.1.2` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/agent-regression-typescript/manifest.json) |
| `agent-structured-output` | 0.1.0 → 0.2.0 | `typescript-agents:0.2.0` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/agent-structured-output/manifest.json) |
| `agent-tool-loop` | 0.1.0 → 0.2.0 | `typescript-agents:0.2.0` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/agent-tool-loop/manifest.json) |
| `ai-retry-budget-lab` | 0.1.0 → 0.2.0 | `typescript-ai-gateway:0.2.0` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/ai-retry-budget-lab/manifest.json) |
| `ai-routing-workbench` | 0.1.0 → 0.2.0 | `typescript-ai-gateway:0.2.0` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/ai-routing-workbench/manifest.json) |
| `audio-processing` | 0.1.0 → 0.1.1 | `media-processing:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/audio-processing/manifest.json) |
| `chat-stream-workbench` | 0.1.0 → 0.1.1 | `typescript-ai-ui:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/chat-stream-workbench/manifest.json) |
| `claude-code-python-repo` | 0.1.0 → 0.1.1 | `claude-code:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/claude-code-python-repo/manifest.json) |
| `claude-code-typescript-repo` | 0.1.0 → 0.1.1 | `claude-code:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/claude-code-typescript-repo/manifest.json) |
| `codebase-research-corpus` | 0.1.0 → 0.1.1 | `coding-workspace:0.1.2` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/codebase-research-corpus/manifest.json) |
| `codex-python-repo` | 0.1.0 → 0.1.1 | `codex:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/codex-python-repo/manifest.json) |
| `codex-typescript-repo` | 0.1.0 → 0.1.1 | `codex:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/codex-typescript-repo/manifest.json) |
| `csv-reconciliation` | 0.1.0 → 0.1.1 | `typescript-data:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/csv-reconciliation/manifest.json) |
| `cursor-cli-python-repo` | 0.1.1 → 0.1.2 | `cursor-cli:0.1.2` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/cursor-cli-python-repo/manifest.json) |
| `cursor-cli-typescript-repo` | 0.1.1 → 0.1.2 | `cursor-cli:0.1.2` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/cursor-cli-typescript-repo/manifest.json) |
| `devin-cli-python-repo` | 0.1.0 → 0.1.1 | `devin-cli:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/devin-cli-python-repo/manifest.json) |
| `devin-cli-typescript-repo` | 0.1.0 → 0.1.1 | `devin-cli:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/devin-cli-typescript-repo/manifest.json) |
| `fullstack-node-postgres` | 0.1.0 → 0.1.1 | `typescript-api-postgres:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/fullstack-node-postgres/manifest.json) |
| `goose-mcp-workspace` | New → 0.1.0 | `goose:0.1.0` | — |
| `goose-repo-repair` | New → 0.1.0 | `goose:0.1.0` | — |
| `human-approval-workflow` | 0.1.0 → 0.1.1 | `typescript-agent-workflows:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/human-approval-workflow/manifest.json) |
| `image-compositing` | 0.1.0 → 0.1.1 | `typescript-image:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/image-compositing/manifest.json) |
| `image-derivatives` | 0.1.0 → 0.1.1 | `typescript-image:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/image-derivatives/manifest.json) |
| `langchain-data-analysis` | New → 0.1.0 | `langchain-agent:0.1.0` | — |
| `langchain-repo-repair` | New → 0.1.0 | `langchain-agent:0.1.0` | — |
| `mastra-invoice-analysis` | New → 0.1.0 | `mastra-agent:0.1.0` | — |
| `mastra-repo-repair` | New → 0.1.0 | `mastra-agent:0.1.0` | — |
| `mcp-api-test-world` | 0.1.0 → 0.1.1 | `integration-test:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/mcp-api-test-world/manifest.json) |
| `media-project` | 0.1.0 → 0.1.1 | `media-processing:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/media-project/manifest.json) |
| `mini-swe-python-issue` | New → 0.1.0 | `mini-swe-agent:0.1.0` | — |
| `mini-swe-typescript-issue` | New → 0.1.0 | `mini-swe-agent:0.1.0` | — |
| `openapi-tool-client` | 0.1.0 → 0.1.1 | `typescript-openapi:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/openapi-tool-client/manifest.json) |
| `openapi-tool-contracts` | 0.1.0 → 0.1.1 | `typescript-openapi:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/openapi-tool-contracts/manifest.json) |
| `opencode-python-repo` | 0.1.0 → 0.2.0 | `opencode:0.2.0` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/opencode-python-repo/manifest.json) |
| `opencode-typescript-repo` | 0.1.0 → 0.2.0 | `opencode:0.2.0` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/opencode-typescript-repo/manifest.json) |
| `openhands-python-repair` | New → 0.1.0 | `openhands-sdk:0.1.0` | — |
| `openhands-typescript-repair` | New → 0.1.0 | `openhands-sdk:0.1.0` | — |
| `parquet-analytics` | 0.1.0 → 0.1.1 | `typescript-data:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/parquet-analytics/manifest.json) |
| `playwright-app-tests` | New → 0.1.0 | `playwright:0.1.0` | — |
| `playwright-artifact-capture` | New → 0.1.0 | `playwright:0.1.0` | — |
| `postgres-outbox` | 0.1.0 → 0.1.1 | `typescript-api-postgres:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/postgres-outbox/manifest.json) |
| `presentation-workspace` | 0.1.0 → 0.1.1 | `office-artifacts:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/presentation-workspace/manifest.json) |
| `promptfoo-skill-cli-matrix` | New → 0.1.0 | `promptfoo:0.1.0` | — |
| `promptfoo-tool-regression` | New → 0.1.0 | `promptfoo:0.1.0` | — |
| `rag-chunking-workbench` | 0.1.0 → 0.1.1 | `typescript-rag:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/rag-chunking-workbench/manifest.json) |
| `rag-context-assembly` | 0.1.0 → 0.1.1 | `typescript-rag:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/rag-context-assembly/manifest.json) |
| `rag-corpus` | 0.1.0 → 0.1.1 | `retrieval-local:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/rag-corpus/manifest.json) |
| `repo-ready-typescript` | 0.1.0 → 0.1.1 | `coding-workspace:0.1.2` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/repo-ready-typescript/manifest.json) |
| `reporting-workspace` | 0.1.0 → 0.1.1 | `office-artifacts:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/reporting-workspace/manifest.json) |
| `retrieval-evaluation` | 0.1.0 → 0.1.1 | `typescript-evals:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/retrieval-evaluation/manifest.json) |
| `search-ranking-workbench` | 0.1.0 → 0.1.1 | `retrieval-local:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/search-ranking-workbench/manifest.json) |
| `sqlite-job-queue` | 0.1.0 → 0.1.1 | `typescript-sqlite:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/sqlite-job-queue/manifest.json) |
| `sqlite-migration-workbench` | 0.1.0 → 0.1.1 | `typescript-sqlite:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/sqlite-migration-workbench/manifest.json) |
| `stagehand-browser-actions` | New → 0.1.0 | `stagehand:0.1.0` | — |
| `stagehand-structured-extraction` | New → 0.1.0 | `stagehand:0.1.0` | — |
| `tool-card-workbench` | 0.1.0 → 0.1.1 | `typescript-ai-ui:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/tool-card-workbench/manifest.json) |
| `tool-trace-evaluation` | 0.1.0 → 0.1.1 | `typescript-evals:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/tool-trace-evaluation/manifest.json) |
| `typed-event-reducer` | 0.1.0 → 0.1.1 | `typescript-tools:0.1.2` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/typed-event-reducer/manifest.json) |
| `typescript-tool-workbench` | 0.1.0 → 0.1.1 | `typescript-tools:0.1.2` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/typescript-tool-workbench/manifest.json) |
| `webhook-signature-replay` | 0.1.0 → 0.1.1 | `integration-test:0.1.1` | [Prior record](https://github.com/render-examples/sandbox-images/blob/5c517299aa45eee342dc0dab151bb4e9c5bb82a5/snapshots/webhook-signature-replay/manifest.json) |

## Validation boundary

Historical verification records remain tied to their recorded revisions. Their local Docker identities, live model results and hosted evidence apply to the source and package revisions named there. This report preserves those references and does not relabel their results as validation of the TypeScript migration.

Before any candidate is marked passed: complete strict source checks, rebuild the exact images, run the offline workload and independent restore checks, publish immutable identities, and perform the required hosted image/recipe/model checks with cleanup readbacks. Record the actual source commit, published OCI digest and dated evidence only after those steps succeed.

All nine uploaded TypeScript recipes explicitly declare ESM package metadata. The four uploaded local-module recipes (`codebase-research-corpus`, `typed-event-reducer`, `webhook-signature-replay`, `postgres-outbox`) declare `package.json` alongside their canonical runtime files so execution uses explicit ESM package metadata.

## Current commands and release gates

Current Node entry points use `.ts`: `/opt/render/runtime/node-recipe.ts`, prepared `run-agent.ts`, `/opt/render/fixtures/promptfoo/live-matrix.ts`, and uploaded `recipe.ts` / `grader.ts`. Earlier `.mjs` names in dated evidence describe those earlier artifacts. A current manifest with a null digest cannot supply a hosted image reference until the new candidate has been published; do not combine a historical image digest with a changed recipe and call it validated.

The image-check CI matrix depends on the repository type-safety job. Manual image publication also requires a completed successful `check.yml` push run on `main` for the exact source SHA, checked before building and again before pushing. Missing, pending, failed, cancelled or malformed workflow results block publication. The check includes newer reruns rather than accepting an older successful attempt. This is a release gate, not evidence that a new image has already passed hosted validation.

The isolated dependency installer disables lifecycle scripts. After a dependency job fails, it stops scheduling further packages and waits for the jobs already running to settle before returning failure. Its regression tests use synthetic promises; they do not install packages or bypass a held dependency review.

## Final local validation

The image runtime inputs are committed at [`17b046b22cb8b9c570eece6006f9c0c0c03043cb`](https://github.com/render-examples/sandbox-images/commit/17b046b22cb8b9c570eece6006f9c0c0c03043cb). All 110 maintained TypeScript files pass strict checking and the source policy; the tracked tree contains no maintained JavaScript files. All 38 host-tool tests, four launcher-boundary tests, negative policy/compiler tests and manifest/release/upload tests passed. The acceptance checker has 12 passing regression tests.

Twenty-eight final images passed their offline smoke and 57 recipe acceptance checks. Fifty-two scenario-based recipes also passed prepared-filesystem restore in a fresh container. Five legacy uploaded TypeScript recipes passed their local prepare/analyze/verify/corruption checks; their hosted capture/restore is still pending with the rest of this migration. Local Docker image IDs below are not published OCI identities. No model calls or hosted resources were used in these migration checks.

| Image candidate | Locally checked immutable image ID | Recipe checks / native fresh restores |
| --- | --- | --- |
| `claude-code:0.1.1` | `sha256:134a364838b8fa5e056fac5f051b1614173451c8a5902c23f87510e2332bafad` | 2 / 2 |
| `coding-workspace:0.1.2` | `sha256:95b31eba9670b7b28abbb02c01e47a86723e5f5920aae8f2981357190a2029db` | 3 / 1 |
| `cursor-cli:0.1.2` | `sha256:8342850f89b2254e948e91e041b25448ea9fdcfbfb7060cae9f3a926fa0c9450` | 2 / 2 |
| `devin-cli:0.1.1` | `sha256:d2514b01eebbb724aa2b35a47bbba62efa86e9bb8e88b08c0f4d777b9fb3a5c8` | 2 / 2 |
| `goose:0.1.0` | `sha256:b1787dea1dae6daf9f6df6beaf7134f12fa77527b657164421a73ba82141c3c5` | 2 / 2 |
| `integration-test:0.1.1` | `sha256:2bad910fc2bbdc2413aac03280330d100b2adab215ffd51e6b7c7bf1e29b40bf` | 2 / 1 |
| `langchain-agent:0.1.0` | `sha256:456db1cabf2899505b18fb13b5d38d9f5493b4e75c39443e90a30517becd0595` | 2 / 2 |
| `mastra-agent:0.1.0` | `sha256:f1f0e3139ba96b430bb779425a8f6d7c1e9f28d2f2035921f4a51e0a77fba2b7` | 2 / 2 |
| `media-processing:0.1.1` | `sha256:258eea4ca19bcb374018249f5ae9119a5b5ca7e4f6d0bf7d6a4394ab8cffc406` | 2 / 2 |
| `mini-swe-agent:0.1.0` | `sha256:986a21c193abfa2704bddb56bd3c361b82d785cd16a2c3f4254f3684edc4f302` | 2 / 2 |
| `office-artifacts:0.1.1` | `sha256:76db36ac111793b4459eca96d8c593b58330670a61087ec7b666ca8b4158155e` | 2 / 2 |
| `opencode:0.2.0` | `sha256:0d33c68fd7ba29f9498378e692acd68034225f38fed945bfe61d99c5a8406e0b` | 2 / 2 |
| `openhands-sdk:0.1.0` | `sha256:4d1590a438240f86fcb2150be17527ff5fba4fa06381b51037225264d23bd11f` | 2 / 2 |
| `playwright:0.1.0` | `sha256:6751a903c1688777869d253f56e389224717ccba178fa36eb67b6fe18bf8b1fd` | 2 / 2 |
| `retrieval-local:0.1.1` | `sha256:5cf8efced0a197b0cce18ec9690870abf9407f0d67fad8bedeb1c10b48a79e03` | 2 / 2 |
| `stagehand:0.1.0` | `sha256:ab4c18c6c23dd76d47e84a4f685e21d9f758de8bb5ed20a9253d81832e1757f3` | 2 / 2 |
| `typescript-agent-workflows:0.1.1` | `sha256:9addc05b109fcea6f7a17342020542342dc590a3b99d9c21cb8ae8929c34b825` | 2 / 2 |
| `typescript-agents:0.2.0` | `sha256:16aa403bb737046caa9ffe56d72c38702068346f9b00b5a56f5ee876021d4cbb` | 2 / 2 |
| `typescript-ai-gateway:0.2.0` | `sha256:17c90dacd81043f2bf0ac880a209832464d2b0ff23109bce24b9ca7ee45579bc` | 2 / 2 |
| `typescript-ai-ui:0.1.1` | `sha256:a0db571119cf38cd42d17ea4ea5ccbab67b21e9129a9b19280331a8b0160e953` | 2 / 2 |
| `typescript-api-postgres:0.1.1` | `sha256:439f372b751364bae891733e0a86adfb2947d3450dc6da86dc8b86f8ce69779b` | 2 / 1 |
| `typescript-data:0.1.1` | `sha256:a65fb8b353409a0bb3248f4094918cb321dd032ce4aa0a29c61808947e177d9f` | 2 / 2 |
| `typescript-evals:0.1.1` | `sha256:1524fb0aedd3afb443f29ae9faed6e5d0134d426f5411dfae89233f879a9c4b1` | 2 / 2 |
| `typescript-image:0.1.1` | `sha256:7979418e712e183e04fcfd8aed072b61e94edf6f6b7eef0d7d827f424408a79d` | 2 / 2 |
| `typescript-openapi:0.1.1` | `sha256:a1bc0b8d44fefe1c75f31c3da57264a1584c49805af98a2cadec5e3be9714da9` | 2 / 2 |
| `typescript-rag:0.1.1` | `sha256:5e3450619e24b678cb333fc56b34d3ef77098792ccb6f3143205c2bfe30e728b` | 2 / 2 |
| `typescript-sqlite:0.1.1` | `sha256:65c56966d76dd57e28dd00606243a6214adf6bf91153c063844fc1320d899aa6` | 2 / 2 |
| `typescript-tools:0.1.2` | `sha256:07216b7c5644c9161ea903ad134d14ad65d6ee871a7644b258b74f6f99ea3039` | 2 / 1 |

### Cursor timing correction

Two Cursor TypeScript checks exceeded the checker's single 120-second budget for all four acceptance phases. With the same immutable image, separate timing showed prepare at 0 seconds, analyze at 15 seconds, verify at 7 seconds and corruption testing at 94 seconds. Each phase passed within 120 seconds; the previous combined limit was too tight under amd64 emulation. The checker now gives each phase 120 seconds in the same container, with a 500-second outer watchdog for four phases, and stops immediately if a phase fails. The unchanged image passed the full checker and both fresh restores after this correction. Original timeout logs and phase timings are retained locally.

### Remaining holds

Codex's first migrated build installed its pinned optional Linux binary, then exposed missing ESM package metadata. After fixing the package metadata, a later install omitted `@openai/codex-linux-x64` and CLI startup failed. The local Aikido event checker is unavailable; the requested desktop log check remains pending. Codex and promptfoo rebuilds are held, with no alternate registry, package or protection bypass. Their four recipes are excluded from the 57 passing checks above. Docling remains outside this source batch under its separate dependency-download hold.

The migration pushes intentionally skip automatic CI to avoid retrying the held Codex install. This does not establish a CI pass: the earlier 48 successful checks belong only to `4953e6d4f84b894c6a6041343251751367af0749`. CI enforcement remains configured and must be run successfully before publication. When the hold is resolved, resume with a normal commit and avoid carrying CI-skip markers into the merge commit.

The publication gate's read-only probe passed against existing main `5c517299aa45eee342dc0dab151bb4e9c5bb82a5`, check run `41994235009`, attempt 1. That verifies the endpoint and decoder only. Required repository review, main-branch merge, private OCI publication, hosted image/recipe/model validation and registry reconciliation remain pending. All 91 affected Notion records have canonical repository links, review status and pending CI; historical evidence remains scoped to its recorded versions.
