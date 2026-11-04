// Prepared coding tasks and independent reference checks, without model calls.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path,'utf8'));
const write = (path,value) => writeFileSync(path,JSON.stringify(value,null,2)+'\n');
const MODULE = '/opt/render/runtime/coding-agent-workload.mjs';
const factoryIdentity={factorySha256:sha(readFileSync(fileURLToPath(import.meta.url)))};
const TYPESCRIPT_BROKEN = `export type Line = { id: string; cents: number };
export function totalCents(lines: Line[]): number {
  return lines.reduce((total, line) => total + line.cents, 0);
}
`;
const TYPESCRIPT_FIXED = `export type Line = { id: string; cents: number };
export function totalCents(lines: Line[]): number {
  const seen = new Map<string, number>();
  let total = 0;
  for (const line of lines) {
    if (!line || typeof line.id !== 'string' || !line.id || !Number.isSafeInteger(line.cents) || line.cents < 0)
      throw new Error('Invalid line');
    if (seen.has(line.id)) {
      if (seen.get(line.id) !== line.cents) throw new Error('Conflicting replay');
      continue;
    }
    seen.set(line.id, line.cents);
    total += line.cents;
    if (!Number.isSafeInteger(total)) throw new Error('Total overflow');
  }
  return total;
}
`;
const TYPESCRIPT_TESTS = `import assert from 'node:assert/strict';
import test from 'node:test';
import {totalCents} from '../dist/totals.js';
test('empty input and ordinary integer-cent totals', () => {
  assert.equal(totalCents([]), 0);
  assert.equal(totalCents([{id:'a',cents:1250},{id:'b',cents:500}]), 1750);
});
test('same event is applied once, including zero', () => {
  assert.equal(totalCents([{id:'a',cents:1250},{id:'a',cents:1250},{id:'b',cents:0}]),1250);
});
test('conflicting duplicate is rejected', () => {
  assert.throws(() => totalCents([{id:'a',cents:1},{id:'a',cents:2}]));
});
test('invalid fields and integer overflow are rejected', () => {
  for(const line of [null,{}, {id:'',cents:1}, {id:2,cents:1}, {id:'a',cents:-1}, {id:'a',cents:1.5}])
    assert.throws(() => totalCents([line]));
  assert.throws(() => totalCents([{id:'a',cents:Number.MAX_SAFE_INTEGER},{id:'b',cents:1}]));
});
test('one hundred replay/order cases preserve exact sums', () => {
  for(let n=0;n<100;n++) {
    const rows=Array.from({length:n%17},(_,i)=>({id:String(i),cents:i*37+n}));
    const expected=rows.reduce((total,row)=>total+row.cents,0);
    assert.equal(totalCents([...rows,...rows].reverse()),expected);
  }
});
`;
const PYTHON_BROKEN = `def batch_rows(rows, size):
    return [rows[i:i + size] for i in range(0, len(rows) - size + 1, size)]
`;
const PYTHON_FIXED = `def batch_rows(rows, size):
    if isinstance(size, bool) or not isinstance(size, int) or size <= 0:
        raise ValueError("size must be a positive integer")
    result, current = [], []
    for row in rows:
        current.append(row)
        if len(current) == size:
            result.append(current)
            current = []
    if current:
        result.append(current)
    return result
`;
const PYTHON_TESTS = `import unittest
from batcher import batch_rows
class BatchTests(unittest.TestCase):
    def test_empty_and_full_batches(self):
        self.assertEqual(batch_rows([], 2), [])
        self.assertEqual(batch_rows([1,2,3,4], 2), [[1,2],[3,4]])
    def test_partial_batch_preserves_every_row(self):
        self.assertEqual(batch_rows([1,2,3,4,5], 2), [[1,2],[3,4],[5]])
    def test_one_pass_iterators(self):
        self.assertEqual(batch_rows(iter([1,2,3]), 2), [[1,2],[3]])
    def test_invalid_batch_size(self):
        for size in [0,-1,True,1.5,'2',None]:
            with self.subTest(size=size), self.assertRaises(ValueError):
                batch_rows([1], size)
    def test_one_hundred_sizes_and_lengths(self):
        for n in range(100):
            rows=list(range(n)); size=n%13+1
            result=batch_rows(iter(rows), size)
            self.assertEqual([row for batch in result for row in batch], rows)
            self.assertTrue(all(0 < len(batch) <= size for batch in result))
            self.assertTrue(all(len(batch) == size for batch in result[:-1]))
if __name__ == '__main__':
    unittest.main()
`;

const tasks = {
  typescript: {
    file:'src/totals.ts', broken:TYPESCRIPT_BROKEN, fixed:TYPESCRIPT_FIXED,
    tests:TYPESCRIPT_TESTS, testFile:'test/totals.test.mjs',
    prompt:'Fix totalCents in src/totals.ts. Sum integer cents once per nonempty string ID, accept identical replays, reject conflicting replays, malformed lines, negative/non-integer cents and unsafe totals. Preserve empty input behavior. Run npm test. Change implementation, not tests.',
  },
  python: {
    file:'batcher.py', broken:PYTHON_BROKEN, fixed:PYTHON_FIXED,
    tests:PYTHON_TESTS, testFile:'tests/test_batcher.py',
    prompt:'Fix batch_rows in batcher.py. Accept one-pass iterables, preserve every row in order including a final partial batch, and reject non-positive, non-integer or boolean sizes with ValueError. Empty input returns an empty list. Run python -m unittest discover -s tests -v. Change implementation, not tests.',
  },
};

function execute(command,args,options={}) {
  const result=spawnSync(command,args,{encoding:'utf8',timeout:30000,maxBuffer:4_000_000,...options});
  if(result.error)throw result.error;
  assert.equal(result.signal,null,`${command} terminated with ${result.signal}`);
  return result;
}
function successful(command,args,options={}) {
  const result=execute(command,args,options);
  assert.equal(result.status,0,`${command} failed: ${result.stdout}\n${result.stderr}`);
  return result;
}
function put(root,relative,content) {
  const path=join(root,relative);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content);
}
function scaffold(root,language,source) {
  const task=tasks[language];assert.ok(task,'Unknown task language');
  put(root,task.file,source);put(root,task.testFile,task.tests);
  put(root,'.gitignore','dist/\n__pycache__/\n*.pyc\n');
  if(language==='typescript') {
    write(join(root,'package.json'),{name:'synthetic-agent-task',version:'1.0.0',private:true,type:'module',scripts:{build:'tsc -p tsconfig.json',test:'npm run build && node --test --test-reporter=tap test/totals.test.mjs'}});
    write(join(root,'tsconfig.json'),{compilerOptions:{target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',strict:true,outDir:'dist',rootDir:'src'},include:['src/**/*.ts']});
  }
}
function grade(project,language,scratch) {
  const task=tasks[language], source=join(project,task.file);
  assert.ok(lstatSync(source).isFile()&&!lstatSync(source).isSymbolicLink(),'Candidate source must be regular');
  scaffold(scratch,language,readFileSync(source,'utf8'));
  let result;
  if(language==='typescript') {
    const compiled=execute('tsc',['-p','tsconfig.json'],{cwd:scratch});
    if(compiled.status!==0)return {exitCode:compiled.status,tests:0,passed:0,output:compiled.stdout+compiled.stderr};
    result=execute('node',['--test','--test-reporter=tap','test/totals.test.mjs'],{cwd:scratch});
  } else result=execute('python',['-m','unittest','discover','-s','tests','-v'],{cwd:scratch});
  const output=result.stdout+result.stderr;
  const count=language==='typescript'?Number(output.match(/# tests (\d+)/)?.[1]):Number(output.match(/Ran (\d+) tests?/)?.[1]);
  assert.equal(count,5,'Independent test runner did not execute every test');
  const passed=language==='typescript'?Number(output.match(/# pass (\d+)/)?.[1]):result.status===0?5:null;
  return {exitCode:result.status,tests:count,passed,output};
}
function git(root,...args) {
  return successful('git',args,{cwd:root}).stdout;
}
function initializeGit(root) {
  git(root,'init','-q');git(root,'add','.');
  git(root,'-c','user.name=Sandbox Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Prepared synthetic task');
}
function preflight(config) {
  const version=successful(config.cli.command,config.cli.versionArgs??['--version']).stdout.trim();
  assert.ok(version.includes(config.cli.version),'Unexpected installed CLI version');
  const result=successful(config.cli.command,config.cli.helpArgs??['--help']);
  const help=result.stdout+result.stderr;
  for(const flag of config.cli.requiredHelp??[])assert.ok(help.includes(flag),`Missing CLI option ${flag}`);
  return {command:config.cli.command,version,helpSha256:sha(help)};
}
const brief=result=>({exitCode:result.exitCode,tests:result.tests,passed:result.passed});

export function createAgentScenarios(config) {
  assert.match(config.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(['stdin','argument'].includes(config.launch.prompt));
  if(config.launch.prompt==='argument')assert.ok(config.launch.args.includes('{prompt}'));
  return Object.fromEntries(Object.keys(tasks).map(language=>{
    const task=tasks[language],slug=`${config.slug}-${language}-repo`;
    const expectedSummary={language,baselineRejected:true,referenceTests:5,candidateChecks:100,cliVerified:true,agentInvoked:false};
    return [slug,{
      expectedSummary,
      artifacts:['preflight.json','test-results.json','changes.patch','candidate-source.txt'],
      prepare(inputDir) {
        write(join(inputDir,'runtime-identity.json'),factoryIdentity);
        scaffold(join(inputDir,'repo'),language,task.broken);
        put(inputDir,'repo/PROMPT.md',task.prompt+'\n');
        put(inputDir,`repo/${config.instructionsFile??'AGENTS.md'}`,'Work only inside this synthetic repository. Preserve the tests and do not install packages. Use the installed TypeScript or Python runtime. Do not access credentials or make network requests except through your configured model provider.\n');
        write(join(inputDir,'agent.json'),config);
        const root=dirname(inputDir),project=join(root,'project');
        assert.ok(!existsSync(project),'Refusing to overwrite user project');
        cpSync(join(inputDir,'repo'),project,{recursive:true});initializeGit(project);
        put(root,'run-agent.mjs',`import {launchPreparedAgent} from '${MODULE}';\nawait launchPreparedAgent(new URL('.',import.meta.url),process.argv.slice(2));\n`);
        put(root,'grade-project.sh',`#!/usr/bin/env bash\nset -euo pipefail\nROOT=$(cd -- "$(dirname -- "\${BASH_SOURCE[0]}")" && pwd)\nnode ${MODULE} grade "$ROOT/project" ${language}\n`);
        put(root,'WORKSPACE.md',`# ${config.name}: ${language} task\n\nAuthenticate using the CLI's supported method after restoring this workspace. Never capture credentials into shared images or snapshots.\n\nRun \`node run-agent.mjs\` to invoke the real agent on \`project/\`; extra CLI arguments are passed through. This can call a paid model and is not run by acceptance checks. Defaults preserve the CLI's permission controls; consult its help when configuring unattended edits.\n\nRun \`bash grade-project.sh\` to grade the candidate implementation against independent tests. The initial project intentionally fails.\n\n\`bash recipe.sh analyze\` exercises a reference repair in separate scratch state. It preserves your project and reports \`agentInvoked: false\`; it is not a model evaluation.\n`);
      },
      run({inputDir,workDir,outputDir}) {
        assert.deepEqual(read(join(inputDir,'runtime-identity.json')),factoryIdentity,'Prepared factory version changed');
        const cli=preflight(config);write(join(outputDir,'preflight.json'),cli);
        const project=join(workDir,'reference');cpSync(join(inputDir,'repo'),project,{recursive:true});initializeGit(project);
        const baseline=grade(project,language,join(workDir,'baseline-grade'));assert.notEqual(baseline.exitCode,0,'Broken task unexpectedly passed');
        put(project,task.file,task.fixed);
        const reference=grade(project,language,join(workDir,'reference-grade'));assert.equal(reference.exitCode,0,reference.output);
        const patch=git(project,'diff','--',task.file);assert.ok(patch.includes(`diff --git a/${task.file}`));
        writeFileSync(join(outputDir,'changes.patch'),patch);
        writeFileSync(join(outputDir,'candidate-source.txt'),readFileSync(join(project,task.file)));
        write(join(outputDir,'test-results.json'),{baseline:brief(baseline),reference:brief(reference),candidateChecks:100,agentInvoked:false});
        return {...expectedSummary,baselineRejected:baseline.exitCode!==0,referenceTests:reference.passed};
      },
      verify({inputDir,workDir,outputDir}) {
        assert.deepEqual(read(join(inputDir,'runtime-identity.json')),factoryIdentity,'Prepared factory version changed');
        const cli=preflight(config);assert.deepEqual(read(join(outputDir,'preflight.json')),cli);
        const scratch=mkdtempSync(join(workDir,'verify-'));
        try {
          const project=join(scratch,'project');cpSync(join(inputDir,'repo'),project,{recursive:true});initializeGit(project);
          const baseline=grade(project,language,join(scratch,'baseline-grade'));assert.notEqual(baseline.exitCode,0);
          const patchPath=join(outputDir,'changes.patch');git(project,'apply','--check',patchPath);git(project,'apply',patchPath);
          assert.equal(readFileSync(join(project,task.file),'utf8'),readFileSync(join(outputDir,'candidate-source.txt'),'utf8'));
          const reference=grade(project,language,join(scratch,'independent-grade'));assert.equal(reference.exitCode,0,reference.output);
          assert.deepEqual(read(join(outputDir,'test-results.json')),{baseline:brief(baseline),reference:brief(reference),candidateChecks:100,agentInvoked:false});
          return {...expectedSummary,baselineRejected:baseline.exitCode!==0,referenceTests:reference.passed};
        } finally {rmSync(scratch,{recursive:true,force:true});}
      },
    }];
  }));
}

export async function launchPreparedAgent(rootUrl,extraArgs=[]) {
  const root=fileURLToPath(rootUrl),config=read(join(root,'input/agent.json'));
  preflight(config);
  const prompt=readFileSync(join(root,'project/PROMPT.md'),'utf8');
  const baseArgs=config.launch.args.map(value=>value==='{prompt}'?prompt:value);
  const offset=config.launch.extraArgsAfter??0;
  assert.ok(Number.isInteger(offset)&&offset>=0&&offset<=baseArgs.length,'Invalid extra-argument position');
  const args=[...baseArgs.slice(0,offset),...extraArgs,...baseArgs.slice(offset)];
  const result=spawnSync(config.cli.command,args,{cwd:join(root,'project'),stdio:config.launch.prompt==='stdin'?['pipe','inherit','inherit']:'inherit',input:config.launch.prompt==='stdin'?prompt:undefined,timeout:300000});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2],'grade','Expected grade PROJECT typescript|python');
  const project=resolve(process.argv[3]),language=process.argv[4];assert.ok(Object.hasOwn(tasks,language));
  const scratch=mkdtempSync(join(tmpdir(),'agent-candidate-grade-'));
  try {const result=grade(project,language,scratch);console.log(JSON.stringify({...brief(result),candidateChecks:100,agentInvoked:false}));process.stderr.write(result.output);process.exitCode=result.exitCode;}
  finally {rmSync(scratch,{recursive:true,force:true});}
}
