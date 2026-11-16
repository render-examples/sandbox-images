import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(process.argv[2]??'.'),model=process.env.AGENT_MODEL;
assert.ok(model,'Set explicit AGENT_MODEL (provider/model)');
const recipe=JSON.parse(await readFile(join(root,'recipe.json'),'utf8')) as {imageSlug:string;scenario:string};
assert.equal(recipe.imageSlug,'opencode');
const directory=join(root,'live-results');await mkdir(directory,{recursive:true});
const prefix=model.replaceAll(/[^a-zA-Z0-9-]/g,'-');
const executed=spawnSync('node',['run-agent.mjs','--model',model],{cwd:root,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});
// Raw agent transcripts stay local; the durable receipt has no environment values.
await writeFile(join(directory,prefix+'.jsonl'),executed.stdout??'',{flag:'wx',mode:0o600});
const grade=executed.status===0?spawnSync('bash',['grade-project.sh'],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}):null;
const receipt={schemaVersion:1,requestedModel:model,scenario:recipe.scenario,agentInvoked:true,agentExit:executed.status,gradeExit:grade?.status??null,passed:executed.status===0&&grade?.status===0,verifiedAt:new Date().toISOString()};
await writeFile(join(directory,prefix+'.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(receipt));
assert.ok(receipt.passed,'Agent execution or independent candidate grading failed');
