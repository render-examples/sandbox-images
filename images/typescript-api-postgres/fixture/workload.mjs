import assert from 'node:assert/strict';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { createApp } from './dist/app.js';

const mode = process.argv[2];
assert.ok(['baseline', 'final'].includes(mode));
const pool = new Pool({ max: 2, connectionTimeoutMillis: 5000, query_timeout: 5000, statement_timeout: 5000 });
const server = createApp(pool);
const seed = [{id:1,total_cents:2500},{id:2,total_cents:750},{id:3,total_cents:1750}];
const checks=[];
const migrations=[];
let transaction;
try {
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}`;
  async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(5000)});return {status:r.status,body:await r.json()};}
  assert.deepEqual((await pool.query('SELECT id,total_cents FROM orders ORDER BY id')).rows,seed);
  assert.deepEqual(await get('/orders'),{status:200,body:seed});checks.push('GET /orders returns seeded rows');
  assert.deepEqual(await get('/missing'),{status:404,body:{error:'not_found'}});checks.push('unknown route returns 404');
  if(mode==='baseline') {
    assert.equal((await get('/summary')).status,404);checks.push('summary task starts unimplemented');
  } else {
    const client=await pool.connect();
    try {
      transaction=client;
      await client.query('BEGIN');
      await client.query("ALTER TABLE orders ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid'))");
      await client.query("UPDATE orders SET status='paid' WHERE id=2");
      await client.query('COMMIT');transaction=undefined;
      migrations.push('upgrade committed');
      assert.deepEqual(await get('/summary'),{status:200,body:{orders:3,total_cents:5000,paid_cents:750}});checks.push('new summary endpoint uses migrated schema');
      assert.deepEqual((await get('/orders')).body,seed);checks.push('upgrade preserves order values');
      await client.query('BEGIN');transaction=client;
      await client.query('UPDATE orders SET total_cents=0 WHERE id=1');
      await assert.rejects(client.query("INSERT INTO orders(id,total_cents,status) VALUES(4,100,'invalid')"),e=>e.code==='23514');
      await client.query('ROLLBACK');transaction=undefined;
      assert.deepEqual((await get('/orders')).body,seed);checks.push('constraint failure rolls back preceding changes');
      migrations.push('failed transaction rolled back');
      await client.query('BEGIN');transaction=client;
      await client.query('ALTER TABLE orders DROP COLUMN status');
      await client.query('COMMIT');transaction=undefined;
      assert.deepEqual((await pool.query('SELECT id,total_cents FROM orders ORDER BY id')).rows,seed);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='orders' AND column_name='status'")).rows[0].n,0);
      checks.push('downgrade removes added schema and preserves rows');migrations.push('downgrade committed');
      assert.deepEqual(await get('/summary'),{status:500,body:{error:'database_error'}});checks.push('database errors return bounded generic response');
      assert.deepEqual(await get('/orders'),{status:200,body:seed});checks.push('original endpoint works after downgrade');
    } finally {
      if(transaction){await client.query('ROLLBACK');transaction=undefined;}
      client.release();
    }
  }
  const result={mode,checks,testsPassed:checks.length,rows:3,totalCents:5000,migrations};
  if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(result,null,2)+'\n');
  else console.log(JSON.stringify(result));
} finally {
  server.closeAllConnections();
  if(server.listening)await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await pool.end();
}
