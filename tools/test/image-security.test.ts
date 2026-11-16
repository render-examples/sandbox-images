import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { evaluateReport, redactReport, assertFresh, checkedImage, verifyReceipt, scannerVersion } from '../image-security.ts';
const now = Date.parse('2026-11-16T12:00:00Z');
function report(overrides: Record<string, unknown> = {}) {
  return { SchemaVersion: 2, ArtifactType: 'container_image', Results: [{ Target: 'debian', Type: 'debian', Packages: [{ Name: 'apt' }], Vulnerabilities: [{ VulnerabilityID: 'CVE-test', PkgName: 'apt', InstalledVersion: '2.6.1', FixedVersion: '2.6.2', Severity: 'HIGH', ...overrides }] }] };
}
test('blocks fixable high and critical findings; retains unfixed and lower severity findings', () => {
  assert.equal(evaluateReport(report()).blockers.length, 1);
  assert.equal(evaluateReport(report({ Severity: 'CRITICAL' })).blockers.length, 1);
  const unfixed = evaluateReport(report({ FixedVersion: '' }));
  assert.equal(unfixed.blockers.length, 0);
  assert.equal(unfixed.findings.length, 1);
  assert.equal(evaluateReport(report({ Severity: 'MEDIUM' })).blockers.length, 0);
});
test('only excludes kernel header package, not similar names or runtime libraries', () => {
  assert.equal(evaluateReport(report({ PkgName: 'linux-libc-dev' })).blockers.length, 0);
  assert.equal(evaluateReport(report({ PkgName: 'libc6' })).blockers.length, 1);
  assert.equal(evaluateReport(report({ PkgName: 'linux-libc-dev-other' })).blockers.length, 1);
});
test('fails closed on missing inventory and malformed reports', () => {
  for (const value of [null, {}, { SchemaVersion: 2, ArtifactType: 'container_image', Results: [] }, { SchemaVersion: 2, ArtifactType: 'container_image', Results: [{}] }]) assert.throws(() => evaluateReport(value));
});
test('redacts secret values and image environment without losing secret counts', () => {
  const input = { ...report({ FixedVersion: '' }), Metadata: { ImageConfig: { Env: ['TOKEN=secret'] } }, Results: [{ Target: 'file', Packages: [{}], Secrets: [{ RuleID: 'token', Match: 'secret', Code: 'secret', Secret: 'secret', Title: 'Token' }] }] };
  const redacted = redactReport(input);
  assert.equal(evaluateReport(redacted).secretCount, 1);
  assert.equal(JSON.stringify(redacted).includes('secret'), false);
  assert.equal(JSON.stringify(input).includes('secret'), true);
});
test('rejects stale or future evidence and incomplete acceptance receipt', () => {
  assertFresh(new Date(now).toISOString(), now);
  for (const timestamp of ['invalid', new Date(now - 25 * 3600000).toISOString(), new Date(now + 3600000).toISOString()]) assert.throws(() => assertFresh(timestamp, now));
  assert.throws(() => checkedImage({ imageId: `sha256:${'a'.repeat(64)}` }));
});
test('binds passing scan to exact tested image and artifacts', () => {
  const checked = { schemaVersion: 1, imageId: `sha256:${'a'.repeat(64)}`, configDigest: `sha256:${'b'.repeat(64)}`, slug: 'test', version: '0.1.1', platform: 'linux/amd64', localChecksPassed: true };
  const text = JSON.stringify(report({ FixedVersion: '' }));
  const sbom = '{}';
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const receipt = { ...checked, passed: true, scannerVersion, policy: 'fixable-high-critical-and-all-secrets-v1', scannedAt: new Date(now).toISOString(), databaseUpdatedAt: new Date(now).toISOString(), reportSha256: hash(text), sbomSha256: hash(sbom) };
  verifyReceipt(receipt, checked, text, sbom, now);
  assert.throws(() => verifyReceipt({ ...receipt, imageId: `sha256:${'c'.repeat(64)}` }, checked, text, sbom, now));
  assert.throws(() => verifyReceipt(receipt, checked, text + ' ', sbom, now));
  assert.throws(() => verifyReceipt(receipt, checked, text, sbom + ' ', now));
  assert.throws(() => verifyReceipt({ ...receipt, passed: false }, checked, text, sbom, now));
});

test('pip metadata exception cannot suppress an installed setuptools package', () => {
  const component = { ID: 'setuptools@70.3.0', AnalyzedBy: 'sbom' };
  const vulnerability = { VulnerabilityID: 'CVE-2025-47273', PkgID: component.ID, PkgName: 'setuptools', InstalledVersion: '70.3.0', FixedVersion: '78.1.1', Severity: 'HIGH' };
  const input = { SchemaVersion: 2, ArtifactType: 'container_image', Results: [{ Target: 'Python', Type: 'python-pkg', Packages: [component], Vulnerabilities: [vulnerability] }] };
  assert.equal(evaluateReport(input).blockers.length, 0);
  component.AnalyzedBy = 'python';
  assert.equal(evaluateReport(input).blockers.length, 1);
  component.AnalyzedBy = 'sbom';
  vulnerability.VulnerabilityID = 'CVE-another';
  assert.equal(evaluateReport(input).blockers.length, 1);
});
