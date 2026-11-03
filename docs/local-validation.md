# Local validation — November 3, 2026

These results concern the development candidate in this checkout. They do not
establish GHCR publication or Render import, execution, snapshot capture or
restore. Both source manifests remain draft/unverified.

## Environment and exact base

- Docker Engine 29.6.1 on Docker Desktop; target `linux/amd64`.
- Official Python 3.13.18 slim Bookworm image, amd64 manifest digest:
  `sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9`.
- All 16 Python application packages installed from binary wheels with exact
  versions and required hashes. `pip check` reports no broken requirements.
- Required commands found: `sh`, `bash`, `timeout`, `cat`, `mkdir`, `mount`,
  `pivot_root`, and `umount`.

## Functional results

`python3 scripts/check-image.py python-analysis --skip-build` passed with
network access disabled in the workload containers:

- Image fixture: deduplicate and clean CSV, join Parquet, read XLSX, query using
  DuckDB, aggregate using NumPy, and generate checked CSV/Parquet/PNG outputs.
  Expected total: **4500 cents**; chart: **600 × 400**.
- Snapshot fixture: prepare, analyze and verify synthetic CSV/Parquet/XLSX
  data. Expected total: **21200 cents**, east **14100**, west **7100**;
  seven source orders, six cleaned orders, one duplicate, one missing quantity.
- Snapshot corruption checks: **3 passed**, including changed source and
  corrupted output rejection.
- Export publication gates: **5 passed**. A digest or local test alone cannot
  turn an asset into a verified registry release.
- Registry version guards: **4 passed**. Existing manifests, authentication
  errors, transient errors and generic not-found responses cannot pass the
  release-absence check.
- The build explicitly loads its single-platform result. Workloads execute by
  immutable Docker image ID, and the check receipt also records the config
  digest for comparing the eventual pushed artifact across Docker storage backends.

## Still required before a verified release

- Publish a candidate image and verify anonymous pull by digest.
- Run the host controller against a deliberately selected Render workspace
  and group; verify import, guest execution, capture, restoration, output
  collection and cleanup.
- Record public reviewed evidence and immutable source/image references.
- Exercise the GitHub workflows in their actual repository. Local workload
  success does not establish GitHub Actions execution.

A temporary localhost registry push probe did not reach the host's loopback
binding from the Docker Desktop daemon. The temporary registry was stopped and
removed. No remote registry push was attempted, and this probe is not publication
evidence.
