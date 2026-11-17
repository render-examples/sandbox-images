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
export function requireSuccessfulMainCheck(pages:unknown,sha:string):WorkflowRun{
 if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Require the exact full source SHA');
 const runs=jsonArray(pages).flatMap(page=>jsonArray(jsonObject(page).workflow_runs).map(decodeRun));
 const matching=runs.filter(run=>run.headSha===sha&&run.branch==='main'&&run.event==='push');
 matching.sort((a,b)=>b.updatedAt-a.updatedAt||b.runNumber-a.runNumber||b.attempt-a.attempt||b.id-a.id);
 const latest=matching[0];
 if(!latest)throw new Error(`No check.yml push run on main exists for ${sha}; publication is blocked`);
 if(latest.status!=='completed'||latest.conclusion!=='success')throw new Error(`Latest check.yml run ${latest.id} attempt ${latest.attempt} for ${sha} is ${latest.status}/${latest.conclusion??'pending'}; publication is blocked`);
 return latest;
}
export function main(env:NodeJS.ProcessEnv=process.env):void{
 const repository=env.GITHUB_REPOSITORY,sha=env.GITHUB_SHA;
 if(env.GITHUB_REF!=='refs/heads/main'||!repository||!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)||!sha||!/^[a-f0-9]{40}$/.test(sha))throw new Error('Publication requires main, a repository identity, and its exact source SHA');
 if(!env.GH_TOKEN)throw new Error('GH_TOKEN with Actions read permission is required');
 const endpoint=`repos/${repository}/actions/workflows/check.yml/runs?head_sha=${sha}&branch=main&event=push&per_page=100`;
 const response=execFileSync('gh',['api','--paginate','--slurp','-H','Accept: application/vnd.github+json','-H','X-GitHub-Api-Version: 2026-03-10',endpoint],{encoding:'utf8',env,timeout:30_000,maxBuffer:8_000_000});
 const run=requireSuccessfulMainCheck(parseJson(response),sha);
 console.log(`Publication gate passed: check.yml push run ${run.id}, attempt ${run.attempt}, exact source ${sha}.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main();}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
}
