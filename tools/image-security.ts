import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const scannerVersion = '0.76.2';
export const pipMetadataCheck = "import importlib.util,pathlib,pip,sysconfig; root=pathlib.Path(pip.__file__).parent; installed=pathlib.Path(sysconfig.get_paths()['purelib']); assert importlib.util.find_spec('setuptools') is None; assert not list(installed.rglob('package_index.py')); assert (root/'_vendor/pkg_resources').is_dir()";
const maxAgeMs = 24 * 60 * 60 * 1000;
type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected JSON object');
  return value as ObjectValue;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected JSON array');
  return value;
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected JSON string');
  return value;
}
export function assertFresh(timestamp: unknown, now = Date.now()): void {
  const time = Date.parse(string(timestamp));
  if (!Number.isFinite(time) || time > now + 5 * 60 * 1000 || now - time > maxAgeMs) {
    throw new Error('Security evidence must be less than 24 hours old');
  }
}
export function checkedImage(value: unknown): { imageId: string; configDigest: string; slug: string; version: string } {
  const receipt = object(value);
  for (const key of ['imageId', 'configDigest']) {
    if (!/^sha256:[a-f0-9]{64}$/.test(string(receipt[key]))) throw new Error('Invalid image digest');
  }
  if (receipt.schemaVersion !== 1 || receipt.platform !== 'linux/amd64' || receipt.localChecksPassed !== true) {
    throw new Error('Image has not passed local acceptance checks');
  }
  return { imageId: string(receipt.imageId), configDigest: string(receipt.configDigest), slug: string(receipt.slug), version: string(receipt.version) };
}
export interface Finding {
  target: string;
  id: string;
  package: string;
  installed: string;
  fixed: string;
  severity: string;
  type: string;
  metadataOnly: boolean;
}
export function evaluateReport(value: unknown): { blockers: Finding[]; findings: Finding[]; secretCount: number; packageCount: number } {
  const report = object(value);
  if (report.SchemaVersion !== 2 || report.ArtifactType !== 'container_image') throw new Error('Unsupported image scan report');
  const results = array(report.Results);
  let packageCount = 0, secretCount = 0;
  const findings: Finding[] = [];
  for (const entry of results) {
    const result = object(entry);
    const target = string(result.Target);
    packageCount += array(result.Packages ?? []).length;
    secretCount += array(result.Secrets ?? []).length;
    for (const value of array(result.Vulnerabilities ?? [])) {
      const v = object(value);
      findings.push({ target, id: string(v.VulnerabilityID), package: string(v.PkgName), installed: string(v.InstalledVersion), fixed: string(v.FixedVersion ?? ''), severity: string(v.Severity), type: string(result.Type ?? ''), metadataOnly: array(result.Packages ?? []).some(p => { const pkg = object(p); return pkg.ID === v.PkgID && pkg.AnalyzedBy === 'sbom' && !pkg.FilePath; }) });
    }
  }
  if (packageCount === 0) throw new Error('Scan contains no package inventory');
  // Kernel headers are build-time declarations, not the sandbox host's running kernel.
  // Retain these matches in the report; never suppress user-space packages.
  const blockers = findings.filter(v => ['HIGH', 'CRITICAL'].includes(v.severity) && v.fixed.trim() !== '' && !(v.package === 'linux-libc-dev' && v.type === 'debian') && !isPipMetadataFinding(v));
  return { blockers, findings, secretCount, packageCount };
}

export function isPipMetadataFinding(finding: Finding): boolean {
  // pip vendors pkg_resources, not setuptools.package_index (the vulnerable module).
  // The scan command verifies this against the tested filesystem before issuing a receipt.
  return finding.id === 'CVE-2025-47273' && finding.package === 'setuptools' && finding.installed === '70.3.0'
    && finding.type === 'python-pkg' && finding.metadataOnly;
}

export function redactReport(value: unknown): unknown {
  const report = structuredClone(object(value));
  if (report.Metadata) delete object(report.Metadata).ImageConfig;
  for (const entry of array(report.Results)) {
    const result = object(entry);
    if (result.Secrets) result.Secrets = array(result.Secrets).map(value => {
      const secret = object(value);
      return { RuleID: secret.RuleID, Category: secret.Category, Title: secret.Title, Severity: secret.Severity, StartLine: secret.StartLine, EndLine: secret.EndLine };
    });
  }
  return report;
}
function sha256(data: string): string { return createHash('sha256').update(data).digest('hex'); }
function jsonFile(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')); }
function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 20 * 60 * 1000 });
  if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.status ?? result.error?.message}); security check did not pass\n${result.stderr.slice(-4000)}`);
  return result.stdout;
}
export function verifyReceipt(receiptValue: unknown, checkedValue: unknown, reportText: string, sbomText: string, now = Date.now()): void {
  const receipt = object(receiptValue);
  const checked = checkedImage(checkedValue);
  if (receipt.schemaVersion !== 1 || receipt.passed !== true || receipt.scannerVersion !== scannerVersion || receipt.policy !== 'fixable-high-critical-and-all-secrets-v1') throw new Error('Missing passing security gate');
  for (const key of ['imageId', 'configDigest', 'slug', 'version'] as const) {
    if (receipt[key] !== checked[key]) throw new Error('Security scan does not match the tested image');
  }
  assertFresh(receipt.scannedAt, now);
  assertFresh(receipt.databaseUpdatedAt, now);
  if (receipt.reportSha256 !== sha256(reportText) || receipt.sbomSha256 !== sha256(sbomText)) throw new Error('Security artifacts changed after scanning');
  const result = evaluateReport(JSON.parse(reportText));
  if (result.blockers.length || result.secretCount) throw new Error('Security report contains blocking findings');
  if (result.findings.some(isPipMetadataFinding) && receipt.pipSetuptoolsCodeAbsent !== true) throw new Error('Python exception has no filesystem evidence');
}
function main(): void {
  const [mode, slug] = process.argv.slice(2);
  if (!['scan', 'verify'].includes(mode ?? '') || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Usage: node tools/image-security.ts scan|verify <image-slug>');
  const directory = resolve('artifacts');
  mkdirSync(directory, { recursive: true });
  const checked = checkedImage(jsonFile(join(directory, `checked-${slug}.json`)));
  if (checked.slug !== slug) throw new Error('Receipt slug mismatch');
  const reportPath = join(directory, `security-${slug}.json`);
  const sbomPath = join(directory, `sbom-${slug}.cdx.json`);
  const receiptPath = join(directory, `security-receipt-${slug}.json`);
  if (mode === 'verify') {
    verifyReceipt(jsonFile(receiptPath), checkedImageReceipt(checked), readFileSync(reportPath, 'utf8'), readFileSync(sbomPath, 'utf8'));
    console.log(`${slug}: security receipt matches the tested image`);
    return;
  }
  rmSync(receiptPath, { force: true });
  const trivy = process.env.TRIVY_BIN ?? 'trivy';
  const cache = resolve(process.env.TRIVY_CACHE_DIR ?? '.trivy-cache');
  const version = run(trivy, ['--version']);
  if (!version.split('\n').includes(`Version: ${scannerVersion}`)) throw new Error(`Expected Trivy ${scannerVersion}`);
  run(trivy, ['image', '--cache-dir', cache, '--download-db-only', '--no-progress']);
  const db = object(jsonFile(join(cache, 'db', 'metadata.json')));
  assertFresh(db.UpdatedAt);
  const temporary = mkdtempSync(join(tmpdir(), 'sandbox-security-'));
  try {
    const rawPath = join(temporary, 'scan.json');
    run(trivy, ['image', '--cache-dir', cache, '--skip-db-update', '--image-src', 'docker', '--platform', 'linux/amd64', '--scanners', 'vuln,secret', '--image-config-scanners', 'secret', '--list-all-pkgs', '--format', 'json', '--output', rawPath, '--no-progress', '--timeout', '15m', checked.imageId]);
    const raw = jsonFile(rawPath);
    const metadata = object(object(raw).Metadata);
    if (metadata.ImageID !== checked.imageId && metadata.ImageID !== checked.configDigest) throw new Error('Scanner inspected a different image');
    const report = JSON.stringify(redactReport(raw), null, 2) + '\n';
    writeFileSync(reportPath, report);
    run(trivy, ['convert', '--format', 'cyclonedx', '--output', sbomPath, rawPath]);
    const result = evaluateReport(raw);
    const metadataException = result.findings.some(isPipMetadataFinding);
    if (metadataException) {
      run('docker', ['run', '--rm', '--platform', 'linux/amd64', '--network', 'none', '--entrypoint', 'python', checked.imageId, '-c',
        pipMetadataCheck]);
    }
    console.log(`${slug}: ${result.packageCount} packages, ${result.blockers.length} fixable high/critical findings, ${result.secretCount} secret findings`);
    for (const finding of result.blockers) console.log(`${finding.id}: ${finding.package} ${finding.installed} -> ${finding.fixed} (${finding.target})`);
    if (result.blockers.length || result.secretCount) throw new Error('Publication blocked by security findings');
    const receipt = { schemaVersion: 1, ...checked, passed: true, policy: 'fixable-high-critical-and-all-secrets-v1', scannerVersion, scannedAt: new Date().toISOString(), databaseUpdatedAt: db.UpdatedAt, reportSha256: sha256(report), sbomSha256: sha256(readFileSync(sbomPath, 'utf8')), pipSetuptoolsCodeAbsent: metadataException, findingCount: result.findings.length, blockingFindings: 0, secretFindings: 0 };
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
function checkedImageReceipt(checked: ReturnType<typeof checkedImage>): unknown {
  return { schemaVersion: 1, platform: 'linux/amd64', localChecksPassed: true, ...checked };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : 'Security check failed'); process.exitCode = 1; }
}
