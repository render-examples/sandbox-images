# TypeScript media processing

Run bounded FFmpeg transforms and inspect decoded audio/video artifacts from TypeScript or Node.

The Node 24 Bookworm base is pinned by digest. Installed npm dependencies are exact versions with integrity hashes in `fixture/package-lock.json`; TypeScript is available on the default PATH. `/workspace/node_modules` links to the installed packages, so scripts in `/workspace` can use bare ESM imports without installing dependencies.

`typescript@7.0.2`, `sharp@0.35.5`; Debian FFmpeg `7:5.1.9-0+deb12u1` is pinned in the Dockerfile.

Media is generated from FFmpeg testsrc/sine sources. Validation decodes the outputs and checks dimensions, duration, sample counts and signal content; it is not a performance benchmark.

## Prepared recipes

- [Media project](../../snapshots/media-project): Transcode a synthetic test-pattern video and build a contact sheet; check duration, frames, dimensions and decoding.
- [Audio processing](../../snapshots/audio-processing): Trim and resample synthetic stereo audio to mono; decode PCM and verify duration, sample count and signal energy.

Run `python3 scripts/check-image.py media-processing` for smoke and all recipe checks with Docker networking disabled. The runtime uses explicit prepare/analyze/verify/test steps, bounded execution, independent semantic checks, input hashes and artifact integrity checks.

Version 0.1.0 remains draft/unverified until publication and live Render import/capture/restore evidence are recorded. Local container results are separate evidence. All fixture content is synthetic and MIT-licensed; dependencies retain their upstream licenses.

Primary reference: [FFmpeg documentation](https://ffmpeg.org/ffmpeg-filters.html).
