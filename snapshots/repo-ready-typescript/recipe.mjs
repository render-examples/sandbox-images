import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/workspace/repo-ready-typescript';
const repo = join(root, 'repo');
const fixture = '/opt/render/fixtures/repo-ready-typescript';
const output = '/workspace/output';
const inputs = ['package.json', 'package-lock.json', 'tsconfig.json', '.gitignore', 'README.md', 'src/pricing.ts', 'test/pricing.test.mjs'];
const sha = data => createHash('sha256').update(data).digest('hex');
const read = path => readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: repo, encoding: 'utf8', timeout: 60000, ...options });
}
const sourceAddition = `
export function discountedCents(cents: number, percent: number): number {
  if (!Number.isSafeInteger(cents) || cents < 0 ||
      !Number.isSafeInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError("Expected non-negative integer cents and a 0..100 integer discount");
  }
  return Math.round(cents * (100 - percent) / 100);
}
`;
const testAddition = `
import { discountedCents } from '../dist/pricing.js';
test('applies integer discounts and rounds to cents', () => {
  assert.equal(discountedCents(3250, 20), 2600);
  assert.equal(discountedCents(101, 50), 51);
  assert.equal(discountedCents(3250, 100), 0);
});
test('rejects invalid discounts', () => {
  assert.throws(() => discountedCents(100, 101), RangeError);
  assert.throws(() => discountedCents(100, -1), RangeError);
});
`;
const expectedSummary = { baselineTests: 3, testsPassed: 5, totalCents: 3250, discountedCents: 2600, changedFiles: 2 };
function checkBaseline() {
  const baseline = json(join(root, 'baseline.json'));
  assert.equal(baseline.fixture, 'repo-ready-typescript-v1');
  assert.equal(run('git', ['rev-parse', 'HEAD']).trim(), baseline.gitHead);
  for (const name of inputs) {
    assert.equal(sha(run('git', ['show', `HEAD:${name}`])), baseline.inputSha256[name], `Captured Git input changed: ${name}`);
    assert.equal(sha(read(join(fixture, name))), baseline.inputSha256[name], `Pinned fixture changed: ${name}`);
  }
  return baseline;
}
function prepare() {
  if (existsSync(repo)) throw new Error('Refusing to overwrite an existing prepared repository');
  mkdirSync(root, { recursive: true });
  cpSync(fixture, repo, { recursive: true });
  run('git', ['init', '--quiet', '--initial-branch=main']);
  run('git', ['config', 'user.name', 'Render Example']);
  run('git', ['config', 'user.email', 'example@example.invalid']);
  run('git', ['add', '.']);
  run('git', ['commit', '--quiet', '-m', 'Prepared synthetic pricing fixture'], {
    env: { ...process.env, GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' },
  });
  const tests = run('npm', ['test']);
  assert.match(tests, /# tests 3\b/);
  assert.match(tests, /# fail 0\b/);
  rmSync(join(repo, 'dist'), { recursive: true, force: true });
  write(join(root, 'baseline.json'), {
    fixture: 'repo-ready-typescript-v1', gitHead: run('git', ['rev-parse', 'HEAD']).trim(),
    inputSha256: Object.fromEntries(inputs.map(name => [name, sha(read(join(repo, name)))])), expectedSummary,
  });
}
async function analyze() {
  checkBaseline();
  // Reset only the two demonstration task files from pinned inputs. This keeps
  // repeated analysis deterministic without fetching or replacing the repository.
  writeFileSync(join(repo, 'src/pricing.ts'), read(join(fixture, 'src/pricing.ts')) + sourceAddition);
  writeFileSync(join(repo, 'test/pricing.test.mjs'), read(join(fixture, 'test/pricing.test.mjs')) + testAddition);
  rmSync(join(repo, 'dist'), { recursive: true, force: true });
  const tests = run('npm', ['test']);
  assert.match(tests, /# tests 5\b/);
  assert.match(tests, /# fail 0\b/);
  const { totalCents, discountedCents } = await import(pathToFileURL(join(repo, 'dist/pricing.js')).href);
  const total = totalCents([{unitCents: 1250, quantity: 2}, {unitCents: 750, quantity: 1}]);
  const summary = { baselineTests: 3, testsPassed: 5, totalCents: total, discountedCents: discountedCents(total, 20),
    changedFiles: run('git', ['diff', '--name-only']).trim().split('\n').length };
  assert.deepEqual(summary, expectedSummary);
  mkdirSync(output, { recursive: true });
  write(join(output, 'summary.json'), summary);
  writeFileSync(join(output, 'tests.tap'), tests);
  writeFileSync(join(output, 'change.patch'), run('git', ['diff', '--binary']));
  verify(false);
}
function verify(checkReceipt = true) {
  checkBaseline();
  assert.equal(read(join(repo, 'src/pricing.ts')), read(join(fixture, 'src/pricing.ts')) + sourceAddition);
  assert.equal(read(join(repo, 'test/pricing.test.mjs')), read(join(fixture, 'test/pricing.test.mjs')) + testAddition);
  assert.deepEqual(json(join(output, 'summary.json')), expectedSummary);
  const tests = read(join(output, 'tests.tap'));
  assert.match(tests, /# tests 5\b/);
  assert.match(tests, /# fail 0\b/);
  const patch = read(join(output, 'change.patch'));
  assert.equal(patch, run('git', ['diff', '--binary']));
  assert.match(patch, /discountedCents/);
  const hashes = Object.fromEntries(['summary.json', 'tests.tap', 'change.patch'].map(name => [name, sha(readFileSync(join(output, name)))]));
  if (checkReceipt) {
    const receipt = json(join(output, 'verification.json'));
    assert.equal(receipt.passed, true);
    assert.deepEqual(receipt.summary, expectedSummary);
    assert.deepEqual(receipt.outputSha256, hashes);
  } else write(join(output, 'verification.json'), { passed: true, summary: expectedSummary, outputSha256: hashes });
}
function testCorruption() {
  verify();
  for (const file of [join(output, 'summary.json'), join(output, 'change.patch'), join(root, 'baseline.json')]) {
    const original = readFileSync(file);
    try { writeFileSync(file, '{}\n'); assert.throws(() => verify(), `Must reject corrupt ${file}`); }
    finally { writeFileSync(file, original); }
  }
  verify();
  console.log('Three corruption checks passed');
}
const command = process.argv[2];
if (command === 'prepare') prepare();
else if (command === 'analyze') await analyze();
else if (command === 'verify') verify();
else if (command === 'test') testCorruption();
else throw new Error('Expected prepare, analyze, verify, or test');
console.log(`repo-ready-typescript ${command}: passed`);
