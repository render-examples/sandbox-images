// Independent behavioral checks. Imported candidate code executes only in this bounded worker.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const equal=assert.deepStrictEqual.bind(assert), ok=assert.ok.bind(assert), throws=assert.throws.bind(assert);
const [task,modulePath]=process.argv.slice(2);
const cases={
 grouping:[
  ['accumulates duplicate categories',fn=>equal({...fn([{category:'food',amountCents:100},{category:'food',amountCents:25},{category:'travel',amountCents:40}])},{food:125,travel:40})],
  ['preserves prototype-like keys',fn=>{const r=fn([{category:'__proto__',amountCents:5},{category:'__proto__',amountCents:7},{category:'constructor',amountCents:3}]);equal(Object.keys(r).sort(),['__proto__','constructor']);equal(r.__proto__,12);equal(r.constructor,3);}],
  ['rejects invalid values and overflow',fn=>{for(const rows of [null,[{category:'',amountCents:1}],[{category:'a',amountCents:-1}],[{category:'a',amountCents:1.5}],[{category:'a',amountCents:Number.MAX_SAFE_INTEGER},{category:'a',amountCents:1}]])throws(()=>fn(rows));}],
  ['keeps input unchanged and handles empty arrays',fn=>{const rows=Object.freeze([Object.freeze({category:'a',amountCents:0})]);equal({...fn(rows)},{a:0});equal({...fn([])},{});}]
 ],
 idempotency:[
  ['deduplicates and sorts independent records',fn=>{const input=[{id:'b',totalCents:20},{id:'a',totalCents:10},{id:'b',totalCents:20}];const result=fn(input);equal(result,[{id:'a',totalCents:10},{id:'b',totalCents:20}]);ok(result[0]!==input[1]);}],
  ['rejects conflicting duplicate payloads',fn=>throws(()=>fn([{id:'a',totalCents:10},{id:'a',totalCents:11}]))],
  ['validates all records',fn=>{for(const input of [null,[{id:'',totalCents:1}],[{id:'a',totalCents:-1}],[{id:'a',totalCents:1.5}],[{id:'a',totalCents:Number.MAX_SAFE_INTEGER+1}]])throws(()=>fn(input));}],
  ['preserves frozen input and arbitrary string ids',fn=>{const input=Object.freeze([Object.freeze({id:'__proto__',totalCents:0})]);equal(fn(input),[{id:'__proto__',totalCents:0}]);equal(fn([]),[]);}]
 ],
 validation:[
  ['normalizes and calculates a valid order',fn=>{const input=Object.freeze({id:' order-1 ',quantity:2,unitCents:1250});equal(fn(input),{id:'order-1',quantity:2,unitCents:1250,totalCents:2500});}],
  ['rejects missing, extra and non-object input',fn=>{for(const input of [null,[],{},'text',{id:'a',quantity:1},{id:'a',quantity:1,unitCents:1,extra:true}])throws(()=>fn(input));}],
  ['rejects coercion and out-of-range fields',fn=>{for(const input of [{id:' ',quantity:1,unitCents:1},{id:'a',quantity:'2',unitCents:1},{id:'a',quantity:1.5,unitCents:1},{id:'a',quantity:0,unitCents:1},{id:'a',quantity:1001,unitCents:1},{id:'a',quantity:1,unitCents:-1}])throws(()=>fn(input));}],
  ['handles zero price and rejects unsafe arithmetic',fn=>{equal(fn({id:'a',quantity:1000,unitCents:0}),{id:'a',quantity:1000,unitCents:0,totalCents:0});throws(()=>fn({id:'a',quantity:2,unitCents:Number.MAX_SAFE_INTEGER}));}]
 ]
};
const exports={grouping:'groupTotals',idempotency:'deduplicateOrders',validation:'parseOrder'};
if(!Object.hasOwn(cases,task))throw new Error('Unknown task');
let fn,error;
try{fn=(await import(pathToFileURL(modulePath).href))[exports[task]];ok(typeof fn==='function');}catch(e){error=e;}
const results=cases[task].map(([name,check])=>{try{if(error)throw error;check(fn);return {name,passed:true};}catch(e){return {name,passed:false,error:String(e?.message??e).slice(0,500)};}});
console.log('REGRESSION_RESULT '+JSON.stringify({task,checks:results,passed:results.every(r=>r.passed)}));
process.exitCode=results.every(r=>r.passed)?0:1;
