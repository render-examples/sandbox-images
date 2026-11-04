# Audio processing

Trim and resample synthetic stereo audio to mono; decode PCM and verify duration, sample count and signal energy.

Uses [TypeScript media processing](../../images/media-processing) version 0.1.0. `prepare` writes a concrete synthetic input dataset and a baseline hash manifest under `/workspace/audio-processing`. Capture the filesystem after preparation, before any workload output exists. Installed dependencies and workload code live in the image; the snapshot preserves inputs, not a running process.

```sh
bash recipe.sh prepare
bash recipe.sh analyze
bash recipe.sh verify
bash recipe.sh test
```

The caller uploads only `recipe.sh` and `recipe.json` as mode-0600 files and invokes Bash explicitly. An existing upload directory is accepted, but prepared state is never overwritten. `analyze` uses immutable `input/`, disposable `work/` and `/workspace/output`. `verify` decodes actual output artifacts and checks expected semantics, prepared-input hashes and output SHA-256 hashes. The test command corrupts the baseline, an input and each output, requires failure with receipt invalidation, then regenerates artifacts.

Expected summary: `{"sampleRate":16000,"channels":1,"samples":16000,"durationSeconds":1,"nonzeroSamples":true}`.

Outputs: `clip.wav`, `summary.json`, and `verification.json`.

Media is generated from FFmpeg testsrc/sine sources. Validation decodes the outputs and checks dimensions, duration, sample counts and signal content; it is not a performance benchmark.

No external network, credentials or user data are required. Snapshots remain local to the caller's Render sandbox group. Version 0.1.0 is draft/unverified: local checks do not establish live Render capture/restore or a published image digest.
