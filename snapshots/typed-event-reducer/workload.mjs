import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const expected={events:7,uniqueEvents:6,duplicates:1,completed:1,failed:1,textChunks:2};
const source=`export type Event = {id:string; run:string; kind:'start'|'text'|'done'|'fail'; text?:string};
export function reduce(events:Event[]) {
 const seen = new Map<string,string>(); const runs = new Map<string,{state:string,text:string}>(); let duplicates=0, textChunks=0;
 for(const e of events) {
  if(!e || typeof e!=='object' || typeof e.id!=='string' || !e.id.trim() || typeof e.run!=='string' || !e.run.trim() || !['start','text','done','fail'].includes(e.kind)) throw new Error('Invalid event');
  const encoded=JSON.stringify(e); if(seen.has(e.id)){if(seen.get(e.id)!==encoded)throw new Error('Conflicting replay');duplicates++;continue;}
  seen.set(e.id,encoded); const previous=runs.get(e.run);
  if(e.kind==='start'){if(previous)throw new Error('Duplicate start');runs.set(e.run,{state:'running',text:''});}
  else {if(!previous||previous.state!=='running')throw new Error('Invalid transition');
   if(e.kind==='text'){if(typeof e.text!=='string')throw new Error('Missing text');previous.text+=e.text;textChunks++;}
   else previous.state=e.kind==='done'?'completed':'failed';}
 }
 return {runs:Object.fromEntries(runs),uniqueEvents:seen.size,duplicates,textChunks};
}
`;
function rejectMalformedEvents(reduce){
 const start={id:'first',run:'probe',kind:'start'};
 assert.throws(()=>reduce([start,{id:'unknown',run:'probe',kind:'unexpected'}]),/Invalid event/);
 assert.throws(()=>reduce([{run:'probe',kind:'start'}]),/Invalid event/);
 assert.throws(()=>reduce([{id:'missing-run',kind:'start'}]),/Invalid event/);
 assert.throws(()=>reduce([null]),/Invalid event/);
}
const events=[{id:'a1',run:'a',kind:'start'},{id:'a2',run:'a',kind:'text',text:'Hello'},{id:'a3',run:'a',kind:'text',text:' world'},{id:'a4',run:'a',kind:'done'},{id:'a4',run:'a',kind:'done'},{id:'b1',run:'b',kind:'start'},{id:'b2',run:'b',kind:'fail'}];
export const scenarios={'typed-event-reducer':{expectedSummary:expected,artifacts:['events.json','trace.json','compiled.js'],
 prepare(inputDir){write(join(inputDir,'events.json'),events);writeFileSync(join(inputDir,'reducer.ts'),source);},
 async run({inputDir,workDir,outputDir}){
  execFileSync('tsc',[join(inputDir,'reducer.ts'),'--outDir',workDir,'--module','ESNext','--target','ES2022','--strict','--skipLibCheck'],{timeout:30000});
  const {reduce}=await import(pathToFileURL(join(workDir,'reducer.js')).href+'?run='+Date.now());
  rejectMalformedEvents(reduce);
  const input=read(join(inputDir,'events.json')),result=reduce(input);
  assert.throws(()=>reduce([...input,{...input[0],kind:'fail'}]),/Conflicting replay/);
  assert.throws(()=>reduce([{id:'x',run:'x',kind:'done'}]),/Invalid transition/);
  write(join(outputDir,'events.json'),input);write(join(outputDir,'trace.json'),result);writeFileSync(join(outputDir,'compiled.js'),readFileSync(join(workDir,'reducer.js')));
  return {events:input.length,uniqueEvents:result.uniqueEvents,duplicates:result.duplicates,completed:Object.values(result.runs).filter(r=>r.state==='completed').length,failed:Object.values(result.runs).filter(r=>r.state==='failed').length,textChunks:result.textChunks};
 },
 async verify({inputDir,outputDir}){
  assert.deepEqual(read(join(outputDir,'events.json')),read(join(inputDir,'events.json')));
  const r=read(join(outputDir,'trace.json'));assert.deepEqual(r,{runs:{a:{state:'completed',text:'Hello world'},b:{state:'failed',text:''}},uniqueEvents:6,duplicates:1,textChunks:2});
  const {reduce}=await import(pathToFileURL(join(outputDir,'compiled.js')).href+'?verify='+Date.now());assert.deepEqual(reduce(events),r);rejectMalformedEvents(reduce);
  return {events:events.length,uniqueEvents:r.uniqueEvents,duplicates:r.duplicates,completed:1,failed:1,textChunks:r.textChunks};
 }}};
