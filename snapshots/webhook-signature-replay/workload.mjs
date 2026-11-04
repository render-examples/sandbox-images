import assert from 'node:assert/strict';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const key='synthetic-fixture-key-not-a-credential',now=1760000000;
const sign=(body,time)=>createHmac('sha256',key).update(`${time}.${body}`).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const expected={requests:6,accepted:2,duplicates:1,rejected:3,effects:1,totalCents:1250};
export const scenarios={'webhook-signature-replay':{expectedSummary:expected,artifacts:['decisions.json','ledger.json'],
 prepare(inputDir){
  const body=JSON.stringify({id:'event-1',amount:1250}),valid={body,time:now,signature:sign(body,now)};
  const conflict=JSON.stringify({id:'event-1',amount:999});
  write(join(inputDir,'requests.json'),[valid,valid,{...valid,signature:'00'.repeat(32)},{...valid,time:now-301,signature:sign(body,now-301)},{body:conflict,time:now,signature:sign(conflict,now)},{body:JSON.stringify({id:'event-2',amount:0}),time:now,signature:sign(JSON.stringify({id:'event-2',amount:0}),now)}]);
 },
 run({inputDir,outputDir}){
  const ledger=new Map(),decisions=[];
  for(const request of read(join(inputDir,'requests.json'))){
   let decision='rejected';
   const valid=/^[a-f0-9]{64}$/.test(request.signature)&&Math.abs(now-request.time)<=300&&timingSafeEqual(Buffer.from(request.signature,'hex'),Buffer.from(sign(request.body,request.time),'hex'));
   if(valid){const e=JSON.parse(request.body);assert.ok(Number.isSafeInteger(e.amount)&&e.amount>=0);if(ledger.has(e.id))decision=ledger.get(e.id)===e.amount?'duplicate':'rejected';else {ledger.set(e.id,e.amount);decision='accepted';}}
   decisions.push(decision);
  }
  const entries=[...ledger].map(([id,amount])=>({id,amount}));write(join(outputDir,'decisions.json'),decisions);write(join(outputDir,'ledger.json'),entries);
  return {requests:decisions.length,accepted:decisions.filter(x=>x==='accepted').length,duplicates:decisions.filter(x=>x==='duplicate').length,rejected:decisions.filter(x=>x==='rejected').length,effects:entries.filter(x=>x.amount>0).length,totalCents:entries.reduce((n,x)=>n+x.amount,0)};
 },
 verify({outputDir}){
  const d=read(join(outputDir,'decisions.json')),l=read(join(outputDir,'ledger.json'));assert.deepEqual(d,['accepted','duplicate','rejected','rejected','rejected','accepted']);assert.deepEqual(l,[{id:'event-1',amount:1250},{id:'event-2',amount:0}]);
  return {requests:d.length,accepted:d.filter(x=>x==='accepted').length,duplicates:d.filter(x=>x==='duplicate').length,rejected:d.filter(x=>x==='rejected').length,effects:l.filter(x=>x.amount>0).length,totalCents:l.reduce((n,x)=>n+x.amount,0)};
 }}};
