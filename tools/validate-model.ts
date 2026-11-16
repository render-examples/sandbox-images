/** Run a trusted installed agent on two independent restores of a verified recipe. */
import {createHash, randomUUID} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {Render} from '@renderinc/sdk';
import {checkedExec, safeError} from './live-support.ts';

const domains:Record<string,string[]>={OPENAI_API_KEY:['api.openai.com'],GEMINI_API_KEY:['generativelanguage.googleapis.com'],ANTHROPIC_API_KEY:['api.anthropic.com'],OPENROUTER_API_KEY:['openrouter.ai']};
export function parseModelOptions(args:string[]){
 const {values:v}=parseArgs({args,options:{'prepared-run':{type:'string'},command:{type:'string'},receipt:{type:'string'},key:{type:'string',multiple:true},'timeout-seconds':{type:'string'},env:{type:'string',multiple:true},output:{type:'string'},help:{type:'boolean'}}});
 if(v.help)return null;
 if(!v['prepared-run']||!v.command||!v.receipt||!v.key?.length||!v.key.every(key=>Object.hasOwn(domains,key)))throw new Error('Supply --prepared-run, --command, --receipt and a supported --key');
 if(!/^\/workspace\/[a-zA-Z0-9_./-]+\.json$/.test(v.receipt)||v.receipt.split('/').includes('..'))throw new Error('Receipt must be a JSON file under /workspace');
 const env:Record<string,string>={};
 for(const item of v.env??[]){const index=item.indexOf('=');const name=item.slice(0,index);if(index<1||!/^(AGENT_MODEL|AGENT_PROVIDER|MCP_RECORD_CALLS|GOOSE_PROVIDER|GOOSE_MODEL)$/.test(name))throw new Error('Only explicit nonsecret model settings are accepted by --env');env[name]=item.slice(index+1);}
 const timeoutSeconds=Number(v['timeout-seconds']??300);if(!Number.isInteger(timeoutSeconds)||timeoutSeconds<30||timeoutSeconds>900)throw new Error('Command timeout must be 30..900 seconds');
 return {preparedRun:resolve(v['prepared-run']),command:v.command,receipt:v.receipt,key:v.key[0],keys:[...new Set(v.key)],timeoutSeconds,env,output:resolve(v.output??join('evidence','model-'+randomUUID()))};
}
export function validatePreparedRun(v:unknown){
 if(!v||typeof v!=='object')throw new Error('Invalid prepared-run journal');
 const r=v as Record<string,unknown>;
 for(const name of ['recipe','workspaceId','sandboxGroupId','retainedSnapshotId','sourceSandboxId','baselineSha256','imageSource','computePlan'])if(typeof r[name]!=='string')throw new Error(`Missing ${name}`);
 if(r.passed!==true||r.snapshotKind!=='filesystem'||r.snapshotId!==r.retainedSnapshotId)throw new Error('Require a completed, retained filesystem snapshot validation');
 if(!/^tea-[a-z0-9]+$/.test(String(r.workspaceId))||!/^sbg-[a-z0-9]+$/.test(String(r.sandboxGroupId))||!/^snp-[a-z0-9]+$/.test(String(r.retainedSnapshotId)))throw new Error('Invalid workspace, group or snapshot identity');
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(r.recipe))||!/^sha256:[a-f0-9]{64}$/.test(String(r.imageSource).split('@')[1]))throw new Error('Invalid recipe or image digest');
 return r as Record<string,unknown>&{recipe:string;workspaceId:`tea-${string}`;sandboxGroupId:string;retainedSnapshotId:string;sourceSandboxId:string;baselineSha256:string;imageSource:string;computePlan:string};
}
const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
export async function main(args:string[]){
 const options=parseModelOptions(args);if(!options){console.log('validate-model --prepared-run RUN_JSON --command TRUSTED_INSTALLED_COMMAND --receipt /workspace/RECIPE/RESULT.json --key OPENROUTER_API_KEY --env AGENT_MODEL=MODEL [--env AGENT_PROVIDER=PROVIDER] [--output NEW_DIRECTORY]');return;}
 if(!process.env.RENDER_API_KEY||!options.keys.every(key=>process.env[key]))throw new Error('Host Render key and selected model key are required');
 const prepared=validatePreparedRun(JSON.parse(await readFile(options.preparedRun,'utf8')));
 const api=new Render({ownerId:prepared.workspaceId}).sandboxes;
 const snapshot=await api.snapshots.get({sandboxGroupId:prepared.sandboxGroupId,snapshotId:prepared.retainedSnapshotId,ownerId:prepared.workspaceId},AbortSignal.timeout(30000));
 if(snapshot.id!==prepared.retainedSnapshotId||snapshot.sandboxGroupId!==prepared.sandboxGroupId||snapshot.status!=='available'||snapshot.kind!=='filesystem'||snapshot.sourceSandboxId!==prepared.sourceSandboxId)throw new Error('Snapshot is unavailable or differs from the verified source');
 await mkdir(dirname(options.output),{recursive:true});
 await mkdir(options.output,{recursive:false});
 const journal:Record<string,unknown>={schemaVersion:1,startedAt:new Date().toISOString(),recipe:prepared.recipe,imageSource:prepared.imageSource,computePlan:prepared.computePlan,clientVersion:'@renderinc/sdk@1.6.0',snapshotId:prepared.retainedSnapshotId,modelSettings:options.env,passed:false,runs:[]};
 const runs:Record<string,unknown>[]=[];journal.runs=runs;
 const persist=()=>writeFile(join(options.output,'run.json'),JSON.stringify(journal,null,2)+'\n',{mode:0o600});
 await persist();let failure:unknown;
 try {
  for(let index=0;index<2;index++){
   let id:string|undefined;const run:Record<string,unknown>={index,passed:false};runs.push(run);await persist();
   try{
    const sandbox=await api.create({ownerId:prepared.workspaceId,sandboxGroupId:prepared.sandboxGroupId,snapshotId:prepared.retainedSnapshotId,plan:prepared.computePlan,timeoutSeconds:options.timeoutSeconds+180,idleTimeoutSeconds:300,networkPolicy:{type:'allow-list',rules:[...new Set(options.keys.flatMap(key=>domains[key]))].map(domain=>({domain}))},env:{...options.env,...Object.fromEntries(options.keys.map(key=>[key,process.env[key]!]))}});
    id=sandbox.id;run.sandboxId=id;await persist();await api.waitUntilRunning(id,{timeoutMs:120000,ownerId:prepared.workspaceId});
    const baseline=await api.download(id,`/workspace/${prepared.recipe}/baseline.json`,prepared.workspaceId,AbortSignal.timeout(30000));
    if(sha(baseline.data)!==prepared.baselineSha256)throw new Error('Fresh restore differs from captured baseline');
    await checkedExec(api.exec(id,`test ! -e ${quote(options.receipt)}`,prepared.workspaceId,AbortSignal.timeout(30000)),id,'assert live receipt absent');
    await checkedExec(api.exec(id,`timeout -k 5 ${options.timeoutSeconds} bash -c ${quote(options.command)}`,prepared.workspaceId,AbortSignal.timeout((options.timeoutSeconds+30)*1000)),id,options.command);
    const result=await api.download(id,options.receipt,prepared.workspaceId,AbortSignal.timeout(30000));
    if(result.data.length>2_000_000)throw new Error('Model receipt exceeds size bound');
    const receipt=JSON.parse(result.data.toString('utf8'));
    if(receipt.passed!==true)throw new Error('Installed independent grader did not mark the model run passed');
    await writeFile(join(options.output,`receipt-${index}.json`),result.data,{mode:0o600});run.receiptSha256=sha(result.data);run.passed=true;
   }catch(error){run.error=safeError(error);throw error;}
   finally{
    if(id){try{await Promise.race([api.terminate(id,prepared.workspaceId),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Cleanup outcome unknown')),30000).unref())]);run.terminated=true;}catch(error){run.cleanupError=safeError(error);run.passed=false;throw error;}}
    await persist();
   }
  }
 }catch(error){failure=error;journal.error=safeError(error);}
 finally{journal.passed=!failure&&runs.length===2&&runs.every(r=>r.passed===true&&r.terminated===true);journal.completedAt=new Date().toISOString();await persist();}
 if(failure)throw new Error(`Model validation incomplete; inspect ${options.output}. ${safeError(failure)}`);
 console.log(`Passed two independent post-restore model runs; ${options.output}`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(safeError(error));process.exitCode=1;});
