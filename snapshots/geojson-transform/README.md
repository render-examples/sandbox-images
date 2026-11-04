# GeoJSON transform

Project synthetic GeoJSON to Web Mercator and verify equations, axis order and round-trip coordinates.

Live Render capture/restore: Passed for recipe 0.1.0 using `geospatial:0.1.0`. The parent GHCR package is private and requires access. The registry entry remains draft pending public distribution. See the [validation report](https://github.com/render-examples/sandbox-images/blob/4abc860a6c9d0a6d73c3898605c4c9e2ec070651/docs/catalog-live-validation-2026-11-04.md).

Parent image: `geospatial`. This is a filesystem recipe using synthetic inputs, not a live service or a hosted model.

Run `bash recipe.sh prepare` once before capture. The image runtime supplies the workload and dependencies. Capture `/workspace/geojson-transform` before running analysis. After restore, run `bash recipe.sh analyze`, `bash recipe.sh verify`, and `bash recipe.sh test`. Preparation creates inputs and a hash-bound baseline without final outputs; analysis executes the workload; verification independently checks semantics and hashes; test corrupts inputs and outputs, requires rejection, then regenerates them.

All uploaded recipe files may be mode 0600 because the entrypoint uses `bash` explicitly. The shared runtime is invoked using its interpreter. No provider keys, production data or model downloads are required.
