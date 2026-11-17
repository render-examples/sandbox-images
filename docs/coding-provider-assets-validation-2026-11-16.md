# Coding and provider asset validation

These are local container and authenticated results. Hosted Render validation and private package publication remain pending. Source is under review in [PR #20](https://github.com/render-examples/sandbox-images/pull/20), with public source publication explicitly approved. New candidate manifests remain draft and unverified.

| Image | Candidate | Full offline checker | Immutable local image ID |
| --- | --- | --- | --- |
| `opencode` | 0.2.0 | Passed | `sha256:6ce3c6b5e78a10588be32ec6eb39f87ce0002cf9fe92862864e0986a23bc4818` |
| `typescript-ai-gateway` | 0.2.0 | Passed | `sha256:5c7c263ec0b0f00f8a2d67e6cdaeaf54ee75be07efc55b63adc64b82dd55ee84` |
| `typescript-agents` | 0.2.0 | Passed | `sha256:ceced66f8f80c9d244ad993155527273d642a01682cc355fea6fbaffc0d2cf48` |
| `mini-swe-agent` | 0.1.0 | Passed | `sha256:68bff1bf43a7bd9d2f49d7fa37f2667dacc1a8a475a593685632378e9ad76b7e` |
| `openhands-sdk` | 0.1.0 | Passed | `sha256:bec6e1a3adda07425f09ed3075b7f461e7bfef2a938e07bd673a5d47b3754d9d` |
| `goose` | 0.1.0 | Passed | `sha256:8a9b96cd3fff4a6e09fb030f195d53fad3cd0c29ceb9cdba6a68a3aace9f1b46` |

The full checker covers installed tools, image workload, both recipe workloads, corruption rejection, regeneration and prepared filesystem restore in a fresh container. Local IDs are not published OCI digests.

## Authenticated final-image results

- AI SDK: four runs passed, covering tool calling and structured output on direct Google Gemini 4 Hydrogen and OpenRouter GPT 6.1 Terra. Exact parsed invoice fields and integer total are independently asserted; tool runs require an actual tool invocation.
- Gateway/OpenRouter: both Google Gemini 4 Hydrogen and OpenAI GPT 6.1 Terra passed actual invoice tool execution and exact final JSON validation. Tool selection and JSON output occur in separate turns for Google compatibility.
- Goose: four runs passed, covering TypeScript repair and the Python-plus-MCP task on both OpenRouter models. Independent hidden repair checks passed. MCP runs also require a recorded real tool invocation and the exact invoice artifact, rather than counting CLI exit alone.
- OpenCode, OpenHands and mini-SWE-agent results are recorded separately in [the coding-agent model report](coding-agent-model-validation-2026-11-16.md).

OpenCode’s final search-binary image passed a separate actual grep-tool smoke; its earlier full coding matrix remains attributed to its original image ID in the coding-agent report.

All model calls used approved runtime-only credentials and synthetic fixtures. Direct OpenAI/Anthropic endpoints were not exercised. Raw local transcripts and receipts remain ignored. The final AI SDK/Goose receipts are under `evidence/parent-model-final-v2/`, and gateway receipts under `evidence/parent-gateway-final/`. All temporary containers were removed successfully.

## Preserved failures and fixes

- The initial host harness prepared inputs under each canonical recipe directory but invoked helpers against `/workspace/task`. Those calls failed before model execution. The harness now uses the canonical prepared directory; failed receipts remain separate.
- Google rejects forced function calling combined with JSON response mode. The gateway now requests the actual tool first and structured final output second; both model routes passed afterward.
- An earlier Terra gateway answer used “3,250 cents”; a substring grader rejected it. Final grading now requires exact structured fields rather than parsing prose.
- OpenHands depends on source-only `func-timeout==4.3.5`. Its build permits only that source package with pinned source hash and build tools; the corrected full checker passed.
- Goose's first checker timed out during a TypeScript recipe under concurrent local load. The exact-image retest passed, as did the final MCP-aware image checks and actual model matrix.
- mini-SWE-agent now registers conservative current OpenRouter pricing while retaining strict cost tracking. Its build-time pricing regressions and all four final actual model cells passed; the four original failures remain recorded.

## Remaining gates

Internal image publication, immutable release receipts, hosted import/workload/capture/restore, authenticated execution after restore, cleanup and registry reconciliation remain pending. No website guide work has begun.
