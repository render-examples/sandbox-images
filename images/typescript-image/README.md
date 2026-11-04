# TypeScript image processing

Decode, resize and composite image artifacts with Sharp, validating dimensions and pixels.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

The Node 24 Bookworm base is pinned by digest. Installed npm dependencies are exact versions with integrity hashes in `fixture/package-lock.json`; TypeScript is available on the default PATH. `/workspace/node_modules` links to the installed packages, so scripts in `/workspace` can use bare ESM imports without installing dependencies.

`typescript@7.0.2`, `sharp@0.35.5`.

Pixel checks decode actual PNG/WebP output; no browser or external image assets are used.

## Prepared recipes

- [Image derivatives](../../snapshots/image-derivatives): Generate lossless PNG/WebP derivatives from a synthetic quadrant image and check eight decoded pixel samples.
- [Image compositing](../../snapshots/image-compositing): Composite a positioned overlay and count actual decoded foreground and background pixels.

Run `python3 scripts/check-image.py typescript-image` for smoke and all recipe checks with Docker networking disabled. The runtime uses explicit prepare/analyze/verify/test steps, bounded execution, independent semantic checks, input hashes and artifact integrity checks.

All fixture content is synthetic and MIT-licensed; dependencies retain their upstream licenses.

Primary reference: [Sharp documentation](https://sharp.pixelplumbing.com/).
