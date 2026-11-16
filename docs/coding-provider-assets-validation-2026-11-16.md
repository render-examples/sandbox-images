# Coding and provider asset validation

These are local container and authenticated preflight results. None establish new hosted Render or publication success. New candidate manifests remain draft and unverified. The source branch is staged locally; public source publication awaits explicit destination approval.

| Image | Candidate | Full offline checker | Immutable local image ID |
| --- | --- | --- | --- |
| `opencode` | 0.2.0 | Passed | `sha256:5cd9a7a78e3450dbd522f948300e61eaa33e24620232173c982bb67d6f332f6d` |
| `typescript-ai-gateway` | 0.2.0 | Passed | `sha256:e5353c38e12ee04e8656098db75066ffdb6d9456e4a8deff13fcd5d539834946` |
| `typescript-agents` | 0.2.0 | Passed | `sha256:8cd97ab61d9748a94767d7f1f0c39182cd37bff1a3e9309b626a09c9ebe90002` |
| `mini-swe-agent` | 0.1.0 | Passed | `sha256:ca1efff1fd566ba0fecd4a2108c7baab931c643f7eac1af3df06547889d0bdf5` |
| `openhands-sdk` | 0.1.0 | Pending / see notes | — |
| `goose` | 0.1.0 | Pending / see notes | — |

The full checker covers installed tools, image workload, both recipe workloads, corruption rejection, regeneration and prepared filesystem restore in a fresh container. Local IDs are not published OCI digests.

## Authenticated preflight

- Gateway/OpenRouter: Google Gemini 4 Hydrogen and OpenAI GPT 6.1 Terra both executed the actual invoice tool and returned the independently known total.
- AI SDK: tool calling and structured output passed through Google Gemini 4 Hydrogen and OpenRouter GPT 6.1 Terra (four runs).
- These calls ran locally, before the later evaluator credential action was rejected. Further model calls are paused pending explicit approval of the existing key source and external destinations.
- First Terra gateway preflight correctly answered “3,250 cents”; the old string check wrongly rejected comma formatting. The checker now accepts the numeric grouping and the retest passed. This was a grader failure, not an incorrect model answer.

## Build findings

- OpenHands includes `func-timeout==4.3.5`, which PyPI distributes only as source. The initial binary-only build failed. The candidate now pins its build backend and source hash and allows source building only for that package; the corrected build is being checked.
- Goose startup is fast offline (roughly 0.07 seconds for version/help). Its MCP recipe passed actual protocol/output and restore checks, but the first full checker hit the 120-second bound during the TypeScript recipe under parallel local load. Exact-image retest is in progress; no full pass is claimed until it finishes.

## Remaining gates

Internal image publication, immutable release receipts, hosted import/workload/capture/restore, two supported model routes after restore, cleanup and registry reconciliation remain pending. No website guide work has begun.
