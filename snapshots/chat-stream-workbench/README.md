# Chat stream workbench

Decode UTF-8 text across stream boundaries, render incremental React updates, and verify accessible escaped SSR markup.

Live Render capture/restore: Passed for recipe 0.1.0 using `typescript-ai-ui:0.1.0`. The parent GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Uses [TypeScript AI interfaces](../../images/typescript-ai-ui/README.md). Inputs are synthetic, bundled and offline. This is a filesystem recipe, not an existing hosted snapshot.

Upload the two declared execution files into `/workspace/chat-stream-workbench` (the upload directory may already exist), then run:

```sh
bash recipe.sh prepare
# Capture /workspace/chat-stream-workbench now; execution outputs must still be absent.
# Restore prepared state into a clean sandbox using the same image.
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

`prepare` creates immutable inputs and a hash baseline. `analyze` generates artifacts in `/workspace/output` and writes a receipt only after semantic verification. `verify` checks input identity, decoded artifacts and receipt hashes. `test` rejects corrupted input, baseline and artifacts, then proves fresh output regeneration. Expected summary:

```json
{
  "chunks": 4,
  "renderedUpdates": 3,
  "escapedMarkup": true,
  "completed": true
}
```

Dependencies are installed in the image; preparation and restore require no network downloads. No secrets or model credentials are needed.  Snapshots are scoped to their Render sandbox group.
