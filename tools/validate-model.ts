/** Run a trusted installed agent on two independent restores of a verified recipe. */
import {createHash, randomUUID} from 'node:crypto';
import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {setTimeout as pause} from 'node:timers/promises';
import {Render, type Sandbox, type SandboxCreateInput, type SandboxExecEvent, type SandboxSnapshot} from '@renderinc/sdk';
import {checkedExec, safeError} from './live-support.ts';

const domains:Record<string,string[]>={OPENAI_API_KEY:['api.openai.com'],GEMINI_API_KEY:['generativelanguage.googleapis.com'],ANTHROPIC_API_KEY:['api.anthropic.com'],OPENROUTER_API_KEY:['openrouter.ai']};
export function parseModelOptions(args:string[]){
 const {values:v}=parseArgs({args,options:{'prepared-run':{type:'string'},command:{type:'string'},receipt:{type:'string'},key:{type:'string',multiple:true},'timeout-seconds':{type:'string'},env:{type:'string',multiple:true},output:{type:'string'},help:{type:'boolean'}}});
 if(v.help)return null;
 if(!v['prepared-run']||!v.command?.trim()||!v.receipt||!v.key?.length||!v.key.every(key=>Object.hasOwn(domains,key)))throw new Error('Supply --prepared-run, --command, --receipt and a supported --key');
 if(!/^\/workspace\/[a-zA-Z0-9_./-]+\.json$/.test(v.receipt)||v.receipt.slice(1).split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Receipt must be a JSON file under /workspace');
 const env:Record<string,string>={};
 for(const item of v.env??[]){const index=item.indexOf('=');const name=item.slice(0,index);if(index<1||!/^(AGENT_MODEL|AGENT_PROVIDER|MCP_RECORD_CALLS|GOOSE_PROVIDER|GOOSE_MODEL)$/.test(name))throw new Error('Only explicit nonsecret model settings are accepted by --env');env[name]=item.slice(index+1);}
 const timeoutSeconds=Number(v['timeout-seconds']??300);if(!Number.isInteger(timeoutSeconds)||timeoutSeconds<30||timeoutSeconds>900)throw new Error('Command timeout must be 30..900 seconds');
 return {preparedRun:resolve(v['prepared-run']),command:v.command,receipt:v.receipt,key:v.key[0],keys:[...new Set(v.key)],timeoutSeconds,env,output:resolve(v.output??join('evidence','model-'+randomUUID()))};
}
export function validatePreparedRun(v:unknown){
 if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid prepared-run journal');
 const r=v as Record<string,unknown>;
 for(const name of ['recipe','workspaceId','sandboxGroupId','retainedSnapshotId','sourceSandboxId','baselineSha256','imageSource','computePlan'])if(typeof r[name]!=='string')throw new Error(`Missing ${name}`);
 if(r.passed!==true||r.snapshotKind!=='filesystem'||r.snapshotId!==r.retainedSnapshotId)throw new Error('Require a completed, retained filesystem snapshot validation');
 if(!/^tea-[a-z0-9]+$/.test(String(r.workspaceId))||!/^sbg-[a-z0-9]+$/.test(String(r.sandboxGroupId))||!/^snp-[a-z0-9]+$/.test(String(r.retainedSnapshotId))||!/^sbx-[a-z0-9]+$/.test(String(r.sourceSandboxId)))throw new Error('Invalid workspace, group, source or snapshot identity');
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(r.recipe))||!/^ghcr\.io\/[a-z0-9][a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(String(r.imageSource)))throw new Error('Invalid recipe or pinned image');
 if(!/^[a-f0-9]{64}$/.test(String(r.baselineSha256))||!/^[a-z0-9][a-z0-9-]+$/.test(String(r.computePlan)))throw new Error('Invalid baseline hash or compute plan');
 return r as Record<string,unknown>&{recipe:string;workspaceId:`tea-${string}`;sandboxGroupId:string;retainedSnapshotId:string;sourceSandboxId:string;baselineSha256:string;imageSource:string;computePlan:string};
}
type PreparedRun=ReturnType<typeof validatePreparedRun>;
type SandboxState=Pick<Sandbox,'id'|'status'|'sandboxGroupId'|'plan'>;
type SnapshotState=Pick<SandboxSnapshot,'id'|'sandboxGroupId'|'sourceSandboxId'|'status'|'kind'|'expiresAt'>;
/** Narrow structural interface: every method is supported by SDK 1.6.0. */
export interface ModelValidationApi {
 create(input:SandboxCreateInput):Promise<{id:string}>;
 get(id:string,ownerId?:`tea-${string}`,signal?:AbortSignal):Promise<SandboxState>;
 getGroup(id:string):Promise<{id:string;ownerId:string}>;
 waitUntilRunning(id:string,options:{timeoutMs:number;ownerId:`tea-${string}`;signal:AbortSignal}):Promise<SandboxState>;
 terminate(id:string,ownerId?:`tea-${string}`):Promise<void>;
 download(id:string,path:string,ownerId?:`tea-${string}`,signal?:AbortSignal):Promise<{data:Uint8Array}>;
 exec(id:string,command:string,ownerId?:`tea-${string}`,signal?:AbortSignal):Promise<AsyncIterable<SandboxExecEvent>>;
 snapshots:{get(input:{sandboxGroupId:string;snapshotId:string;ownerId:`tea-${string}`},signal?:AbortSignal):Promise<SnapshotState>};
}
export function validateSnapshot(snapshot:SnapshotState,prepared:PreparedRun,now=Date.now()){
 if(snapshot.id!==prepared.retainedSnapshotId||snapshot.sandboxGroupId!==prepared.sandboxGroupId||snapshot.status!=='available'||snapshot.kind!=='filesystem'||snapshot.sourceSandboxId!==prepared.sourceSandboxId)throw new Error('Snapshot is unavailable or differs from the verified source');
 const expiry=Date.parse(snapshot.expiresAt);if(!Number.isFinite(expiry)||expiry<=now)throw new Error('Verified snapshot has expired or has no valid expiry');
}
export function assertFreshSandboxId(id:string,sourceId:string,seen:Set<string>){
 if(!/^sbx-[a-z0-9]+$/.test(id)||id===sourceId||seen.has(id))throw new Error('Create did not return a new independent sandbox identity');
}
export function validateRestoredSandbox(sandbox:SandboxState,id:string,prepared:PreparedRun){
 if(sandbox.id!==id||sandbox.sandboxGroupId!==prepared.sandboxGroupId||sandbox.plan!==prepared.computePlan||sandbox.status!=='running')throw new Error('Restored sandbox identity, group, plan or running state differs from the request');
}
class DeadlineError extends Error {}
async function bounded<T>(operation:Promise<T>,milliseconds:number,message:string,onTimeout?:()=>void):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{onTimeout?.();reject(new DeadlineError(message));},milliseconds);})]);}
 finally{if(timer)clearTimeout(timer);}
}
/**
 * SDK create has no cancellation signal. Stop the workflow at the deadline, never
 * retry the POST, and keep observing the original promise for a late owned ID.
 * A process killed externally cannot run this observer; its pre-POST journal and
 * the finite sandbox lifetime remain necessary for manual reconciliation.
 */
export async function observeCreate<T>(actions:{
 create():Promise<T>;created(resource:T):Promise<void>;uncertain(error:unknown):Promise<void>;
 cleanupLate(resource:T):Promise<void>;lateFailure(error:unknown):Promise<void>;
},timeoutMs=30_000):Promise<T>{
 let expired=false;
 const observed=Promise.resolve().then(()=>actions.create()).then(async resource=>{
  try{await actions.created(resource);}finally{if(expired)await actions.cleanupLate(resource);}
  return resource;
 });
 // Consume observer failures even after the caller has already failed its deadline.
 void observed.catch(async error=>{if(expired)await actions.lateFailure(error);}).catch(error=>console.error(safeError(error)));
 try{return await bounded(observed,timeoutMs,'Sandbox create timed out; outcome unknown. Inspect the journal before any retry.',()=>{expired=true;});}
 catch(error){await actions.uncertain(error);throw error;}
}
export type CleanupTiming={requestTimeoutMs:number;readbackTimeoutMs:number;pollMs:number};
const defaultCleanup:CleanupTiming={requestTimeoutMs:30_000,readbackTimeoutMs:60_000,pollMs:1_000};
/** A terminate POST acknowledgement is not a terminal-state observation. */
export async function terminateAndObserve(api:Pick<ModelValidationApi,'terminate'|'get'>,id:string,ownerId:`tea-${string}`,run:Record<string,unknown>,persist:()=>Promise<void>,timing:CleanupTiming=defaultCleanup,env:NodeJS.ProcessEnv=process.env){
 const save=async()=>{try{await persist();}catch(error){run.journalError=safeError(error,env);console.error(`Resource ${id}: ${safeError(error,env)}`);}};
 run.terminationRequestedAt=new Date().toISOString();run.terminated=false;await save();
 // Exactly one mutation, with a handler retained if its acknowledgement is late.
 const request=Promise.resolve().then(()=>api.terminate(id,ownerId)).then(async()=>{run.terminationAcknowledgedAt=new Date().toISOString();await save();});
 try{await bounded(request,timing.requestTimeoutMs,'Termination acknowledgement timed out; outcome unknown');}
 catch(error){run.terminationRequestError=safeError(error,env);await save();}
 const deadline=Date.now()+timing.readbackTimeoutMs;
 while(Date.now()<deadline){
  const remaining=Math.max(1,deadline-Date.now());
  try{
   const state=await bounded(api.get(id,ownerId,AbortSignal.timeout(Math.min(5_000,remaining))),Math.min(5_000,remaining),'Termination readback timed out');
   if(state.id!==id)throw new Error('Termination readback returned a different sandbox');
   run.lastObservedStatus=state.status;
   if(state.status==='terminated'){run.terminated=true;run.terminatedObservedAt=new Date().toISOString();await save();return;}
  }catch(error){run.terminationReadbackError=safeError(error,env);}
  await pause(Math.min(timing.pollMs,Math.max(0,deadline-Date.now())));
 }
 throw new Error(`Termination of ${id} remains unconfirmed after bounded status readback`);
}
/** Preserve valid JSON while removing secrets from any nested receipt/journal strings. */
export function redactJson(value:unknown,env:NodeJS.ProcessEnv=process.env):unknown{
 if(typeof value==='string')return safeError(value,env);
 if(Array.isArray(value))return value.map(item=>redactJson(item,env));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[safeError(key,env),redactJson(item,env)]));
 return value;
}
const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
export async function main(args:string[],dependencies:{api?:ModelValidationApi;env?:NodeJS.ProcessEnv;createTimeoutMs?:number;cleanupTiming?:CleanupTiming}={}){
 const options=parseModelOptions(args);if(!options){console.log('validate-model --prepared-run RUN_JSON --command TRUSTED_INSTALLED_COMMAND --receipt /workspace/RECIPE/RESULT.json --key OPENROUTER_API_KEY [--key GEMINI_API_KEY] --env AGENT_MODEL=MODEL [--timeout-seconds 30..900] [--output NEW_DIRECTORY]');return;}
 const env=dependencies.env??process.env;
 if(!env.RENDER_API_KEY||!options.keys.every(key=>env[key]))throw new Error('Host Render key and selected model keys are required');
 const prepared=validatePreparedRun(JSON.parse(await readFile(options.preparedRun,'utf8')));
 const api=dependencies.api??new Render({ownerId:prepared.workspaceId,token:env.RENDER_API_KEY}).sandboxes;
 const group=await bounded(api.getGroup(prepared.sandboxGroupId),30_000,'Sandbox group lookup timed out');
 if(group.id!==prepared.sandboxGroupId||group.ownerId!==prepared.workspaceId)throw new Error('Snapshot group does not belong to the verified workspace');
 const snapshot=await api.snapshots.get({sandboxGroupId:prepared.sandboxGroupId,snapshotId:prepared.retainedSnapshotId,ownerId:prepared.workspaceId},AbortSignal.timeout(30_000));
 validateSnapshot(snapshot,prepared);
 await mkdir(dirname(options.output),{recursive:true});
 await mkdir(options.output,{recursive:false,mode:0o700});
 const journal:Record<string,unknown>={schemaVersion:1,startedAt:new Date().toISOString(),workspaceId:prepared.workspaceId,sandboxGroupId:prepared.sandboxGroupId,sourceSandboxId:prepared.sourceSandboxId,recipe:prepared.recipe,imageSource:prepared.imageSource,baselineSha256:prepared.baselineSha256,computePlan:prepared.computePlan,clientVersion:'@renderinc/sdk@1.6.0',snapshotId:prepared.retainedSnapshotId,modelSettings:options.env,credentialNames:options.keys,commandSha256:sha(Buffer.from(options.command)),passed:false,runs:[]};
 const runs:Record<string,unknown>[]=[];journal.runs=runs;
 // Serialize writes, including late SDK callbacks, and publish complete JSON atomically.
 let writes=Promise.resolve();
 const persist=()=>{
  writes=writes.catch(()=>{}).then(async()=>{
   journal.updatedAt=new Date().toISOString();
   const path=join(options.output,'run.json');const temporary=join(options.output,'.run.json.tmp');
   await writeFile(temporary,JSON.stringify(redactJson(journal,env),null,2)+'\n',{mode:0o600});await rename(temporary,path);
  });return writes;
 };
 await persist();let failure:unknown;const seen=new Set<string>();
 try{
  for(let index=0;index<2;index++){
   let id:string|undefined;let cleanup:Promise<void>|undefined;let runFailure:unknown;
   const run:Record<string,unknown>={index,passed:false,createState:'pending',createStartedAt:new Date().toISOString()};runs.push(run);await persist();
   const cleanupOnce=async()=>{
    if(!id)return;
    cleanup??=terminateAndObserve(api,id,prepared.workspaceId,run,persist,dependencies.cleanupTiming??defaultCleanup,env);
    return cleanup;
   };
   try{
    await observeCreate({
     create:()=>api.create({ownerId:prepared.workspaceId,sandboxGroupId:prepared.sandboxGroupId,snapshotId:prepared.retainedSnapshotId,plan:prepared.computePlan,timeoutSeconds:options.timeoutSeconds+180,idleTimeoutSeconds:300,networkPolicy:{type:'allow-list',rules:[...new Set(options.keys.flatMap(key=>domains[key]))].map(domain=>({domain}))},env:{...options.env,...Object.fromEntries(options.keys.map(key=>[key,env[key]!]))}}),
     created:async sandbox=>{assertFreshSandboxId(sandbox.id,prepared.sourceSandboxId,seen);id=sandbox.id;seen.add(id);run.sandboxId=id;run.createOutcomeUnknown=false;run.createState=run.createTimedOut?'late-resolved':'resolved';await persist();},
     uncertain:async error=>{run.createTimedOut=error instanceof DeadlineError;run.createOutcomeUnknown=!id;run.createError=safeError(error,env);if(!id)run.createState='outcome-unknown';await persist();},
     cleanupLate:async()=>{run.lateCreateObservedAt=new Date().toISOString();run.passed=false;try{await cleanupOnce();}finally{await persist();}},
     lateFailure:async error=>{run.lateCreateError=safeError(error,env);run.passed=false;await persist();},
    },dependencies.createTimeoutMs??30_000);
    if(!id)throw new Error('Create completed without an owned sandbox ID');
    const restored=await api.waitUntilRunning(id,{timeoutMs:120_000,ownerId:prepared.workspaceId,signal:AbortSignal.timeout(125_000)});
    validateRestoredSandbox(restored,id,prepared);
    const baseline=await api.download(id,`/workspace/${prepared.recipe}/baseline.json`,prepared.workspaceId,AbortSignal.timeout(30_000));
    if(baseline.data.length>2_000_000||sha(baseline.data)!==prepared.baselineSha256)throw new Error('Fresh restore differs from captured baseline');
    run.baselineVerified=true;
    await checkedExec(api.exec(id,`test ! -e ${quote(options.receipt)}`,prepared.workspaceId,AbortSignal.timeout(30_000)),id,'assert live receipt absent',env);
    await checkedExec(api.exec(id,`timeout -k 5 ${options.timeoutSeconds} bash -c ${quote(options.command)}`,prepared.workspaceId,AbortSignal.timeout((options.timeoutSeconds+30)*1000)),id,options.command,env);
    const result=await api.download(id,options.receipt,prepared.workspaceId,AbortSignal.timeout(30_000));
    if(result.data.length>2_000_000)throw new Error('Model receipt exceeds size bound');
    const receipt:unknown=JSON.parse(Buffer.from(result.data).toString('utf8'));
    if(!receipt||typeof receipt!=='object'||!('passed' in receipt)||receipt.passed!==true)throw new Error('Installed independent grader did not mark the model run passed');
    const redacted=redactJson(receipt,env);const saved=Buffer.from(JSON.stringify(redacted,null,2)+'\n');
    await writeFile(join(options.output,`receipt-${index}.json`),saved,{mode:0o600});
    run.guestReceiptSha256=sha(result.data);run.receiptSha256=sha(saved);run.receiptRedacted=JSON.stringify(receipt)!==JSON.stringify(redacted);run.passed=true;
   }catch(error){runFailure=error;run.error=safeError(error,env);run.passed=false;}
   finally{
    try{await cleanupOnce();}catch(error){run.cleanupError=safeError(error,env);run.passed=false;runFailure??=error;}
    try{await persist();}catch(error){runFailure??=error;}
   }
   if(runFailure)throw runFailure;
  }
 }catch(error){failure=error;journal.error=safeError(error,env);}
 finally{journal.passed=!failure&&runs.length===2&&runs.every(r=>r.passed===true&&r.terminated===true);journal.completedAt=new Date().toISOString();await persist();}
 if(failure)throw new Error(`Model validation incomplete; inspect ${options.output}. ${safeError(failure,env)}`);
 console.log(`Passed two independent post-restore model runs; ${options.output}`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(safeError(error));process.exitCode=1;});
