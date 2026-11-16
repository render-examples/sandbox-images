import {isRecord,invoiceFrom} from './invoice.ts';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(process.argv[2]??'.'), provider=process.env.AGENT_PROVIDER,model=process.env.AGENT_MODEL;
assert.ok(provider&&model,'Set AGENT_PROVIDER and AGENT_MODEL explicitly');
const recipe:unknown=JSON.parse(await readFile(join(root,'recipe.json'),'utf8'));
assert.ok(isRecord(recipe)&&typeof recipe.imageSlug==='string'&&typeof recipe.scenario==='string');
assert.equal(recipe.imageSlug,'goose');
const isMcp=recipe.scenario==='goose-mcp-workspace';
assert.ok(isMcp||recipe.scenario==='goose-repo-repair');
const directory=join(root,'live-results');await mkdir(directory,{recursive:true});
const environment={...process.env,GOOSE_PROVIDER:provider,GOOSE_MODEL:model,...(process.env.GEMINI_API_KEY?{GOOGLE_API_KEY:process.env.GEMINI_API_KEY}:{}),...(isMcp?{MCP_RECORD_CALLS:'1'}:{})};
const prefix=provider+'-'+model.replaceAll(/[^a-zA-Z0-9-]/g,'-');
const receipt:Record<string,unknown>={schemaVersion:1,provider,requestedModel:model,scenario:recipe.scenario,agentInvoked:false,passed:false};
try{
 const result=spawnSync('node',['run-agent.ts','--provider',provider,'--model',model],{cwd:root,env:environment,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});
 receipt.agentInvoked=Boolean(result.pid);receipt.agentExit=result.status;
 await writeFile(join(directory,prefix+'.jsonl'),result.stdout??'',{flag:'wx',mode:0o600});
 assert.equal(result.status,0,'Goose run failed');
 const grade=spawnSync('bash',['grade-project.sh'],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});receipt.gradeExit=grade.status;assert.equal(grade.status,0,'Independent code grading failed');
 if(isMcp){
  const raw:unknown=JSON.parse(await readFile(join(root,'input/invoice.json'),'utf8'));const input=invoiceFrom(raw);
  const expected={id:input.id,currency:input.currency,totalCents:input.lines.reduce((sum,line)=>sum+line.quantity*line.unitCents,0)};
  const calls=(await readFile(join(root,'project/mcp-calls.jsonl'),'utf8')).trim().split('\n').map((line):unknown=>JSON.parse(line));
  assert.ok(calls.length>0,'No actual MCP tool call recorded');for(const call of calls)assert.deepEqual(call,expected);
  assert.deepEqual(JSON.parse(await readFile(join(root,'project/invoice-answer.json'),'utf8')),expected);
  receipt.mcpCalls=calls.length;receipt.invoice=expected;
 }
 receipt.passed=true;
}finally{
 receipt.completedAt=new Date().toISOString();await writeFile(join(directory,prefix+'.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(receipt));
}
