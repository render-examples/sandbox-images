import type { RecipeContext, ScenarioMap } from '/opt/render/runtime/contracts.ts';
import type { ApiProvider } from 'promptfoo';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

process.env.PROMPTFOO_DISABLE_TELEMETRY = '1';
process.env.PROMPTFOO_DISABLE_UPDATE = '1';
process.env.PROMPTFOO_DISABLE_REMOTE_GENERATION = 'true';
const { evaluate } = await import('promptfoo');
const expectedSummary = { cases: 3, accepted: 1, rejected: 2, providerCalls: 0, agentInvoked: false };

function isRecord(value: unknown): value is Record<string,unknown> { return typeof value==='object'&&value!==null&&!Array.isArray(value); }
type Case = {id:string;actual:string;expected:string};
async function casesFrom(path:string):Promise<Case[]> {
 const value:unknown=JSON.parse(await readFile(path,'utf8')); assert.ok(Array.isArray(value));
 return value.map((row:unknown)=>{assert.ok(isRecord(row)&&typeof row.id==='string'&&typeof row.actual==='string'&&typeof row.expected==='string'); return {id:row.id,actual:row.actual,expected:row.expected};});
}
const offlineProvider: ApiProvider = {id:()=> 'offline-recorded-control', async callApi(_prompt,context) {
 assert.ok(context && typeof context.vars.actual==='string'); return {output:context.vars.actual};
}};
async function prepare(inputDir: string, scenario: string) {
  const cases = scenario === 'promptfoo-tool-regression' ? [
    { id: 'valid', actual: 'read_file:notes.txt', expected: 'read_file:notes.txt' },
    { id: 'wrong-file', actual: 'read_file:secret.txt', expected: 'read_file:notes.txt' },
    { id: 'forbidden-write', actual: 'delete_file:notes.txt', expected: 'read_file:notes.txt' },
  ] : [
    { id: 'reference-repair', actual: '5/5', expected: '5/5' },
    { id: 'baseline-bug', actual: '1/5', expected: '5/5' },
    { id: 'corrupt-patch', actual: '0/5', expected: '5/5' },
  ];
  await writeFile(join(inputDir, 'cases.json'), JSON.stringify(cases, null, 2));
  await writeFile(join(inputDir, 'SKILL.md'), '# Repository repair\nInspect the implementation and its edge cases. Make the smallest correct patch. Exercise negative numbers and empty input. Do not modify tests or grading artifacts.\n');
}

async function run(context: RecipeContext) {
  const cases = await casesFrom(join(context.inputDir, 'cases.json'));
  const result = await evaluate({ writeLatestResults: false,
    description: 'Offline evaluator acceptance; prerecorded values, no CLI or provider execution',
    prompts: [{ raw: 'Fix totals.py: {{id}}', label: 'offline-control-task' }],
    providers: [offlineProvider],
    tests: cases.map(c => ({ vars: { id: c.id, actual: c.actual }, assert: [{ type: 'equals', value: c.expected }] })),
  }, { cache: false, maxConcurrency: 1 });
  const summary = await result.toEvaluateSummary();
  const rows = summary.results.map(r => { assert.ok(r.response); return { id: r.vars.id, output: r.response.output, success: r.success, score: r.score }; });
  await writeFile(join(context.outputDir, 'scores.json'), JSON.stringify(rows, null, 2));
  return verify(context);
}

async function verify(context: RecipeContext) {
  const cases = await casesFrom(join(context.inputDir, 'cases.json'));
  const raw:unknown = JSON.parse(await readFile(join(context.outputDir, 'scores.json'), 'utf8'));
  assert.ok(Array.isArray(raw));
  const rows=raw.map((row:unknown)=>{assert.ok(isRecord(row)&&typeof row.id==='string'&&typeof row.output==='string'&&typeof row.success==='boolean'&&typeof row.score==='number');return {id:row.id,output:row.output,success:row.success,score:row.score};});
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map(r => r.id)).size, 3);
  for (const c of cases) {
    const r = rows.find(r => r.id === c.id); assert.ok(r);
    assert.equal(r.output, c.actual);
    assert.equal(r.success, c.actual === c.expected);
    assert.equal(r.score, Number(c.actual === c.expected));
  }
  const accepted = rows.filter(r => r.success).length;
  const actual = { cases: rows.length, accepted, rejected: rows.length - accepted, providerCalls: 0, agentInvoked: false };
  assert.deepEqual(actual, expectedSummary);
  return actual;
}

export const scenarios: ScenarioMap = Object.fromEntries(['promptfoo-skill-cli-matrix', 'promptfoo-tool-regression'].map(slug => [slug, {
  expectedSummary, artifacts: ['scores.json'], prepare: (inputDir: string) => prepare(inputDir, slug), run, verify,
}]));
