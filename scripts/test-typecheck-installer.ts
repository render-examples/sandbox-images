import assert from 'node:assert/strict';
import test from 'node:test';
import {setImmediate} from 'node:timers/promises';
import {installInPool} from './install-typecheck-dependencies.ts';
function deferred(){let resolve!:()=>void,reject!:(reason:Error)=>void;const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
test('installer stops scheduling after failure and waits for every active job',async()=>{
 const active=[deferred(),deferred(),deferred(),deferred()];const started:string[]=[];
 const outcome=installInPool(['a','b','c','d','never-start'],async name=>{started.push(name);const item=active[started.length-1];assert.ok(item);await item.promise;}).then(()=>({failed:false}),()=>({failed:true}));
 assert.deepEqual(started,['a','b','c','d']);
 active[0]?.reject(new Error('synthetic failure'));
 await setImmediate();active[1]?.resolve();active[2]?.reject(new Error('another active failure'));
 let settled=false;void outcome.then(()=>{settled=true;});await setImmediate();assert.equal(settled,false);assert.deepEqual(started,['a','b','c','d']);
 active[3]?.resolve();assert.deepEqual(await outcome,{failed:true});assert.deepEqual(started,['a','b','c','d']);
});
test('installer visits successful inputs once and enforces concurrency',async()=>{
 const names:string[]=[];let active=0,maximum=0;
 await installInPool(['a','b','c','d','e'],async name=>{names.push(name);active++;maximum=Math.max(maximum,active);await setImmediate();active--;},2);
 assert.deepEqual(names.sort(),['a','b','c','d','e']);assert.equal(maximum,2);
 await assert.rejects(()=>installInPool([],async()=>{},0));
});
