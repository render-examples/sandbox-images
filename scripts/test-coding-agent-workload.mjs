// Exercise argv/stdin boundaries without credentials or a model service.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {chmodSync,mkdirSync,mkdtempSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';

function fixture(t,launch,extraArgs=[],prompt='Repair the synthetic repository.',exitCode=0) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'coding-launch-test-')));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'input'));mkdirSync(join(root,'project'));
  const command=join(root,'fixture-cli');
  writeFileSync(command,`#!/usr/bin/env node
const fs=require('node:fs');
const args=process.argv.slice(2);
if(args.includes('--version'))console.log('fixture-cli 1.2.3');
else if(args.includes('--help'))console.log('run --json --model');
else {
  fs.writeFileSync(process.env.CODING_TEST_RECORD,JSON.stringify({args,cwd:process.cwd(),stdin:args.includes('-')?fs.readFileSync(0,'utf8'):null}));
  process.exitCode=Number(process.env.CODING_TEST_EXIT);
}
`);
  chmodSync(command,0o755);
  writeFileSync(join(root,'input/agent.json'),JSON.stringify({cli:{command,version:'1.2.3',requiredHelp:['--json']},launch}));
  writeFileSync(join(root,'project/PROMPT.md'),prompt);
  const runner=join(root,'runner.mjs'),moduleUrl=new URL('../runtime/coding-agent-workload.mjs',import.meta.url).href;
  writeFileSync(runner,`import {launchPreparedAgent} from ${JSON.stringify(moduleUrl)}; await launchPreparedAgent(new URL(${JSON.stringify(pathToFileURL(root+'/').href)}),${JSON.stringify(extraArgs)});`);
  const result=spawnSync(process.execPath,[runner],{encoding:'utf8',timeout:10000,env:{...process.env,CODING_TEST_RECORD:join(root,'record.json'),CODING_TEST_EXIT:String(exitCode)}});
  assert.ifError(result.error);
  const record=()=>JSON.parse(readFileSync(join(root,'record.json'),'utf8'));
  return {root,result,record};
}

test('run-specific flags follow the subcommand and prompts stay one literal argument',t=>{
  const prompt='--model injected; $(touch ignored)\nwith spaces and `quotes`';
  const f=fixture(t,{args:['run','--json','--','{prompt}'],prompt:'argument',extraArgsAfter:1},['--model','caller/model'],prompt);
  assert.equal(f.result.status,0,f.result.stderr);
  assert.deepEqual(f.record(),{args:['run','--model','caller/model','--json','--',prompt],cwd:join(f.root,'project'),stdin:null});
});
test('stdin prompts preserve multiline content and place exec flags correctly',t=>{
  const prompt='First line\nSecond line with $DOLLARS\n';
  const f=fixture(t,{args:['exec','--json','-'],prompt:'stdin',extraArgsAfter:1},['--model','caller/model'],prompt);
  assert.equal(f.result.status,0,f.result.stderr);
  assert.deepEqual(f.record(),{args:['exec','--model','caller/model','--json','-'],cwd:join(f.root,'project'),stdin:prompt});
});
test('agent failure is reflected in the launcher exit status',t=>{
  const f=fixture(t,{args:['--','{prompt}'],prompt:'argument'},[],'A fixture prompt',23);
  assert.equal(f.result.status,23);
});
test('invalid argument insertion is rejected before invocation',t=>{
  const f=fixture(t,{args:['run','{prompt}'],prompt:'argument',extraArgsAfter:-1});
  assert.notEqual(f.result.status,0);
  assert.match(f.result.stderr,/Invalid extra-argument position/);
  assert.throws(f.record,/ENOENT/);
});
