import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const {Client}=createRequire('/opt/render/fixtures/fullstack-node-postgres/package.json')('pg');
const expected={orders:2,deliveredEvents:2,totalCents:1750,duplicateEffects:0,rolledBackTransactions:1,distinctClaims:true};
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const connect=async()=>{const c=new Client({connectionTimeoutMillis:5000,query_timeout:5000,statement_timeout:5000});await c.connect();return c;};
async function using(fn){const c=await connect();try{return await fn(c);}finally{await c.end();}}
async function checkDatabase(c,orders){
 const expectedOrders=orders.map(row=>({id:row.id,total_cents:row.total})).sort((a,b)=>a.id.localeCompare(b.id));
 const expectedOutbox=expectedOrders.map(row=>({id:'event-'+row.id,order_id:row.id,delivered:true}));
 const expectedEffects=expectedOrders.map(row=>({id:'event-'+row.id,total_cents:row.total_cents}));
 assert.deepEqual((await c.query('SELECT id,total_cents FROM orders ORDER BY id')).rows,expectedOrders,'Persisted order values differ from prepared input');
 assert.deepEqual((await c.query('SELECT id,order_id,delivered FROM outbox ORDER BY id')).rows,expectedOutbox,'Persisted outbox relations differ from prepared input');
 assert.deepEqual((await c.query('SELECT id,total_cents FROM effects ORDER BY id')).rows,expectedEffects,'Persisted effects differ from prepared input');
 assert.equal((await c.query('SHOW listen_addresses')).rows[0].listen_addresses,'');
 return {orders:expectedOrders.length,deliveredEvents:expectedOutbox.length,totalCents:expectedEffects.reduce((n,row)=>n+row.total_cents,0)};
}
async function rejectDatabaseCorruption(c,orders){
 const [first,second]=orders;
 await checkDatabase(c,orders);
 try{
  await c.query('UPDATE orders SET total_cents=total_cents+1 WHERE id=$1',[first.id]);
  await assert.rejects(()=>checkDatabase(c,orders),/Persisted order values/);
 }finally{await c.query('UPDATE orders SET total_cents=$2 WHERE id=$1',[first.id,first.total]);}
 try{
  await c.query('UPDATE outbox SET order_id=$2 WHERE id=$1',['event-'+first.id,second.id]);
  await assert.rejects(()=>checkDatabase(c,orders),/Persisted outbox relations/);
 }finally{await c.query('UPDATE outbox SET order_id=$2 WHERE id=$1',['event-'+first.id,first.id]);}
 await checkDatabase(c,orders);
}
const ddl=`CREATE TABLE orders(id text PRIMARY KEY,total_cents integer NOT NULL CHECK(total_cents>=0));
CREATE TABLE outbox(id text PRIMARY KEY,order_id text NOT NULL REFERENCES orders(id),delivered boolean NOT NULL DEFAULT false);
CREATE TABLE effects(id text PRIMARY KEY REFERENCES outbox(id),total_cents integer NOT NULL);`;
export const scenarios={'postgres-outbox':{expectedSummary:expected,artifacts:['outbox-results.json','delivery-ledger.json'],
 async prepare(inputDir){write(join(inputDir,'orders.json'),[{id:'a',total:1250},{id:'b',total:500}]);await using(c=>c.query(ddl));},
 async run({inputDir,outputDir}){
  const orders=read(join(inputDir,'orders.json'));
  let rolledBack=0;await using(async c=>{
   await c.query('TRUNCATE effects,outbox,orders');
   for(const row of orders){await c.query('BEGIN');try{await c.query('INSERT INTO orders VALUES ($1,$2)',[row.id,row.total]);await c.query('INSERT INTO outbox(id,order_id) VALUES ($1,$2)',['event-'+row.id,row.id]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}}
   await c.query('BEGIN');try{await c.query("INSERT INTO orders VALUES ('transient',1)");await c.query("INSERT INTO orders VALUES ('invalid',-1)");assert.fail('Constraint should reject');}catch(e){await c.query('ROLLBACK');assert.equal(e.code,'23514');rolledBack++;}
   assert.equal((await c.query("SELECT count(*)::int AS n FROM orders WHERE id IN ('transient','invalid')")).rows[0].n,0);
  });
  const a=await connect(),b=await connect();let claims=[];
  try{
   await a.query('BEGIN');await b.query('BEGIN');
   for(const c of [a,b]){const row=(await c.query('SELECT id,order_id FROM outbox WHERE NOT delivered ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1')).rows[0];assert.ok(row);claims.push(row.id);await c.query('INSERT INTO effects SELECT $1,total_cents FROM orders WHERE id=$2 ON CONFLICT DO NOTHING',[row.id,row.order_id]);await c.query('UPDATE outbox SET delivered=true WHERE id=$1',[row.id]);}
   assert.notEqual(claims[0],claims[1]);await a.query('COMMIT');await b.query('COMMIT');
  }finally{await a.query('ROLLBACK').catch(()=>{});await b.query('ROLLBACK').catch(()=>{});await a.end();await b.end();}
  const ledger=await using(async c=>{const before=(await c.query('SELECT count(*)::int AS n FROM effects')).rows[0].n;await c.query('INSERT INTO effects SELECT o.id,r.total_cents FROM outbox o JOIN orders r ON r.id=o.order_id ON CONFLICT DO NOTHING');const rows=(await c.query('SELECT id,total_cents FROM effects ORDER BY id')).rows;assert.equal(rows.length,before);return rows;});
  await using(c=>rejectDatabaseCorruption(c,orders));
  const result={claims,rolledBackTransactions:rolledBack,duplicateEffects:0};write(join(outputDir,'outbox-results.json'),result);write(join(outputDir,'delivery-ledger.json'),ledger);
  return {orders:2,deliveredEvents:ledger.length,totalCents:ledger.reduce((n,x)=>n+x.total_cents,0),duplicateEffects:0,rolledBackTransactions:rolledBack,distinctClaims:new Set(claims).size===2};
 },
 async verify({inputDir,outputDir}){
  const result=read(join(outputDir,'outbox-results.json')),ledger=read(join(outputDir,'delivery-ledger.json'));
  assert.deepEqual(result,{claims:['event-a','event-b'],rolledBackTransactions:1,duplicateEffects:0});assert.deepEqual(ledger,[{id:'event-a',total_cents:1250},{id:'event-b',total_cents:500}]);
  return using(async c=>{const database=await checkDatabase(c,read(join(inputDir,'orders.json')));return {...database,duplicateEffects:result.duplicateEffects,rolledBackTransactions:result.rolledBackTransactions,distinctClaims:new Set(result.claims).size===2};});
 }}};
