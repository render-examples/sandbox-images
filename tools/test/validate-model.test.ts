import assert from 'node:assert/strict';
import test from 'node:test';
import {parseModelOptions,validatePreparedRun,validateSnapshot,assertFreshSandboxId,validateRestoredSandbox,observeCreate,terminateAndObserve,redactJson,main,type ModelValidationApi} from '../validate-model.ts';
import {checkedExec,safeError,GuestExecError} from '../live-support.ts';

test('model runs accept only a completed retained snapshot and pinned source',()=>{
 const base={passed:true,snapshotKind:'filesystem',recipe:'agent-tool-loop',workspaceId:'tea-test',sandboxGroupId:'sbg-test',snapshotId:'snp-test',retainedSnapshotId:'snp-test',sourceSandboxId:'sbx-test',baselineSha256:'a'.repeat(64),imageSource:'ghcr.io/test/image@sha256:'+'b'.repeat(64),computePlan:'1c-2g'};
 assert.equal(validatePreparedRun(base).recipe,'agent-tool-loop');
 for(const update of [{passed:false},{snapshotKind:'runtime'},{snapshotId:'snp-other'},{retainedSnapshotId:null},{imageSource:'image:latest'},{recipe:'../escape'}])assert.throws(()=>validatePreparedRun({...base,...update}));
});
test('model configuration never permits control-plane credentials in the guest',()=>{
 const args=['--prepared-run','run.json','--command','trusted-runner','--receipt','/workspace/task/result.json','--key','OPENROUTER_API_KEY'];
 assert.equal(parseModelOptions(args)?.key,'OPENROUTER_API_KEY');
 assert.equal(parseModelOptions(['--help']),null);
 assert.throws(()=>parseModelOptions([...args,'--env','RENDER_API_KEY=value']));
 assert.throws(()=>parseModelOptions(args.map(x=>x==='OPENROUTER_API_KEY'?'RENDER_API_KEY':x)));
 assert.throws(()=>parseModelOptions(args.map(x=>x==='/workspace/task/result.json'?'/workspace/../secret.json':x)));
});
test('model secrets are redacted even when split across exec output chunks',async()=>{
 const env={OPENROUTER_API_KEY:'model-secret',GEMINI_API_KEY:'google-secret'};
 assert.equal(safeError('model-secret google-secret',env),'[redacted] [redacted]');
 async function* events(){yield {type:'output',data:'failed model-'};yield {type:'output',data:'secret'};yield {type:'exit',exit_code:1};}
 await assert.rejects(checkedExec(events(),'sbx-test','runner',env),(error:unknown)=>{
  assert(error instanceof GuestExecError);assert.equal(error.diagnostic.outputTail,'failed [redacted]');return true;
 });
});

import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import type {SandboxCreateInput} from '@renderinc/sdk';

const baseline=Buffer.from('{"fixture":"prepared"}');
const prepared=()=>({passed:true,snapshotKind:'filesystem',recipe:'agent-tool-loop',workspaceId:'tea-test',sandboxGroupId:'sbg-test',snapshotId:'snp-test',retainedSnapshotId:'snp-test',sourceSandboxId:'sbx-source',baselineSha256:createHash('sha256').update(baseline).digest('hex'),imageSource:'ghcr.io/test/image@sha256:'+'b'.repeat(64),computePlan:'1c-2g'});
const snapshot=()=>({id:'snp-test',sandboxGroupId:'sbg-test',sourceSandboxId:'sbx-source',status:'available' as const,kind:'filesystem' as const,expiresAt:new Date(Date.now()+60_000).toISOString()});
const state=(id:string,status:'running'|'terminated'='running')=>({id,status,sandboxGroupId:'sbg-test',plan:'1c-2g'});
const modelArgs=['--prepared-run','run.json','--command','installed-runner','--receipt','/workspace/task/result.json','--key','OPENROUTER_API_KEY'];
const testEnv={RENDER_API_KEY:'host-secret-value',OPENROUTER_API_KEY:'model-secret-value',GEMINI_API_KEY:'google-secret-value'};
const timing={requestTimeoutMs:10,readbackTimeoutMs:100,pollMs:1};
function deferred<T>(){let resolve!:(value:T)=>void;let reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

test('model options deduplicate repeated supported keys and bound command timeouts',()=>{
 const result=parseModelOptions([...modelArgs,'--key','GEMINI_API_KEY','--key','OPENROUTER_API_KEY','--timeout-seconds','900']);
 assert.deepEqual(result?.keys,['OPENROUTER_API_KEY','GEMINI_API_KEY']);assert.equal(result?.timeoutSeconds,900);
 for(const seconds of ['29','901','1.5','NaN'])assert.throws(()=>parseModelOptions([...modelArgs,'--timeout-seconds',seconds]),/30..900/);
 for(const path of ['/workspace//task/result.json','/workspace/./task/result.json'])assert.throws(()=>parseModelOptions(modelArgs.map(value=>value==='/workspace/task/result.json'?path:value)));
});

test('prepared source, baseline hash, snapshot expiry and restore identity fail closed',()=>{
 const valid=validatePreparedRun(prepared());
 for(const change of [{baselineSha256:''},{baselineSha256:'a'.repeat(63)},{sourceSandboxId:'not-an-id'},{imageSource:'wrong.example/image@sha256:'+'b'.repeat(64)},{computePlan:'../plan'}])assert.throws(()=>validatePreparedRun({...prepared(),...change}));
 validateSnapshot(snapshot(),valid);
 for(const change of [{sourceSandboxId:'sbx-other'},{sandboxGroupId:'sbg-other'},{expiresAt:'invalid'},{expiresAt:'2000-01-01T00:00:00Z'}])assert.throws(()=>validateSnapshot({...snapshot(),...change},valid));
 assertFreshSandboxId('sbx-first','sbx-source',new Set());
 for(const id of ['sbx-source','sbx-first','bad'])assert.throws(()=>assertFreshSandboxId(id,'sbx-source',new Set(['sbx-first'])));
 validateRestoredSandbox(state('sbx-first'),'sbx-first',valid);
 for(const change of [{sandboxGroupId:'sbg-other'},{plan:'8c-16g'},{id:'sbx-other'},{status:'terminated' as const}])assert.throws(()=>validateRestoredSandbox({...state('sbx-first'),...change},'sbx-first',valid));
});

test('an uncertain create is never retried and a late owned ID is cleaned up',async()=>{
 const created=deferred<{id:string}>();const cleaned=deferred<void>();const events:string[]=[];let posts=0;
 await assert.rejects(observeCreate({
  create:()=>{posts++;return created.promise;},
  created:async resource=>{events.push('id:'+resource.id);},
  uncertain:async()=>{events.push('uncertain');},
  cleanupLate:async resource=>{events.push('cleanup:'+resource.id);cleaned.resolve();},
  lateFailure:async error=>{cleaned.reject(error);},
 },5),/outcome unknown/);
 assert.equal(posts,1);assert.deepEqual(events,['uncertain']);
 created.resolve({id:'sbx-late'});await cleaned.promise;
 assert.deepEqual(events,['uncertain','id:sbx-late','cleanup:sbx-late']);assert.equal(posts,1);
});

test('late create cleanup still runs if resource journal persistence fails',async()=>{
 const created=deferred<{id:string}>();const cleaned=deferred<void>();const handled=deferred<void>();
 await assert.rejects(observeCreate({create:()=>created.promise,created:async()=>{throw Error('disk full');},uncertain:async()=>{},cleanupLate:async()=>{cleaned.resolve();},lateFailure:async()=>{handled.resolve();}},5),/outcome unknown/);
 created.resolve({id:'sbx-late'});await cleaned.promise;await handled.promise;
});

test('termination requires terminal readback, not a successful POST',async()=>{
 let posts=0,reads=0;const run:Record<string,unknown>={};
 await terminateAndObserve({terminate:async()=>{posts++;},get:async id=>state(id,++reads===3?'terminated':'running')},'sbx-owned','tea-test',run,async()=>{},timing,testEnv);
 assert.equal(posts,1);assert.equal(reads,3);assert.equal(run.terminated,true);assert.ok(run.terminatedObservedAt);
 const neverTerminal:Record<string,unknown>={};posts=0;
 await assert.rejects(terminateAndObserve({terminate:async()=>{posts++;},get:async id=>state(id)},'sbx-owned','tea-test',neverTerminal,async()=>{},{...timing,readbackTimeoutMs:8},testEnv),/unconfirmed/);
 assert.equal(posts,1);assert.equal(neverTerminal.terminated,false);
});

test('a lost termination acknowledgement is reconciled by GET without another POST',async()=>{
 let posts=0;const run:Record<string,unknown>={};
 await terminateAndObserve({terminate:()=>{posts++;return new Promise<void>(()=>{});},get:async id=>state(id,'terminated')},'sbx-owned','tea-test',run,async()=>{},{...timing,requestTimeoutMs:5},testEnv);
 assert.equal(posts,1);assert.equal(run.terminated,true);assert.match(String(run.terminationRequestError),/outcome unknown/);
});

test('nested receipt redaction retains valid JSON and no host/model credentials',()=>{
 const receipt={passed:true,nested:[{diagnostic:'host-secret-value model-secret-value google-secret-value',url:'https://example.test/path'}]};
 const result=redactJson(receipt,testEnv);
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{passed:true,nested:[{diagnostic:'[redacted] [redacted] [redacted]',url:'[URL redacted]'}]});
});

function fakeApi(){
 const created:SandboxCreateInput[]=[];const terminated:string[]=[];const workloads:string[]=[];const statuses=new Map<string,'running'|'terminated'>();
 const api:ModelValidationApi={
  getGroup:async id=>({id,ownerId:'tea-test'}),snapshots:{get:async()=>snapshot()},
  create:async input=>{created.push(input);const id='sbx-restore'+created.length;statuses.set(id,'running');return {id};},
  waitUntilRunning:async id=>state(id),get:async id=>state(id,statuses.get(id)),
  terminate:async id=>{terminated.push(id);statuses.set(id,'terminated');},
  download:async(_id,path)=>({data:path.endsWith('/baseline.json')?baseline:Buffer.from(JSON.stringify({passed:true,diagnostic:'model-secret-value'}))}),
  exec:async(id,command)=>{if(command.startsWith('timeout '))workloads.push(id);return (async function*(){yield {type:'exit' as const,exit_code:0};})();},
 };
 return {api,created,terminated,workloads};
}
async function fixture(action:(root:string,args:string[])=>Promise<void>){
 const root=await mkdtemp(join(tmpdir(),'model-runner-'));
 try{
  const source=join(root,'prepared.json');await writeFile(source,JSON.stringify(prepared()));
  await action(root,['--prepared-run',source,'--command','installed-runner','--receipt','/workspace/task/result.json','--key','OPENROUTER_API_KEY','--key','GEMINI_API_KEY','--output',join(root,'evidence')]);
 }finally{await rm(root,{recursive:true,force:true});}
}

test('two independent restores each verify baseline, run once and confirm cleanup',async()=>{
 await fixture(async(root,args)=>{
  const mock=fakeApi();await main(args,{api:mock.api,env:testEnv,cleanupTiming:timing});
  assert.equal(mock.created.length,2);assert.deepEqual(mock.workloads,['sbx-restore1','sbx-restore2']);assert.deepEqual(mock.terminated,mock.workloads);
  for(const request of mock.created){assert.equal(request.snapshotId,'snp-test');assert.equal(request.sandboxGroupId,'sbg-test');assert.deepEqual(request.env,{OPENROUTER_API_KEY:testEnv.OPENROUTER_API_KEY,GEMINI_API_KEY:testEnv.GEMINI_API_KEY});assert.equal(Object.hasOwn(request.env,'RENDER_API_KEY'),false);}
  const journal=JSON.parse(await readFile(join(root,'evidence/run.json'),'utf8'));
  assert.equal(journal.passed,true);assert.equal(journal.runs.length,2);assert(journal.runs.every((run:{baselineVerified:boolean;terminated:boolean})=>run.baselineVerified&&run.terminated));
  const receipt=await readFile(join(root,'evidence/receipt-0.json'),'utf8');assert(!receipt.includes(testEnv.OPENROUTER_API_KEY));assert.equal(JSON.parse(receipt).diagnostic,'[redacted]');
  assert.equal(journal.runs[0].receiptSha256,createHash('sha256').update(receipt).digest('hex'));
 });
});

test('baseline mismatch stops model execution and still confirms owned cleanup',async()=>{
 await fixture(async(root,args)=>{
  const mock=fakeApi();mock.api.download=async()=>({data:Buffer.from('wrong baseline')});
  await assert.rejects(main(args,{api:mock.api,env:testEnv,cleanupTiming:timing}),/captured baseline/);
  assert.equal(mock.created.length,1);assert.deepEqual(mock.workloads,[]);assert.deepEqual(mock.terminated,['sbx-restore1']);
  const journal=JSON.parse(await readFile(join(root,'evidence/run.json'),'utf8'));assert.equal(journal.passed,false);assert.equal(journal.runs[0].terminated,true);
 });
});

test('late create after main failure journals its ID and independently verifies cleanup',async()=>{
 await fixture(async(root,args)=>{
  const mock=fakeApi();const pending=deferred<{id:string}>();let posts=0;mock.api.create=()=>{posts++;return pending.promise;};
  await assert.rejects(main(args,{api:mock.api,env:testEnv,cleanupTiming:timing,createTimeoutMs:5}),/outcome unknown/);
  let journal=JSON.parse(await readFile(join(root,'evidence/run.json'),'utf8'));assert.equal(journal.runs[0].createOutcomeUnknown,true);
  pending.resolve({id:'sbx-late'});
  for(let attempt=0;attempt<100;attempt++){
   journal=JSON.parse(await readFile(join(root,'evidence/run.json'),'utf8'));if(journal.runs[0].terminated===true)break;await pause(2);
  }
  assert.equal(posts,1);assert.equal(journal.runs.length,1);assert.equal(journal.passed,false);assert.equal(journal.runs[0].sandboxId,'sbx-late');assert.equal(journal.runs[0].terminated,true);assert.equal(journal.runs[0].createOutcomeUnknown,false);assert.deepEqual(mock.terminated,['sbx-late']);assert.deepEqual(mock.workloads,[]);
  // Allow the final observer write to finish before removing its output directory.
  await pause(5);
 });
});

for(const receiptMode of ['failed','claims-passed','missing'] as const){
 test(`failed guest execution preserves ${receiptMode} receipt evidence without passing`,async()=>{
  await fixture(async(root,args)=>{
   const mock=fakeApi();const downloads:string[]=[];const events:string[]=[];
   mock.api.exec=async(_id,command)=>(async function*(){yield {type:'exit' as const,exit_code:command.startsWith('timeout ')?9:0};})();
   mock.api.download=async(_id,path)=>{
    downloads.push(path);
    if(path.endsWith('/baseline.json'))return {data:baseline};
    events.push('receipt');
    if(receiptMode==='missing')throw Error('Receipt not found');
    return {data:Buffer.from(JSON.stringify({passed:receiptMode==='claims-passed',controls:[{name:'independent-oracle',passed:false,diagnostic:'model-secret-value'}]}))};
   };
   const terminate=mock.api.terminate;mock.api.terminate=async id=>{events.push('terminate');await terminate(id);};
   await assert.rejects(main(args,{api:mock.api,env:testEnv,cleanupTiming:timing}),/9/);
   assert.equal(mock.created.length,1);assert.deepEqual(mock.terminated,['sbx-restore1']);assert.deepEqual(events,['receipt','terminate']);
   assert.deepEqual(downloads,['/workspace/agent-tool-loop/baseline.json','/workspace/task/result.json']);
   const journal=JSON.parse(await readFile(join(root,'evidence/run.json'),'utf8'));
   assert.equal(journal.passed,false);assert.equal(journal.runs[0].passed,false);assert.equal(journal.runs[0].terminated,true);assert.match(journal.runs[0].error,/9/);
   if(receiptMode==='missing'){
    assert.match(journal.runs[0].failedReceiptError,/not found/);await assert.rejects(readFile(join(root,'evidence/receipt-0.json')),/ENOENT/);
   }else{
    const saved=await readFile(join(root,'evidence/receipt-0.json'),'utf8');
    assert.deepEqual(JSON.parse(saved).controls,[{name:'independent-oracle',passed:false,diagnostic:'[redacted]'}]);
    assert.equal(journal.runs[0].receiptSha256,createHash('sha256').update(saved).digest('hex'));
    assert.equal(journal.runs[0].receiptPassed,receiptMode==='claims-passed');
   }
  });
 });
}
