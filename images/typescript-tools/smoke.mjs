import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const result = JSON.parse(execFileSync('node', ['/opt/render/fixtures/typescript-tool-workbench/workload.mjs'], { encoding: 'utf8', timeout: 30000 }));
assert.deepEqual(result.summary, { inputRows: 3, orders: 2, totalCents: 3250, attempts: 3, deliveries: 1 });
mkdirSync('/workspace/image-smoke', { recursive: true });
writeFileSync('/workspace/image-smoke/result.json', JSON.stringify({ status: 'passed', ...result.summary }) + '\n');
console.log('TypeScript transform and mock API adapter smoke passed');
