# OpenAPI tool client

Generate TypeScript definitions, compile a client, reject an incompatible response type, and exercise a loopback API.

Uses [TypeScript OpenAPI tools](../../images/typescript-openapi/README.md). Inputs are synthetic, bundled and offline. This is a filesystem recipe, not an existing hosted snapshot.

Upload the two declared execution files into `/workspace/openapi-tool-client` (the upload directory may already exist), then run:

```sh
bash recipe.sh prepare
# Capture /workspace/openapi-tool-client now; execution outputs must still be absent.
# Restore prepared state into a clean sandbox using the same image.
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

`prepare` creates immutable inputs and a hash baseline. `analyze` generates artifacts in `/workspace/output` and writes a receipt only after semantic verification. `verify` checks input identity, decoded artifacts and receipt hashes. `test` rejects corrupted input, baseline and artifacts, then proves fresh output regeneration. Expected summary:

```json
{
  "generatedTypes": true,
  "typeErrorsRejected": 1,
  "requests": 1,
  "totalCents": 3250
}
```

Dependencies are installed in the image; preparation and restore require no network downloads. No secrets or model credentials are needed. Local filesystem-copy checks are separate from Render capture/restore, which remains unverified until dated live evidence is recorded. Snapshots are scoped to their Render sandbox group.
