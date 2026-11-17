# Image security checks

Every image must pass its offline workload checks and security scan before the
publisher can push it to GHCR. A source change or a successful build is not a
security result.

## What blocks publication

The image gate uses Trivy 0.76.2 and a vulnerability database updated within the
last 24 hours. It blocks high and critical findings with an available fix, and
all detected secrets in the image filesystem or configuration. Scanner errors,
missing package inventory and stale evidence also block publication.

Findings without an available fix and lower-severity findings remain in the
report. Passing the gate does not mean the image has no known vulnerabilities.

Gitleaks 8.30.1 scans Git history and the checked-out source. Its only allowlist
covers two exact output checksums in the November 4 validation report. Detected
credential values are redacted from logs and uploaded reports.

The scanner reads the immutable image ID from the acceptance-test receipt. The
publisher verifies that ID, the configuration digest, scan age and artifact
hashes immediately before pushing. Each publication artifact includes a
CycloneDX SBOM, the scan report, source revision and OCI digest.

## Findings that need interpretation

Debian's `linux-libc-dev` package contains kernel headers. Matches against the
Linux kernel remain in the report but do not block these images: the guest
image does not supply Render's running host kernel. This exception applies only
to that Debian package, not to user-space C libraries.

Pip 26.3's embedded SBOM lists `setuptools@70.3.0` for its vendored
`pkg_resources`. CVE-2025-47273 affects `setuptools.package_index`, which is absent
from these images. The gate excludes only that CVE/version when Trivy identifies
the component from an SBOM. Before accepting the exception, it starts the tested
image offline and verifies that setuptools is not importable and that pip
and all installed Python packages contain no `package_index.py`. A normally installed setuptools package still
fails the gate. See the [upstream advisory](https://github.com/advisories/GHSA-5rjg-fvgr-3xxf).

## Security-update candidates

The candidates refresh the Node, Python 3.13, PostgreSQL and pgvector base
images, including the APT security fix. All 46 images use the shared security
updates and pass through the same scan gate. Node images use npm 11.21.2; Python images use pip 26.3. Additional
Debian fixes pin the patched libpq and zlib packages where needed.

Image fixtures that used TypeScript 7 now use the JavaScript compiler in
TypeScript 6.0.3 while the published TypeScript 7.0.2 native compiler still bundles an affected Go runtime.
The dependency locks remove that native compiler. Restore TypeScript 7 after an
upstream update passes the same workloads and security checks. The repository
type-policy checker keeps TypeScript 7 for its compiler API; it is not shipped
in the images.

The Office image pins `image-size` 2.1.0 and `uuid` 11.1.1 through dependency
overrides. Its build includes a regression test for a malformed ICNS input that
previously caused an infinite loop. Database fixtures use Debian's `runuser`;
the unused upstream `gosu` binary is removed.

New image and recipe versions start unverified. Publishing a patched image does
not change existing snapshots. Recreate snapshots from the new digest and run
fresh Render import, workload, capture and restore tests before recording live
verification.

GitHub's built-in secret scanning and push protection are currently disabled by
enterprise policy. The repository API rejected enabling them on November 16,
2026. The CI scans above run independently of those settings.
