import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = '/workspace/typescript-tool-workbench';
const project = join(root, 'project');
const fixture = '/opt/render/fixtures/typescript-tool-workbench';
const output = '/workspace/output';
const inputs = ['package.json', 'package-lock.json', 'tsconfig.json', 'src/tools.ts', 'test/tools.test.mjs', 'input.json', 'mock-api.mjs', 'workload.mjs'];
const artifacts = ['summary.json', 'transformed.json', 'receipt.json', 'requests.json', 'tests.tap'];
const expected = { inputRows: 3, orders: 2, totalCents: 3250, attempts: 3, deliveries: 1, testsPassed: 8 };
const sha = data => createHash('sha256').update(data).digest('hex');
const read = path => readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const run = (command, args) => execFileSync(command, args, { cwd: project, encoding: 'utf8', timeout: 45000 });
function checkBaseline() {
  const baseline = json(join(root, 'baseline.json'));
  assert.equal(baseline.fixture, 'typescript-tool-workbench-v1');
  assert.deepEqual(baseline.expectedSummary, expected);
  for (const name of inputs) {
    const pinned = sha(readFileSync(join(fixture, name)));
    assert.equal(baseline.inputSha256[name], pinned, `Baseline changed: ${name}`);
    assert.equal(sha(readFileSync(join(project, name))), pinned, `Prepared input changed: ${name}`);
  }
}
function prepare() {
  if (existsSync(project)) throw new Error('Refusing to overwrite an existing prepared project');
  mkdirSync(root, { recursive: true });
  cpSync(fixture, project, { recursive: true });
  rmSync(join(project, 'dist'), { recursive: true, force: true });
  write(join(root, 'baseline.json'), {
    fixture: 'typescript-tool-workbench-v1', expectedSummary: expected,
    inputSha256: Object.fromEntries(inputs.map(name => [name, sha(readFileSync(join(project, name)))])),
  });
  checkBaseline();
}
function analyze() {
  checkBaseline();
  rmSync(join(project, 'dist'), { recursive: true, force: true });
  const tests = run('npm', ['test']);
  assert.match(tests, /# tests 8\b/); assert.match(tests, /# fail 0\b/);
  const result = JSON.parse(run('node', ['workload.mjs']));
  const summary = { ...result.summary, testsPassed: 8 };
  assert.deepEqual(summary, expected);
  mkdirSync(output, { recursive: true });
  write(join(output, 'summary.json'), summary);
  write(join(output, 'transformed.json'), result.transformed);
  write(join(output, 'receipt.json'), result.receipt);
  write(join(output, 'requests.json'), result.trace);
  writeFileSync(join(output, 'tests.tap'), tests);
  verify(false);
}
function verify(checkReceipt = true) {
  checkBaseline();
  assert.deepEqual(json(join(output, 'summary.json')), expected);
  assert.deepEqual(json(join(output, 'transformed.json')), { orderIds: ['order-1', 'order-2'], totalCents: 3250 });
  assert.deepEqual(json(join(output, 'receipt.json')), { accepted: true, receiptId: 'receipt-1', totalCents: 3250 });
  assert.deepEqual(json(join(output, 'requests.json')), [
    { key: 'batch-001', status: 503, duplicate: false },
    { key: 'batch-001', status: 201, duplicate: false },
    { key: 'batch-001', status: 201, duplicate: true },
  ]);
  const tests = read(join(output, 'tests.tap'));
  assert.match(tests, /# tests 8\b/); assert.match(tests, /# fail 0\b/);
  const hashes = Object.fromEntries(artifacts.map(name => [name, sha(readFileSync(join(output, name)))]));
  const receipt = { passed: true, summary: expected, outputSha256: hashes };
  if (checkReceipt) assert.deepEqual(json(join(output, 'verification.json')), receipt);
  else write(join(output, 'verification.json'), receipt);
}
function test() {
  verify();
  const mutations = [
    [join(project, 'input.json'), '[{"id":"order-1","quantity":9,"unitCents":1250}]\n'],
    [join(output, 'receipt.json'), '{"accepted":true,"receiptId":"receipt-1","totalCents":1}\n'],
    [join(output, 'requests.json'), '[]\n'],
    [join(root, 'baseline.json'), '{}\n'],
  ];
  for (const [path, corrupt] of mutations) {
    const original = readFileSync(path);
    try { writeFileSync(path, corrupt); assert.throws(() => verify(), `Must reject corruption: ${path}`); }
    finally { writeFileSync(path, original); }
  }
  for (const name of [...artifacts, 'verification.json']) rmSync(join(output, name));
  analyze(); verify();
  console.log('Four corruption checks and output regeneration passed');
}
const command = process.argv[2];
if (command === 'prepare') prepare();
else if (command === 'analyze') analyze();
else if (command === 'verify') verify();
else if (command === 'test') test();
else throw new Error('Expected prepare, analyze, verify, or test');
console.log(`typescript-tool-workbench ${command}: passed`);
