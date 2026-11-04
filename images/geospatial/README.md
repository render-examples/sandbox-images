# Geospatial

Transform GeoJSON coordinates and evaluate spatial relationships with offline GEOS and PROJ runtimes.

Live Render validation: Passed for image 0.1.0. The GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Linux/amd64, CPU only. Dependencies are pinned; synthetic fixtures require no provider credentials or model downloads. Included recipes: `geojson-transform`, `spatial-join`.

Image smoke executes a real workload and independent semantic verification. Snapshot recipes prepare input-only filesystem state; analyze regenerates outputs, verify checks their contents and hashes, and test rejects input/baseline/artifact corruption.
