# AI routing workbench

Route SDK requests through a local gateway and fall back after a synthetic provider failure.

Uses [TypeScript AI gateway](../../images/typescript-ai-gateway/README.md). Inputs are synthetic, bundled and offline. This is a filesystem recipe, not an existing hosted snapshot.

Upload the two declared execution files into `/workspace/ai-routing-workbench` (the upload directory may already exist), then run:

```sh
bash recipe.sh prepare
# Capture /workspace/ai-routing-workbench now; execution outputs must still be absent.
# Restore prepared state into a clean sandbox using the same image.
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

`prepare` creates immutable inputs and a hash baseline. `analyze` generates artifacts in `/workspace/output` and writes a receipt only after semantic verification. `verify` checks input identity, decoded artifacts and receipt hashes. `test` rejects corrupted input, baseline and artifacts, then proves fresh output regeneration. Expected summary:

```json
{
  "requests": 2,
  "primaryCalls": 2,
  "fallbackCalls": 1,
  "failovers": 1
}
```

Dependencies are installed in the image; preparation and restore require no network downloads. No secrets or model credentials are needed. Local filesystem-copy checks are separate from Render capture/restore, which remains unverified until dated live evidence is recorded. Snapshots are scoped to their Render sandbox group.
