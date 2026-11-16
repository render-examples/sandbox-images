import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {prepare,reference,grade,write} from './dist/task.js';
import {offlineCheck} from './dist/agent.js';
const make=(repair)=>({
 expectedSummary:{agentInvoked:false,frameworkLoaded:true,...(repair?{casesPassed:707}:{totalCents:3250})},
 artifacts:[repair?'pricing.py':'answer.json','framework.json'],
 prepare:(dir)=>prepare(dir,repair),
 async run(ctx){const framework=await offlineCheck();const p=reference(ctx,repair);const name=repair?'pricing.py':'answer.json';writeFileSync(join(ctx.outputDir,name),readFileSync(join(p,name)));write(join(ctx.outputDir,'framework.json'),framework);return {agentInvoked:false,frameworkLoaded:true,...grade(p,repair)};},
 async verify(ctx){const p=await mkdtemp(join(tmpdir(),'framework-grade-'));try{const name=repair?'pricing.py':'answer.json';writeFileSync(join(p,name),readFileSync(join(ctx.outputDir,name)));const result=grade(p,repair);assert.deepEqual(JSON.parse(readFileSync(join(ctx.outputDir,'framework.json'),'utf8')),{framework:'LangChain Deep Agents',modelInvoked:false});return {agentInvoked:false,frameworkLoaded:true,...result};}finally{rmSync(p,{recursive:true,force:true});}}
});
export const scenarios={'langchain-repo-repair':make(true),'langchain-data-analysis':make(false)};
