import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import type {ExecFileSyncOptions} from 'node:child_process';
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const inputs=dirname(fileURLToPath(import.meta.url));
const root='/workspace/agent-regression-typescript', repo=join(root,'repo'), protectedDir=join(root,'grader'), output='/workspace/output';
const parent='/opt/render/fixtures/repo-ready-typescript';
type TaskId='grouping'|'idempotency'|'validation';
type Task={id:TaskId;checks:number};
type CheckResult={name:string;passed:boolean;error?:string};
type TaskResult={task:TaskId;passed:boolean;checks:CheckResult[];error?:string};
function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function object(value:unknown):Record<string,unknown>{assert.ok(isRecord(value));return value;}
function array(value:unknown):unknown[]{assert.ok(Array.isArray(value));return value;}
function isTaskId(value:unknown):value is TaskId{return value==='grouping'||value==='idempotency'||value==='validation';}
function taskList(value:unknown):Task[]{
 const root=object(value);assert.equal(root.schemaVersion,1);assert.equal(root.name,'agent-regression-typescript-v1');
 return array(root.tasks).map(value=>{const task=object(value);assert.ok(isTaskId(task.id));assert.equal(task.file,`src/${task.id}.ts`);assert.ok(typeof task.export==='string'&&typeof task.goal==='string');assert.equal(task.checks,4);return {id:task.id,checks:4};});
}
function taskResult(value:unknown,task:Task):TaskResult{
 const row=object(value);assert.equal(row.task,task.id);assert.ok(typeof row.passed==='boolean');
 const checks=array(row.checks).map(value=>{const check=object(value);assert.ok(typeof check.name==='string'&&typeof check.passed==='boolean');if(check.error!==undefined)assert.ok(typeof check.error==='string');return {name:check.name,passed:check.passed,...(typeof check.error==='string'?{error:check.error}:{})};});
 assert.equal(checks.length,task.checks);assert.equal(row.passed,checks.every(c=>c.passed));
 return {task:task.id,passed:row.passed,checks};
}
function errorCode(value:unknown):string|undefined{return isRecord(value)&&typeof value.code==='string'?value.code:undefined;}
const tasks=taskList(JSON.parse(readFileSync(join(inputs,'tasks.json'),'utf8')));
const ids:TaskId[]=['grouping','idempotency','validation'];
assert.deepEqual(tasks.map(t=>t.id),ids);
const expected={tasks:3,tasksPassed:3,checks:12,checksPassed:12,baselineFailedTasks:3,compileSucceeded:true};
const outputNames=['summary.json','task-results.json','build.txt','change.patch'];
const pinnedFiles=['tasks.json','grader.ts',...ids.flatMap(id=>[`fixture/${id}.ts`,`reference/${id}.ts`])];
const configFiles=['package.json','package-lock.json','tsconfig.json','.gitignore'];
const sha=(data:string|Uint8Array)=>createHash('sha256').update(data).digest('hex');
const read=(path:string)=>readFileSync(path,'utf8');
const json=(path:string):unknown=>JSON.parse(read(path));
const write=(path:string,value:unknown)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n');
const clearReceipt=()=>rmSync(join(output,'verification.json'),{force:true});
function command(cmd:string,args:string[],options:Pick<ExecFileSyncOptions,'env'>={}){return execFileSync(cmd,args,{cwd:repo,encoding:'utf8',timeout:30000,...options});}
function pinnedHashes(){return Object.fromEntries(pinnedFiles.map(name=>[name,sha(readFileSync(join(inputs,name)))]));}
function baselineCheck(){
 const b=object(json(join(root,'baseline.json')));assert.ok(typeof b.baselineResultsSha256==='string');
 assert.equal(b.fixture,'agent-regression-typescript-v1');assert.equal(b.gitHead,command('git',['rev-parse','HEAD']).trim());
 assert.deepEqual(b.inputSha256,pinnedHashes());assert.deepEqual(b.baselineFailedTasks,ids);assert.deepEqual(b.expectedSummary,expected);
 for(const name of configFiles){const bytes=readFileSync(join(parent,name));assert.equal(sha(readFileSync(join(repo,name))),sha(bytes));assert.equal(command('git',['show',`HEAD:${name}`]),bytes.toString('utf8'));}
 assert.equal(read(join(repo,'TASKS.json')),read(join(inputs,'tasks.json')));
 assert.equal(read(join(protectedDir,'tasks.json')),read(join(inputs,'tasks.json')));assert.equal(read(join(protectedDir,'grader.ts')),read(join(inputs,'grader.ts')));
 for(const id of ids)assert.equal(command('git',['show',`HEAD:src/${id}.ts`]),read(join(inputs,`fixture/${id}.ts`)),'Captured initial source changed');
 const untracked=command('git',['ls-files','--others','--exclude-standard']).trim().split('\n').filter(Boolean);
 for(const file of untracked)assert.match(file,/^src\/[a-zA-Z0-9_-]+\.ts$/,'Only TypeScript source helpers may be added');
 return b;
}
function sourceFingerprint(){
 const directory=join(repo,'src');
 assert.ok(lstatSync(directory).isDirectory()&&!lstatSync(directory).isSymbolicLink(),'Source root must be a real directory');
 const files:Record<string,string>={};
 function visit(relative:string){
  const location=join(directory,relative), stat=lstatSync(location);
  assert.ok(!stat.isSymbolicLink(),'Source cannot contain symlinks');
  if(stat.isDirectory())for(const child of readdirSync(location).sort())visit(relative?relative+'/'+child:child);
  else {assert.ok(stat.isFile(),'Source must contain regular files');files[relative]=sha(readFileSync(location));}
 }
 visit('');return files;
}
function gradeCurrent(){
 const sourceBefore=sourceFingerprint();
 const assertSourceUnchanged=()=>assert.deepEqual(sourceFingerprint(),sourceBefore,'Candidate changed source during grading');
 rmSync(join(repo,'dist'),{recursive:true,force:true});
 const build=spawnSync('timeout',['-k','1','30','tsc','-p','tsconfig.json'],{cwd:repo,encoding:'utf8',timeout:35000,maxBuffer:1_000_000});
 const buildText=(build.stdout??'')+(build.stderr??'')+(build.error?'\n'+String(build.error.message):'');
 assertSourceUnchanged();
 const built=build.status===0;
 const results=tasks.map((task):TaskResult=>{
  if(!built)return {task:task.id,passed:false,checks:[],error:'Compilation failed'};
  const run=spawnSync('timeout',['-k','1','10','node',join(protectedDir,'grader.ts'),task.id,join(repo,'dist',task.id+'.js')],{cwd:repo,encoding:'utf8',timeout:15000,maxBuffer:1_000_000});
  assertSourceUnchanged();
  try{
   const lines=(run.stdout??'').split('\n').filter(line=>line.startsWith('REGRESSION_RESULT '));assert.equal(lines.length,1);
   const line=lines[0];assert.ok(line);const raw:unknown=JSON.parse(line.slice('REGRESSION_RESULT '.length));const result=taskResult(raw,task);
   assert.equal(result.passed,result.checks.every(c=>c.passed));assert.equal(run.status,result.passed?0:1);assert.ok(!run.error);
   return result;
  }catch{return {task:task.id,passed:false,checks:[],error:(errorCode(run.error)==='ETIMEDOUT'||run.status===124||run.status===137)?'Task exceeded 10-second deadline':'Invalid grader result or execution failure'};}
 });
 const summary={tasks:3,tasksPassed:results.filter(r=>r.passed).length,checks:12,checksPassed:results.reduce((n,r)=>n+r.checks.filter(c=>c.passed).length,0),baselineFailedTasks:3,compileSucceeded:built};
 return {summary,results,buildText:built?'TypeScript compilation passed.\n':buildText};
}
function diff(){
 const extra=command('git',['ls-files','--others','--exclude-standard','--','src']).trim().split('\n').filter(Boolean);
 if(extra.length)command('git',['add','--intent-to-add','--',...extra]);
 return command('git',['diff','--no-ext-diff','--no-textconv','--binary','HEAD','--','src']);
}
function prepare(){
 if(existsSync(repo)||existsSync(join(root,'baseline.json'))||existsSync(protectedDir))throw new Error('Refusing to replace prepared state');
 mkdirSync(join(repo,'src'),{recursive:true});mkdirSync(protectedDir,{recursive:true});
 for(const f of configFiles)cpSync(join(parent,f),join(repo,f));
 cpSync(join(parent,'node_modules'),join(repo,'node_modules'),{recursive:true});
 for(const id of ids)cpSync(join(inputs,`fixture/${id}.ts`),join(repo,`src/${id}.ts`));
 cpSync(join(inputs,'tasks.json'),join(repo,'TASKS.json'));
 for(const f of ['grader.ts','tasks.json']){cpSync(join(inputs,f),join(protectedDir,f));chmodSync(join(protectedDir,f),0o444);}
 chmodSync(protectedDir,0o555);
 command('git',['init','--quiet','--initial-branch=main']);command('git',['config','user.name','Render Example']);command('git',['config','user.email','example@example.invalid']);command('git',['add','.']);
 command('git',['commit','--quiet','-m','Prepared broken TypeScript regression tasks'],{env:{...process.env,GIT_AUTHOR_DATE:'2026-01-01T00:00:00Z',GIT_COMMITTER_DATE:'2026-01-01T00:00:00Z'}});
 const baseline=gradeCurrent();assert.equal(baseline.summary.compileSucceeded,true);assert.equal(baseline.summary.tasksPassed,0,'Every initial task must expose a failure');
 write(join(root,'baseline-results.json'),baseline.results);
 write(join(root,'baseline.json'),{fixture:'agent-regression-typescript-v1',gitHead:command('git',['rev-parse','HEAD']).trim(),inputSha256:pinnedHashes(),baselineFailedTasks:ids,expectedSummary:expected,baselineResultsSha256:sha(readFileSync(join(root,'baseline-results.json')))});
 rmSync(join(repo,'dist'),{recursive:true,force:true});
}
function grade(){
 clearReceipt();const b=baselineCheck();assert.equal(sha(readFileSync(join(root,'baseline-results.json'))),b.baselineResultsSha256);
 const result=gradeCurrent();baselineCheck();
 mkdirSync(output,{recursive:true});write(join(output,'summary.json'),result.summary);write(join(output,'task-results.json'),result.results);writeFileSync(join(output,'build.txt'),result.buildText);writeFileSync(join(output,'change.patch'),diff());
 if(result.summary.tasksPassed!==3||!result.summary.compileSucceeded)return false;
 assert.deepEqual(result.summary,expected);const receipt={passed:true,summary:result.summary,outputSha256:Object.fromEntries(outputNames.map(n=>[n,sha(readFileSync(join(output,n)))]))};write(join(output,'verification.json'),receipt);return true;
}
function analyze(){
 clearReceipt();baselineCheck();
 // Reference solution is an acceptance fixture, never part of grading user edits.
 for(const id of ids)cpSync(join(inputs,`reference/${id}.ts`),join(repo,`src/${id}.ts`));
 assert.equal(grade(),true,'Reference solution did not pass');verify();
}
function verify(){
 const path=join(output,'verification.json');const previous=existsSync(path)?readFileSync(path):undefined;clearReceipt();
 const b=baselineCheck();assert.equal(sha(readFileSync(join(root,'baseline-results.json'))),b.baselineResultsSha256);
 assert.ok(previous,'No passing grade receipt');const receipt=object(JSON.parse(previous.toString('utf8')));assert.equal(receipt.passed,true);assert.deepEqual(receipt.summary,expected);assert.deepEqual(json(join(output,'summary.json')),expected);
 assert.deepEqual(receipt.outputSha256,Object.fromEntries(outputNames.map(n=>[n,sha(readFileSync(join(output,n)))])));assert.equal(read(join(output,'change.patch')),diff());
 // Recompile and re-execute independent checks; edited source may be any correct solution.
 const result=gradeCurrent();baselineCheck();assert.deepEqual(result.summary,expected);assert.deepEqual(json(join(output,'task-results.json')),result.results);assert.equal(read(join(output,'build.txt')),result.buildText);
 write(path,receipt);
}
function test(){
 verify();
 for(const file of [join(root,'baseline.json'),join(root,'baseline-results.json'),join(output,'summary.json'),join(output,'task-results.json'),join(output,'change.patch'),join(protectedDir,'grader.ts')]){
  const old=readFileSync(file);try{chmodSync(file,0o644);writeFileSync(file,'{}\n');assert.throws(()=>verify());assert.equal(existsSync(join(output,'verification.json')),false);}finally{writeFileSync(file,old);if(file.startsWith(protectedDir))chmodSync(file,0o444);}
  assert.equal(grade(),true);
 }
 // A different, behaviorally correct implementation must score without replacing it.
 const file=join(repo,'src/grouping.ts');const original=read(file);
 const alternative=original.replace("const totals: Record<string, number> = Object.create(null);","const totals: Record<string, number> = {};\n  Object.setPrototypeOf(totals, null);");
 assert.notEqual(original,alternative);writeFileSync(file,alternative);assert.equal(grade(),true);verify();assert.equal(read(file),alternative);
 // A candidate cannot change source after compilation and receive a passing receipt.
 const mutator=original+`\nconst fs = await (Function('return import("node:fs")')());\nfs.writeFileSync('/workspace/agent-regression-typescript/repo/src/grouping.ts', 'export function groupTotals() { return {}; }\\n');\n`;
 writeFileSync(file,mutator);assert.throws(()=>grade(),/Candidate changed source during grading/);assert.equal(existsSync(join(output,'verification.json')),false);
 writeFileSync(file,original);assert.equal(grade(),true);
 // Fingerprint added helpers too, including mutations from an already-graded module.
 const helper=join(repo,'src/helper.ts');writeFileSync(helper,'export const value = 1;\n');
 const helperMutator=original+`\nconst fs = await (Function('return import("node:fs")')());\nfs.writeFileSync('/workspace/agent-regression-typescript/repo/src/helper.ts', 'export const value = 2;\\n');\n`;
 writeFileSync(file,helperMutator);assert.throws(()=>grade(),/Candidate changed source during grading/);assert.equal(existsSync(join(output,'verification.json')),false);
 rmSync(helper);writeFileSync(file,original);assert.equal(grade(),true);
 // A partial solution and a syntax error produce useful failed grades, never old success.
 cpSync(join(inputs,'fixture/idempotency.ts'),join(repo,'src/idempotency.ts'));assert.equal(grade(),false);assert.equal(object(json(join(output,'summary.json'))).tasksPassed,2);assert.equal(existsSync(join(output,'verification.json')),false);
 writeFileSync(file,'this is not TypeScript;\n');assert.equal(grade(),false);assert.equal(object(json(join(output,'summary.json'))).compileSucceeded,false);assert.equal(existsSync(join(output,'verification.json')),false);
 cpSync(join(inputs,'reference/idempotency.ts'),join(repo,'src/idempotency.ts'));
 writeFileSync(file,'export function groupTotals() { for (;;) {} }\n');assert.equal(grade(),false);assert.equal(object(array(json(join(output,'task-results.json')))[0]).error,'Task exceeded 10-second deadline');assert.equal(existsSync(join(output,'verification.json')),false);
 analyze();for(const n of [...outputNames,'verification.json'])rmSync(join(output,n));analyze();verify();
 console.log('Six artifact/grader corruption checks, alternative solution, partial score, compile failure, worker timeout, source/helper mutation rejection and regeneration passed');
}
const action=process.argv[2];
if(action==='prepare')prepare();else if(action==='analyze')analyze();else if(action==='grade'){if(!grade())process.exitCode=1;}else if(action==='verify')verify();else if(action==='test')test();else throw new Error('Unknown recipe action');
if(!process.exitCode)console.log(`agent-regression-typescript ${action}: passed`);
