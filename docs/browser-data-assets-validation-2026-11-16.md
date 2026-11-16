# Browser and data assets: validation checkpoint, 2026-11-16

Five new images and ten filesystem recipes are implemented in source. All release manifests remain draft/unverified with null source revision and image digest until the coordinator publishes a reviewed candidate and validates that exact digest on Render. Authenticated model evidence below is separate from offline container checks. No hosted Render validation or public package access is claimed here.

| Asset | Observed local evidence | Remaining evidence |
| --- | --- | --- |
| Playwright | Strict TypeScript checks; image build; real Chromium smoke; both recipe lifecycles; corruption/regeneration; fresh-container restore passed. | Final frozen-input full checker passed; publication and hosted exact-digest image/snapshot checks pending. |
| LlamaIndex | Real CPU ONNX embeddings; persisted index retrieval/update and identity rejection; full Docker smoke and both recipe corruption/restore checks passed. | Publication and hosted exact-digest image/snapshot checks. |
| Docling | Real CPU layout and accurate table inference; all cells/total, reading order, page provenance, malformed document rejection passed locally. | Docker build and one bounded retry blocked by interrupted CPU PyTorch HTTPS download (SSL bad record MAC); publication and hosted checks pending. |
| Stagehand | Strict TypeScript checks; full Docker smoke, both recipe corruption/regeneration checks and fresh-container restores passed using v4 APIs. | Final repeat after partial-start cleanup hardening; authenticated OpenAI/Google routes; publication and hosted checks. |
| Browser Use | Python compilation, provider constructor probes, full final Docker smoke, both recipe corruption/regeneration checks and fresh-container restores passed with real local Browser Use/browser-harness Chromium. | Google and OpenRouter model routes passed; publication and hosted checks pending. |

## Commands and evidence boundaries

- `npm run --prefix images/playwright/fixture typecheck`
- `npm run --prefix images/stagehand/fixture typecheck`
- `python3 scripts/check-image.py IMAGE_SLUG`
- Direct isolated Python workload runs for LlamaIndex and Docling, with downloaded model artifacts hash-checked and offline mode enabled.
- `python3 -m py_compile images/browser-use/*.py images/llamaindex/*.py images/docling/*.py`

Docker checker results establish local Linux/amd64 behavior under offline networking, 2 GB memory and bounded subprocess execution. A separate container restores each prepared filesystem and checks outputs. Local checked-image receipts are generated in ignored `artifacts/checked-SLUG.json`. Those Docker image IDs are not published GHCR digests and are not copied into release metadata.

## Fixes discovered by actual validation

LlamaIndex FastEmbed's integration requires Python below 3.13, so the image uses the resolved official Python 3.12 image digest and a Linux/Python3.12 dependency lock. Both index scenarios pass real CPU embeddings; no scripted vectors are used.

Docling's fast table model failed the independent cell oracle. The accurate model and a clear heading fixture pass the semantic checks. No failure was relabeled as successful, and scanned-document OCR is not claimed by the digital-PDF acceptance tests.

Stagehand 4.4.0 uses `localBrowser.launch`/`Stagehand.create`; the implementation does not reuse obsolete v3 initialization. Its page viewport is set explicitly after attachment. Zod is aligned with the SDK's exact version to keep strict schema types valid.

Browser Use 1.0 defaults to cloud execution. Both local smoke and authenticated launchers explicitly select Chromium, with no cloud fallback. Provider configurations include OpenAI, Google and OpenRouter; supported configuration is not a claim that those live routes have passed.

## Model provenance

LlamaIndex pins the MIT Qdrant BGE small ONNX model at `aa8f8b060edb00e03bfdd08813a2949946c8ba55`. Docling pins Apache-2.0 layout Heron at `8f39ad3c0b4c58e9c2d2c84a38465abf757272d8` and CDLA-Permissive-2.0 TableFormer v2.3.0 at `fc0f2d45e2218ea24bce5045f58a389aed16dc23`. Model lockfiles contain verified SHA-256 values; upstream model cards ship in the images. Large model files remain out of Git and are downloaded with immutable URLs during build.

Docling Docker build failed twice while streaming the pinned CPU PyTorch wheel, with `SSL: DECRYPTION_FAILED_OR_BAD_RECORD_MAC`. TLS and package-hash verification were retained. The endpoint-protection diagnostic symlink points to an absent application, so no event history was available. No registry change, certificate bypass or further retry was attempted. This is a build blocker, not a passing container result.

Browser Use final Docker verification passed after adding the exact `libatomic1` version required by Playwright’s bundled Node binary. The first attempt failed before Chromium installation and was not counted as a pass.

## Authenticated local model runs

Browser Use ran the real full agent in fresh Docker containers, each prepared from its native snapshot recipe. These are local model executions, not Render capture/restore evidence. Credentials were supplied only at runtime; logs were redacted and no keys were written to source or prepared inputs. Each run independently checked server-side submission, typed table values and a decoded screenshot, then removed its owned container.

| Image | Provider route | Requested model | Steps | Seconds | Result |
| --- | --- | --- | ---: | ---: | --- |
| Browser Use | google | `gemini-4-hydrogen` | 4 | 19.42 | Passed |
| Browser Use | openrouter | `openai/gpt-6.1-terra` | 4 | 26.71 | Passed |

Model identifiers are the explicitly requested routes; the receipt does not independently attest to an upstream provider’s internal model implementation. Local raw evidence remains in ignored `evidence/browser-data-models-2026-11-16/`; the coordinator should pin this report to the reviewed source commit.
