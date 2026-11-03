# Python analysis

An offline analytics environment for CSV, Parquet and XLSX inputs. It includes
Python 3.13, pandas, NumPy, DuckDB, PyArrow, Matplotlib and openpyxl. Exact versions
and all transitive dependency hashes live in `requirements.lock`.

This image is a development candidate. A successful local container test does not
establish Render compatibility or make the GHCR package available. Consult
`manifest.json` for publication and Render verification state.

## Workload contract

- Work in `/workspace`; place retrieved artifacts in `/workspace/output`.
- Use `python` or `python3`. The image does not install packages at runtime.
- The bundled smoke workload requires no credentials or network access.
- Run `timeout -k 5 120 python /opt/render/examples/python-analysis/smoke.py`.
- Success exits zero and writes `result.json`, `totals.csv`, `totals.parquet`, and
  `revenue.png`. The fixture must aggregate to 4500 cents and a 600 by 400 PNG.
- The test exercises null handling, deduplication, CSV and XLSX reads, a Parquet
  join, DuckDB aggregation, NumPy, chart decoding and a Parquet round trip.

The image includes a normal Debian shell and basic utilities. It is CPU-only and
contains no browser, scraping stack, notebook server or hosted agent credentials.
openpyxl reads/writes workbooks; it does not recalculate spreadsheet formulas.

## Build and check

From the repository root:

```sh
python3 scripts/check-image.py python-analysis
```

See the root README for snapshot preparation and registry publication. Keep
customer inputs, runtime credentials and output artifacts outside the build
context. Rebuild and rerun checks when updating the digest-pinned base or lock.

To regenerate the lock using uv:

```sh
uv pip compile images/python-analysis/requirements.in --python-version 3.13 \
  --python-platform x86_64-manylinux_2_28 --generate-hashes --no-header \
  --output-file images/python-analysis/requirements.lock
```
