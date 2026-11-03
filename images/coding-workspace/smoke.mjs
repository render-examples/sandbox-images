import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const directory = mkdtempSync(join(tmpdir(), 'coding-smoke-'));
try {
  const repo = join(directory, 'repo');
  cpSync('/opt/render/fixtures/repo-ready-typescript', repo, { recursive: true });
  const output = execFileSync('npm', ['test'], { cwd: repo, encoding: 'utf8', timeout: 60000 });
  assert.match(output, /# tests 3\b/);
  assert.match(output, /# fail 0\b/);
  execFileSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: repo });
  execFileSync('git', ['add', '.'], { cwd: repo });
  assert.match(execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: repo, encoding: 'utf8' }), /src\/pricing.ts/);
  const compiler = execFileSync('tsc', ['--version'], { encoding: 'utf8' }).trim();
  assert.equal(compiler, 'Version 7.0.2');
  const result = { status: 'passed', baselineTests: 3, totalCents: 3250, node: process.version, typescript: compiler };
  mkdirSync('/workspace/image-smoke', { recursive: true });
  writeFileSync('/workspace/image-smoke/result.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { rmSync(directory, { recursive: true, force: true }); }
