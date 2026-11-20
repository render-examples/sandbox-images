/** Run an explicit synthetic model matrix against already imported immutable images. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';
import {Render} from '@renderinc/sdk';
import {jsonArray,jsonObject,jsonString,parseJson} from '../runtime/contracts.ts';
import {main as prepare} from './validate-recipe.ts';
import {main as model,parseModelOptions,validatePreparedRun,validateSnapshot} from './validate-model.ts';
import {safeError} from './live-support.ts';

export function decodeMatrix(value:unknown){
 const input=jsonObject(value),workspace=jsonString(input.workspace),group=jsonString(input.group),plan=jsonString(input.plan);
 if(!/^tea-[a-z0-9]+$/.test(workspace)||!/^sbg-[a-z0-9]+$/.test(group)||!/^\dc-\d+g$/.test(plan))throw Error('Invalid workspace, group or compute plan');
 const recipes=jsonArray(input.recipes).map(value=>{
  const row=jsonObject(value),recipe=jsonString(row.recipe),image=jsonString(row.image),imageId=jsonString(row.imageId);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe)||!/^sbb-[a-z0-9]+$/.test(imageId)||!/^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(image))throw Error('Invalid recipe or pinned import');
  const models=jsonArray(row.models).map(value=>{
   const item=jsonObject(value),name=jsonString(item.name),args=jsonArray(item.args).map(jsonString);
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)||args.some(arg=>['--prepared-run','--output','--help'].includes(arg)))throw Error('Invalid model name or reserved argument');
   const checked=parseModelOptions(['--prepared-run','run.json',...args]);
   if(!checked||checked.keys.some(key=>!['OPENROUTER_API_KEY','GEMINI_API_KEY'].includes(key)))throw Error('Matrix supports only the approved OpenRouter and Google keys');
   return {name,args,keys:checked.keys};
  });
  if(!models.length||new Set(models.map(m=>m.name)).size!==models.length)throw Error('Require unique model names');
  return {recipe,image,imageId,models};
 });
 if(!recipes.length||new Set(recipes.map(r=>r.recipe)).size!==recipes.length)throw Error('Require unique recipes');
 return {workspace:workspace as `tea-${string}`,group,plan,recipes};
}

export async function main(args:string[]){
 const {values}=parseArgs({args,options:{matrix:{type:'string'},output:{type:'string'},execute:{type:'boolean'}}});
 if(!values.matrix||!values.output)throw Error('Supply --matrix JSON --output NEW_DIRECTORY [--execute]');
 const matrix=decodeMatrix(parseJson(await readFile(values.matrix,'utf8'))),output=resolve(values.output);
 if(!values.execute){console.log(JSON.stringify({recipeCount:matrix.recipes.length,modelRuns:matrix.recipes.reduce((n,r)=>n+r.models.length*2,0),...matrix},null,2));return;}
 for(const key of ['RENDER_API_KEY',...matrix.recipes.flatMap(r=>r.models.flatMap(m=>m.keys))])if(!process.env[key])throw Error(`Missing ${key}`);
 const api=new Render({ownerId:matrix.workspace}).sandboxes;
 const group=await api.getGroup(matrix.group);
 if(group.id!==matrix.group||group.ownerId!==matrix.workspace)throw Error('Group ownership mismatch');
 await mkdir(output,{recursive:false,mode:0o700});
 const results:Record<string,unknown>[]=[];
 const save=()=>writeFile(join(output,'matrix.json'),JSON.stringify({startedAt,workspace:matrix.workspace,group:matrix.group,plan:matrix.plan,results},null,2)+'\n',{mode:0o600});
 const startedAt=new Date().toISOString();await save();
 async function terminal(id:string){
  const deadline=Date.now()+60_000;
  while(Date.now()<deadline){const state=await api.get(id,matrix.workspace,AbortSignal.timeout(10000));if(state.id!==id||state.sandboxGroupId!==matrix.group)throw Error('Cleanup identity mismatch');if(state.status==='terminated')return;await pause(1000);}
  throw Error(`Unconfirmed termination: ${id}`);
 }
 for(const spec of matrix.recipes){
  const directory=join(output,spec.recipe),preparedPath=join(directory,'prepared/run.json');await mkdir(directory);
  const runs:Record<string,unknown>[]=[];
  const row:Record<string,unknown>={recipe:spec.recipe,image:spec.image,imageId:spec.imageId,models:runs,passed:false};results.push(row);await save();
  let uncertain=false;
  try{
   await prepare(['--recipe',spec.recipe,'--workspace',matrix.workspace,'--group',matrix.group,'--plan',matrix.plan,'--image',spec.image,'--image-id',spec.imageId,'--keep-snapshot','--output',join(directory,'prepared')]);
   const prepared=validatePreparedRun(parseJson(await readFile(preparedPath,'utf8')));
   const raw=jsonObject(parseJson(await readFile(preparedPath,'utf8')));
   await terminal(prepared.sourceSandboxId);await terminal(jsonString(raw.restoredSandboxId));row.preparationTerminated=true;row.snapshotId=prepared.retainedSnapshotId;await save();
   for(const entry of spec.models){
    const target=join(directory,entry.name),run:Record<string,unknown>={name:entry.name,passed:false};runs.push(run);await save();
    try{await model(['--prepared-run',preparedPath,...entry.args,'--output',target]);}
    catch(error){run.error=safeError(error);}
    try{
     const receipt=jsonObject(parseJson(await readFile(join(target,'run.json'),'utf8'))),restores=jsonArray(receipt.runs).map(jsonObject);
     uncertain=restores.some(r=>r.createState==='pending'||r.createOutcomeUnknown===true||(r.sandboxId&&r.terminated!==true));
     run.passed=receipt.passed===true&&restores.length===2&&restores.every(r=>r.passed===true&&r.terminated===true);run.journal=join(spec.recipe,entry.name,'run.json');
    }catch(error){uncertain=true;run.journalError=safeError(error);}
    await save();if(uncertain)throw Error('Uncertain model resource; stopping before further mutations');
   }
   const request={sandboxGroupId:matrix.group,snapshotId:prepared.retainedSnapshotId,ownerId:matrix.workspace};
   validateSnapshot(await api.snapshots.get(request,AbortSignal.timeout(10000)),prepared);
   row.snapshotDeleteRequestedAt=new Date().toISOString();await save();
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{await Promise.race([api.snapshots.delete(request),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Snapshot deletion acknowledgement unknown')),30000);})]);}
   catch(error){row.snapshotDeleteError=safeError(error);}finally{if(timer)clearTimeout(timer);}
   const deadline=Date.now()+60000;let deleted=false;
   while(Date.now()<deadline){
    try{await api.snapshots.get(request,AbortSignal.timeout(5000));}
    catch(error){if(error&&typeof error==='object'&&'statusCode' in error&&error.statusCode===404){deleted=true;break;}throw error;}
    await pause(1000);
   }
   row.snapshotDeleted=deleted;if(!deleted)throw Error('Snapshot deletion unconfirmed');
   row.passed=runs.every(r=>r.passed===true);
  }catch(error){row.error=safeError(error);row.needsReconciliation=true;await save();throw error;}
  finally{row.completedAt=new Date().toISOString();await save();}
  console.log(JSON.stringify({recipe:spec.recipe,passed:row.passed,modelCases:runs.length,snapshotDeleted:row.snapshotDeleted}));
 }
 if(results.some(row=>row.passed!==true))process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(safeError(error));process.exitCode=1;});
