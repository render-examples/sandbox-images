import assert from 'node:assert/strict';
import test from 'node:test';
import {parseModelOptions,validatePreparedRun} from '../validate-model.ts';
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
