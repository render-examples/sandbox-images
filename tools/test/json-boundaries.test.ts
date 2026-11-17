import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateAnalyticsSmoke,validateAnalyticsReceipt} from '../analytics-workbench.ts';

const declaration=fileURLToPath(new URL('../../runtime/json-boundaries.d.ts',import.meta.url));
const compilers=[
 ['repository',fileURLToPath(new URL('../../node_modules/typescript/bin/tsc',import.meta.url))],
 ['host tools',fileURLToPath(new URL('../node_modules/typescript/bin/tsc',import.meta.url))],
] as const;
for(const [name,compiler] of compilers){
 test(`${name} compiler rejects unchecked JSON values, including reviver overloads`,{skip:!existsSync(compiler)?`${name} compiler is not installed in this isolated CI job`:false},()=>{
  const root=mkdtempSync(join(tmpdir(),'json-boundary-'));
  try{
   writeFileSync(join(root,'package.json'),'{"type":"module"}');
   writeFileSync(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2023',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noEmit:true,types:[],skipLibCheck:false},files:[declaration,'case.ts']}));
   for(const source of [
    `const decoded=JSON.parse('{}'); decoded.missing.method();`,
    `const decoded:{name:string}=JSON.parse('{}');`,
    `const decoded=JSON.parse('{}',(key:string,value:number)=>value); decoded.missing.method();`,
   ]){
    writeFileSync(join(root,'case.ts'),source);
    const result=spawnSync(process.execPath,[compiler,'-p',join(root,'tsconfig.json'),'--pretty','false'],{encoding:'utf8',timeout:30000});
    assert.ifError(result.error);assert.notEqual(result.status,0,'Unchecked JSON unexpectedly typechecked');
    assert.match(result.stdout,/case\.ts\(1,\d+\): error TS(?:18046|2322):/);assert.match(result.stdout,/unknown/);
   }
   writeFileSync(join(root,'case.ts'),`const decoded=JSON.parse('{"name":"fixture"}'); if(!decoded || typeof decoded!=='object' || !('name' in decoded) || typeof decoded.name!=='string') throw Error('Invalid name'); const name:string=decoded.name; console.log(name.toUpperCase());`);
   execFileSync(process.execPath,[compiler,'-p',join(root,'tsconfig.json'),'--pretty','false'],{encoding:'utf8',timeout:30000});
  }finally{rmSync(root,{recursive:true,force:true});}
 });
}

test('analytics receipt decoders reject malformed structures before field use',()=>{
 const smoke={status:'passed',total_cents:4500,rows:2};
 assert.doesNotThrow(()=>validateAnalyticsSmoke(smoke));
 for(const value of [null,[],{},'passed',{...smoke,rows:'2'},{...smoke,total_cents:1}])assert.throws(()=>validateAnalyticsSmoke(value));
 const outputSha256={'summary.json':'a'.repeat(64),'clean-orders.parquet':'b'.repeat(64),'revenue.png':'c'.repeat(64)};
 const receipt={passed:true,summary:{revenueCents:21200,cleanOrders:6},outputSha256};
 assert.deepEqual(validateAnalyticsReceipt(receipt),{outputSha256});
 for(const value of [null,[],{}, {...receipt,passed:false},{...receipt,summary:null},{...receipt,summary:{revenueCents:'21200',cleanOrders:6}},{...receipt,outputSha256:{...outputSha256,'summary.json':42}},{...receipt,outputSha256:{...outputSha256,'revenue.png':'invalid'}}])assert.throws(()=>validateAnalyticsReceipt(value));
});
