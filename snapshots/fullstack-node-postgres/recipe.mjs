import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const root='/workspace/fullstack-node-postgres';
const repo=join(root,'project');
const fixture='/opt/render/fixtures/fullstack-node-postgres';
const output='/workspace/output';
const require=createRequire(join(fixture,'package.json'));
const {Client}=require('pg');
const inputs=['package.json','package-lock.json','tsconfig.json','src/app.ts','workload.mjs','seed.sql'];
const outputs=['summary.json','api-results.json','migrations.json','change.patch'];
const expected={baselineTests:3,testsPassed:8,orders:3,totalCents:5000,paidCents:750,migrationSteps:3,dataPreserved:true,changedFiles:1};
const sha=data=>createHash('sha256').update(data).digest('hex');
const read=path=>readFileSync(path,'utf8');
const json=path=>JSON.parse(read(path));
const write=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n');
const original=()=>read(join(fixture,'src/app.ts'));
const revised=()=>original().replace('export const summaryEnabled = false;','export const summaryEnabled = true;');
function patch(){const n=original().split('\n').findIndex(s=>s==='export const summaryEnabled = false;')+1;assert.ok(n>0);return `--- a/src/app.ts\n+++ b/src/app.ts\n@@ -${n} +${n} @@\n-export const summaryEnabled = false;\n+export const summaryEnabled = true;\n`;}
function run(cmd,args){return execFileSync(cmd,args,{cwd:repo,encoding:'utf8',timeout:60000});}
async function database(fn){const c=new Client({connectionTimeoutMillis:5000,query_timeout:5000,statement_timeout:5000});await c.connect();try{return await fn(c);}finally{await c.end();}}
const seed=[{id:1,total_cents:2500},{id:2,total_cents:750},{id:3,total_cents:1750}];
async function checkDatabase(){await database(async c=>{
 assert.deepEqual((await c.query('SELECT id,total_cents FROM orders ORDER BY id')).rows,seed,'Prepared data changed');
 assert.deepEqual((await c.query("SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' ORDER BY ordinal_position")).rows,[{column_name:'id',data_type:'integer',is_nullable:'NO'},{column_name:'total_cents',data_type:'integer',is_nullable:'NO'}],'Prepared columns changed');
 assert.deepEqual((await c.query("SELECT conname,contype,pg_get_constraintdef(oid) AS definition,convalidated FROM pg_constraint WHERE conrelid='public.orders'::regclass AND contype <> 'n' ORDER BY conname")).rows,[{conname:'orders_pkey',contype:'p',definition:'PRIMARY KEY (id)',convalidated:true},{conname:'orders_total_cents_check',contype:'c',definition:'CHECK ((total_cents >= 0))',convalidated:true}],'Prepared constraints changed');
 assert.equal((await c.query('SHOW listen_addresses')).rows[0].listen_addresses,'','Postgres must not listen on TCP');
});}
function checkBaseline(){
 const b=json(join(root,'baseline.json'));
 assert.deepEqual(b,{fixture:'fullstack-node-postgres-v1',inputSha256:Object.fromEntries(inputs.map(n=>[n,sha(readFileSync(join(fixture,n)))])),expectedSummary:expected});
 for(const n of inputs.filter(n=>n!=='src/app.ts'))assert.equal(sha(readFileSync(join(repo,n))),b.inputSha256[n],`Prepared input changed: ${n}`);
 return b;
}
async function prepare(){
 assert.equal(existsSync(repo),false,'Refusing to overwrite prepared project');cpSync(fixture,repo,{recursive:true});
 await database(c=>c.query(read(join(repo,'seed.sql'))));
 run('npm',['run','build']);
 const result=JSON.parse(run('node',['workload.mjs','baseline']));assert.equal(result.testsPassed,3);
 await checkDatabase();rmSync(join(repo,'dist'),{recursive:true,force:true});
 write(join(root,'baseline.json'),{fixture:'fullstack-node-postgres-v1',inputSha256:Object.fromEntries(inputs.map(n=>[n,sha(readFileSync(join(fixture,n)))])),expectedSummary:expected});
}
async function analyze(){
 rmSync(join(output,'verification.json'),{force:true});
 checkBaseline();await checkDatabase();
 const current=read(join(repo,'src/app.ts'));assert.ok(current===original()||current===revised(),'Unexpected source edit');
 writeFileSync(join(repo,'src/app.ts'),revised());rmSync(join(repo,'dist'),{recursive:true,force:true});
 run('npm',['run','build']);const result=JSON.parse(run('node',['workload.mjs','final']));
 assert.equal(result.testsPassed,8);assert.deepEqual(result.migrations,['upgrade committed','failed transaction rolled back','downgrade committed']);await checkDatabase();
 mkdirSync(output,{recursive:true});
 write(join(output,'api-results.json'),result);write(join(output,'migrations.json'),{steps:result.migrations,dataPreserved:true,rows:seed});
 write(join(output,'summary.json'),expected);writeFileSync(join(output,'change.patch'),patch());
 await verify(false);
}
async function verify(checkReceipt=true){
 const receiptPath=join(output,'verification.json');
 const previous=checkReceipt && existsSync(receiptPath)?readFileSync(receiptPath):undefined;
 rmSync(receiptPath,{force:true});
 checkBaseline();await checkDatabase();assert.equal(read(join(repo,'src/app.ts')),revised());
 assert.deepEqual(json(join(output,'summary.json')),expected);
 const api=json(join(output,'api-results.json'));
 assert.deepEqual(api,{mode:'final',checks:[
  'GET /orders returns seeded rows','unknown route returns 404','new summary endpoint uses migrated schema','upgrade preserves order values',
  'constraint failure rolls back preceding changes','downgrade removes added schema and preserves rows','database errors return bounded generic response','original endpoint works after downgrade'
 ],testsPassed:8,rows:3,totalCents:5000,migrations:['upgrade committed','failed transaction rolled back','downgrade committed']});
 assert.deepEqual(json(join(output,'migrations.json')),{steps:api.migrations,dataPreserved:true,rows:seed});assert.equal(read(join(output,'change.patch')),patch());
 const receipt={passed:true,summary:expected,outputSha256:Object.fromEntries(outputs.map(n=>[n,sha(readFileSync(join(output,n)))]))};
 if(checkReceipt){assert.ok(previous,'Missing verification receipt');assert.deepEqual(JSON.parse(previous.toString('utf8')),receipt);}
 write(receiptPath,receipt);
}
async function test(){
 await verify();
 for(const f of [join(root,'baseline.json'),join(output,'summary.json'),join(output,'change.patch'),join(repo,'src/app.ts'),join(repo,'seed.sql')]){
  const old=readFileSync(f);try{writeFileSync(f,'{}\n');await assert.rejects(()=>verify(),`Corrupt file accepted: ${f}`);assert.equal(existsSync(join(output,'verification.json')),false,'Stale success receipt after verify failure');}finally{writeFileSync(f,old);}
  await verify(false);await verify();
 }
 await database(c=>c.query('UPDATE orders SET total_cents=0 WHERE id=1'));
 try{await assert.rejects(()=>analyze(),'Corrupt database accepted');assert.equal(existsSync(join(output,'verification.json')),false,'Stale success receipt after analyze failure');}finally{await database(c=>c.query('UPDATE orders SET total_cents=2500 WHERE id=1'));}
 await verify(false);await verify();
 await database(c=>c.query('ALTER TABLE orders DROP CONSTRAINT orders_total_cents_check'));
 try{await assert.rejects(()=>analyze(),'Corrupt constraints accepted');assert.equal(existsSync(join(output,'verification.json')),false,'Stale receipt after schema corruption');}
 finally{await database(c=>c.query('ALTER TABLE orders ADD CONSTRAINT orders_total_cents_check CHECK(total_cents >= 0)'));}
 await verify(false);await verify();for(const n of [...outputs,'verification.json'])rmSync(join(output,n));await analyze();await verify();
 console.log('Five file corruption checks, database value/schema corruption rejection and complete output regeneration passed');
}
const action=process.argv[2];
if(action==='prepare')await prepare();else if(action==='analyze')await analyze();else if(action==='verify')await verify();else if(action==='test')await test();else throw new Error('Expected prepare, analyze, verify or test');
if(action!=='test')console.log(`fullstack-node-postgres ${action}: passed`);
