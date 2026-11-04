# TypeScript image processing

Decode, resize and composite image artifacts with Sharp, validating dimensions and pixels.

The Node 24 Bookworm base is pinned by digest. Installed npm dependencies are exact versions with integrity hashes in `fixture/package-lock.json`; TypeScript is available on the default PATH. `/workspace/node_modules` links to the installed packages, so scripts in `/workspace` can use bare ESM imports without installing dependencies.

`typescript@7.0.2`, `sharp@0.35.5`.

Pixel checks decode actual PNG/WebP output; no browser or external image assets are used.

## Prepared recipes

- [Image derivatives](../../snapshots/image-derivatives): Generate lossless PNG/WebP derivatives from a synthetic quadrant image and check eight decoded pixel samples.
- [Image compositing](../../snapshots/image-compositing): Composite a positioned overlay and count actual decoded foreground and background pixels.

Run `python3 scripts/check-image.py typescript-image` for smoke and all recipe checks with Docker networking disabled. The runtime uses explicit prepare/analyze/verify/test steps, bounded execution, independent semantic checks, input hashes and artifact integrity checks.

Version 0.1.0 remains draft/unverified until publication and live Render import/capture/restore evidence are recorded. Local container results are separate evidence. All fixture content is synthetic and MIT-licensed; dependencies retain their upstream licenses.

Primary reference: [Sharp documentation](https://sharp.pixelplumbing.com/).
