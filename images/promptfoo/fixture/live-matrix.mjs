// Run inside the sandbox only. Each CLI/skill variant receives a fresh project.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
process.env.PROMPTFOO_DISABLE_TELEMETRY = '1';
process.env.PROMPTFOO_DISABLE_UPDATE = '1';
const { evaluate } = await import('promptfoo');
const { values } = parseArgs({ options: {
  output: { type: 'string' }, 'codex-model': { type: 'string' }, 'claude-model': { type: 'string' },
  'opencode-model': { type: 'string' }, 'codex-provider': { type: 'string', default: 'openai' },
  clis: { type: 'string', default: 'codex,opencode' }, skill: { type: 'string' },
} });
if (!['openai', 'openrouter'].includes(values['codex-provider'])) throw new Error('Unsupported Codex provider');
const clis = values.clis.split(',');
if (clis.length < 2 || new Set(clis).size !== clis.length || clis.some(cli => !['codex', 'claude', 'opencode'].includes(cli))) {
  throw new Error('Choose at least two distinct supported CLIs with --clis codex,opencode or codex,claude');
}
if (!values.output || !values.skill || clis.some(cli => !values[`${cli}-model`])) {
  throw new Error('Required: --output NEW_DIRECTORY --skill SKILL.md and --CLI-model MODEL for every selected CLI');
}
const root = resolve(values.output);
if (existsSync(root)) throw new Error('Output directory must be new');
mkdirSync(root, { recursive: true });
const skill = readFileSync(values.skill, 'utf8');
const task = 'Fix totals.py: total(values) must return the sum of every integer in values, including negatives. Empty input returns 0. Change only totals.py. Do not modify tests or grading files.';
const tests = [[[], 0], [[1, 2, 3], 6], [[-2, 5], 3], [[-4, -3], -7], [[0, 4, 0], 4]];
const receipts = [];
const providers = clis.flatMap(cli => [false, true].map(skillEnabled => ({
  id: () => `${cli}:skill-${skillEnabled ? 'on' : 'off'}`,
  async callApi() {
    const id = `${cli}-skill-${skillEnabled ? 'on' : 'off'}`;
    const dir = join(root, id); mkdirSync(dir);
    writeFileSync(join(dir, 'totals.py'), 'def total(values):\n    return sum(v for v in values if v > 0)\n');
    if (skillEnabled) writeFileSync(join(dir, 'SKILL.md'), skill);
    if (cli === 'codex' && values['codex-provider'] === 'openrouter') {
      mkdirSync(join(dir, '.codex'));
      writeFileSync(join(dir, '.codex/config.toml'), 'model_provider = "openrouter"\n[model_providers.openrouter]\nname = "OpenRouter"\nbase_url = "https://openrouter.ai/api/v1"\nenv_key = "OPENROUTER_API_KEY"\nwire_api = "responses"\nrequest_max_retries = 0\nstream_max_retries = 0\n');
    }
    const git = spawnSync('git', ['init', '-q', dir], { timeout: 10000 });
    if (git.status !== 0) throw new Error('Could not initialize fresh repository');
    const prompt = skillEnabled ? `${task}\n\nRead and apply SKILL.md before making the repair.` : task;
    const model = values[`${cli}-model`];
    const args = cli === 'codex'
      ? ['exec', '--dangerously-bypass-approvals-and-sandbox', '--skip-git-repo-check', '--json', '--model', model, prompt]
      : cli === 'opencode' ? ['run', '--standalone', '--format', 'json', '--model', model, prompt]
      : ['-p', prompt, '--dangerously-skip-permissions', '--model', model, '--max-turns', '8', '--output-format', 'json'];
    const start = Date.now();
    const processResult = spawnSync(cli, args, { cwd: dir, encoding: 'utf8', timeout: 180000, maxBuffer: 2 * 1024 * 1024,
      env: { PATH: process.env.PATH, HOME: dir, TMPDIR: '/tmp',
        OPENAI_API_KEY: cli === 'codex' && values['codex-provider'] === 'openrouter' ? undefined : process.env.OPENAI_API_KEY,
        CODEX_API_KEY: values['codex-provider'] === 'openrouter' ? undefined : process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        OPENCODE_CONFIG_CONTENT: JSON.stringify({ update: 'disable', formatter: false, lsp: false }), CI: '1' } });
    // Raw stdout can contain task content; keep it in the caller-selected evidence directory.
    writeFileSync(join(dir, 'cli.stdout'), processResult.stdout || '');
    writeFileSync(join(dir, 'cli.stderr'), processResult.stderr || '');
    const grader = `import json,importlib.util\nspec=importlib.util.spec_from_file_location('candidate','totals.py')\nm=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\ncases=${JSON.stringify(tests)}\nprint(json.dumps({'passed':sum(m.total(v)==answer for v,answer in cases),'total':len(cases)}))\n`;
    const grade = spawnSync('python', ['-I', '-c', grader], { cwd: dir, encoding: 'utf8', timeout: 5000, maxBuffer: 64000 });
    let passed = 0;
    if (grade.status === 0) {
      try { passed = JSON.parse(grade.stdout.trim()).passed; } catch { /* Invalid output is failure. */ }
    }
    const receipt = { id, cli, requestedModel: model, ...(cli === 'codex' ? { provider: values['codex-provider'] } : {}), skillEnabled, taskSha256: createHash('sha256').update(task).digest('hex'),
      skillSha256: skillEnabled ? createHash('sha256').update(skill).digest('hex') : null,
      agentInvoked: Number.isInteger(processResult.pid) && processResult.pid > 0, exitCode: processResult.status,
      errorCode: processResult.error?.code || null, elapsedMs: Date.now() - start, graderExitCode: grade.status,
      passed, total: tests.length };
    receipts.push(receipt);
    writeFileSync(join(root, 'receipts.json'), JSON.stringify({ schemaVersion: 1,
      passed: receipts.length === clis.length * 2 && receipts.every(r => r.exitCode === 0 && r.graderExitCode === 0 && r.passed === r.total),
      agentInvoked: receipts.some(r => r.agentInvoked), runs: receipts }, null, 2));
    return { output: processResult.status === 0 && grade.status === 0 ? `${passed}/${tests.length}` : 'execution-failed' };
  },
})));
const result = await evaluate({ description: 'Actual CLI × skill matrix; identical fixture and independent scorer',
  prompts: [{ raw: task, label: 'repository-repair' }], providers, tests: [{ assert: [{ type: 'equals', value: '5/5' }] }],
}, { cache: false, writeLatestResults: false, maxConcurrency: 1 });
writeFileSync(join(root, 'promptfoo-results.json'), JSON.stringify(await result.toEvaluateSummary(), null, 2));
if (receipts.length !== clis.length * 2 || receipts.some(r => r.exitCode !== 0 || r.graderExitCode !== 0 || r.passed !== r.total)) {
  throw new Error('Some matrix executions failed; all failures and partial results retained');
}
