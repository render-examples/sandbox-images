import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {scenarios} from './workload.ts';
for(const [name,s] of Object.entries(scenarios))test(name,async()=>{const root=mkdtempSync(join(tmpdir(),'framework-'));const ctx={inputDir:join(root,'input'),workDir:join(root,'work'),outputDir:join(root,'output')};try{for(const p of Object.values(ctx))mkdirSync(p);await s.prepare(ctx.inputDir);assert.deepEqual(await s.run(ctx),s.expectedSummary);assert.deepEqual(await s.verify(ctx),s.expectedSummary);writeFileSync(join(ctx.outputDir,s.artifacts[0]!),'broken');await assert.rejects(async()=>s.verify(ctx));}finally{rmSync(root,{recursive:true,force:true});}});
