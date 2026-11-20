import assert from 'node:assert/strict';
import test from 'node:test';
import {decodeMatrix} from '../validate-model-matrix.ts';

const entry=()=>({name:'google',args:['--command','installed-fixture','--receipt','/workspace/task/result.json','--key','OPENROUTER_API_KEY','--timeout-seconds','240']});
const recipe=()=>({recipe:'task',image:'ghcr.io/example/image@sha256:'+'a'.repeat(64),imageId:'sbb-test',models:[entry()]});
const matrix=()=>({workspace:'tea-test',group:'sbg-test',plan:'1c-2g',recipes:[recipe()]});
test('matrix rejects mutable images and duplicate output paths before creating resources',()=>{
 assert.equal(decodeMatrix(matrix()).recipes.length,1);
 for(const change of [{image:'ghcr.io/example/image:latest'},{recipe:'../task'},{imageId:'sbx-wrong'},{models:[entry(),entry()]},{models:[]}]){
  assert.throws(()=>decodeMatrix({...matrix(),recipes:[{...recipe(),...change}]}));
 }
 assert.throws(()=>decodeMatrix({...matrix(),recipes:[recipe(),recipe()]}));
});
test('matrix cannot expand approved credential scope or override evidence paths',()=>{
 const base=entry();
 for(const args of [base.args.map(s=>s==='OPENROUTER_API_KEY'?'RENDER_API_KEY':s),base.args.map(s=>s==='OPENROUTER_API_KEY'?'ANTHROPIC_API_KEY':s),[...base.args,'--output','elsewhere'],[...base.args,'--prepared-run','other.json'],[...base.args,'--env','RENDER_API_KEY=bad']]){
  assert.throws(()=>decodeMatrix({...matrix(),recipes:[{...recipe(),models:[{...base,args}]}]}));
 }
});
