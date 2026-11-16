import type {Scenario, ScenarioMap, RecipeContext} from "/opt/render/runtime/contracts.ts";
import assert from 'node:assert/strict';
import {z} from 'zod';
import {execFileSync} from 'node:child_process';
import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const worker=join(dirname(fileURLToPath(import.meta.url)),'worker.ts');
const write=(path:string,value:unknown)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n');
const read=(path:string):unknown=>JSON.parse(readFileSync(path,'utf8'));
const execute=(action:string,scenario:string,path:string):unknown=>JSON.parse(execFileSync(process.execPath,[worker,action,scenario,path],{encoding:'utf8',timeout:30000}));
function scenario(slug:string,expectedSummary:object,artifact:string,verify:Scenario<object>["verify"]):Scenario<object>{
 return {expectedSummary,artifacts:[artifact],
  prepare(inputDir){
   write(join(inputDir,'fixture.json'),{scenario:slug,description:'Scripted graph state, no language model or provider calls.'});
   assert.deepEqual(execute('prepare',slug,inputDir),{prepared:true});
  },
  run(context){
   copyFileSync(join(context.inputDir,'checkpoint.sqlite'),join(context.workDir,'checkpoint.sqlite'));
   write(join(context.outputDir,artifact),execute('resume',slug,context.workDir));
   return verify(context);
  },verify};
}
function verifyCheckpoint({outputDir}:RecipeContext){
 const state=z.object({value:z.number(),completed:z.array(z.string())});
 const actual=z.object({before:state,after:state,persisted:state,next:z.array(z.string())}).parse(read(join(outputDir,'workflow.json')));
 assert.deepEqual(actual,{before:{value:42,completed:['extract','compute']},after:{value:42,completed:['extract','compute','finalize']},persisted:{value:42,completed:['extract','compute','finalize']},next:[]});
 assert.equal(new Set(actual.after.completed).size,3);
 assert.equal(actual.after.value,(5+2)*6);
 return {completedSteps:3,total:42,resumedFromCheckpoint:true};
}
function verifyApproval({outputDir}:RecipeContext){
 const actual=read(join(outputDir,'approvals.json'));
 assert.deepEqual(actual,{approved:{action:'approve-local-report',status:'approved'},denied:{action:'deny-local-report',status:'rejected'},actions:[{action:'approve-local-report'}],invalidDecisionRejected:true,pendingAfter:[]});
 return {approvedActions:1,rejectedActions:1,invalidDecisionRejected:true};
}
export const scenarios: ScenarioMap={
 'agent-checkpoint-workflow':scenario('agent-checkpoint-workflow',{completedSteps:3,total:42,resumedFromCheckpoint:true},'workflow.json',verifyCheckpoint),
 'human-approval-workflow':scenario('human-approval-workflow',{approvedActions:1,rejectedActions:1,invalidDecisionRejected:true},'approvals.json',verifyApproval),
};
