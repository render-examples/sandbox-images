import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {jsonArray,jsonObject,jsonString,jsonNumber,parseJson} from '../runtime/contracts.ts';

type WorkflowRun={id:number;runNumber:number;attempt:number;headSha:string;branch:string|null;event:string;status:string;conclusion:string|null;updatedAt:number};
function positiveInteger(value:unknown):number{const n=jsonNumber(value);if(!Number.isSafeInteger(n)||n<1)throw new Error('Malformed workflow run identity');return n;}
function decodeRun(value:unknown):WorkflowRun{
 const r=jsonObject(value);
 const updatedAt=Date.parse(jsonString(r.updated_at));if(!Number.isFinite(updatedAt))throw new Error('Malformed workflow update time');
 return {id:positiveInteger(r.id),runNumber:positiveInteger(r.run_number),attempt:positiveInteger(r.run_attempt),headSha:jsonString(r.head_sha),branch:r.head_branch===null?null:jsonString(r.head_branch),event:jsonString(r.event),status:jsonString(r.status),conclusion:r.conclusion===null?null:jsonString(r.conclusion),updatedAt};
}
/** All pages are from check.yml; do not prefilter success or ignore newer attempts. */
function latestMainCheck(pages:unknown,sha:string):WorkflowRun{
 if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Require the exact full source SHA');
 const runs=jsonArray(pages).flatMap(page=>jsonArray(jsonObject(page).workflow_runs).map(decodeRun));
 const matching=runs.filter(run=>run.headSha===sha&&run.branch==='main'&&run.event==='push');
 matching.sort((a,b)=>b.updatedAt-a.updatedAt||b.runNumber-a.runNumber||b.attempt-a.attempt||b.id-a.id);
 const latest=matching[0];
 if(!latest)throw new Error(`No check.yml push run on main exists for ${sha}; publication is blocked`);
 return latest;
}
export function requireSuccessfulMainCheck(pages:unknown,sha:string):WorkflowRun{
 const latest=latestMainCheck(pages,sha);
 if(latest.status!=='completed'||latest.conclusion!=='success')throw new Error(`Latest check.yml run ${latest.id} attempt ${latest.attempt} for ${sha} is ${latest.status}/${latest.conclusion??'pending'}; publication is blocked`);
 return latest;
}
export function requireImageChecks(pages:unknown,sha:string,image:string,jobsValue:unknown):WorkflowRun{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(image))throw new Error('Invalid image slug');
 const run=latestMainCheck(pages,sha);
 if(run.status!=='completed'||!['success','failure'].includes(run.conclusion??''))throw new Error('Latest main CI attempt is incomplete; publication is blocked');
 const jobs=jsonArray(jobsValue).flatMap(page=>jsonArray(jsonObject(page).jobs)).map(jsonObject);
 for(const name of ['manifests','source-secrets','type-safety','recipe-tools',`images (${image})`]){
  const matching=jobs.filter(job=>job.name===name);
  const job=matching[0];
  if(matching.length!==1||!job||job.run_id!==run.id||job.run_attempt!==run.attempt||job.head_sha!==sha||job.status!=='completed'||job.conclusion!=='success')throw new Error(`Required check ${name} did not pass on the exact main attempt; publication is blocked`);
 }
 return run;
}
export function main(env:NodeJS.ProcessEnv=process.env):void{
 const repository=env.GITHUB_REPOSITORY,sha=env.GITHUB_SHA;
 if(env.GITHUB_REF!=='refs/heads/main'||!repository||!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)||!sha||!/^[a-f0-9]{40}$/.test(sha))throw new Error('Publication requires main, a repository identity, and its exact source SHA');
 if(!env.GH_TOKEN)throw new Error('GH_TOKEN with Actions read permission is required');
 const endpoint=`repos/${repository}/actions/workflows/check.yml/runs?head_sha=${sha}&branch=main&event=push&per_page=100`;
 const response=execFileSync('gh',['api','--paginate','--slurp','-H','Accept: application/vnd.github+json','-H','X-GitHub-Api-Version: 2026-03-10',endpoint],{encoding:'utf8',env,timeout:30_000,maxBuffer:8_000_000});
 const pages=parseJson(response);
 let run:WorkflowRun;
 if(env.IMAGE_SLUG){
  const latest=latestMainCheck(pages,sha);
  const jobs=execFileSync('gh',['api','--paginate','--slurp',`repos/${repository}/actions/runs/${latest.id}/attempts/${latest.attempt}/jobs?per_page=100`],{encoding:'utf8',env,timeout:30_000,maxBuffer:8_000_000});
  run=requireImageChecks(pages,sha,env.IMAGE_SLUG,parseJson(jobs));
 }else run=requireSuccessfulMainCheck(pages,sha);
 console.log(`Publication gate passed: check.yml push run ${run.id}, attempt ${run.attempt}, exact source ${sha}.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main();}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
}
