// Shared filesystem-recipe lifecycle. Workload modules own semantic verification.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const action=process.argv[2];
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const write=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n');
let outputDir='/workspace/output';
let receiptPath=action==='smoke'?null:join(outputDir,'verification.json');
const invalidate=()=>{if(receiptPath)rmSync(receiptPath,{force:true});};
function hashes(directory){
 const result={};
 function visit(relative){
  const path=join(directory,relative),stat=lstatSync(path);
  assert.ok(!stat.isSymbolicLink(),'Prepared inputs cannot contain symlinks');
  if(stat.isDirectory())for(const child of readdirSync(path).sort())visit(relative?relative+'/'+child:child);
  else {assert.ok(stat.isFile(),'Prepared inputs must be regular files');result[relative]=sha(readFileSync(path));}
 }
 visit('');return result;
}
async function main(){
 const smoke=action==='smoke';
 let config,configBytes;
 if(smoke){config={imageSlug:process.argv[3],scenario:process.argv[4],slug:process.argv[4]};configBytes=Buffer.from(JSON.stringify(config));}
 else {assert.ok(process.argv[3],'Provide recipe.json');configBytes=readFileSync(resolve(process.argv[3]));config=JSON.parse(configBytes);}
 for(const key of ['imageSlug','scenario','slug'])assert.match(config[key]??'',slugPattern);
 assert.ok(config.localModule===undefined||config.localModule===true);
 const modulePath=config.localModule
  ? join(dirname(resolve(process.argv[3])),'workload.mjs')
  : `/opt/render/fixtures/${config.imageSlug}/workload.mjs`;
 assert.ok(lstatSync(modulePath).isFile()&&!lstatSync(modulePath).isSymbolicLink());
 const {scenarios}=await import(pathToFileURL(modulePath));
 assert.ok(Object.hasOwn(scenarios,config.scenario),'Unknown workload scenario');
 const scenario=scenarios[config.scenario];
 const expected=scenario.expectedSummary;
 assert.ok(expected&&typeof expected==='object'&&!Array.isArray(expected)&&Object.keys(expected).length);
 const artifacts=scenario.artifacts;
 assert.ok(Array.isArray(artifacts)&&artifacts.length&&new Set(artifacts).size===artifacts.length);
 for(const name of artifacts){assert.match(name,/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/);assert.ok(!['summary.json','verification.json'].includes(name));}
 const names=['summary.json',...artifacts];
 for(const name of ['prepare','run','verify'])assert.equal(typeof scenario[name],'function');
 mkdirSync('/workspace',{recursive:true});
 const root=smoke?mkdtempSync('/workspace/image-workload-'):`/workspace/${config.slug}`;
 // Image smoke must never replace or remove an existing recipe's results.
 if(smoke){outputDir=join(root,'output');receiptPath=join(outputDir,'verification.json');}
 const inputDir=join(root,'input'),workDir=join(root,'work'),baselinePath=join(root,'baseline.json');
 const context={inputDir,workDir,outputDir};
 const identity={schemaVersion:1,imageSlug:config.imageSlug,scenario:config.scenario,expectedSummary:expected,configSha256:sha(configBytes),moduleSha256:sha(readFileSync(modulePath))};
 function baseline(){
  const b=json(baselinePath);
  assert.deepEqual(b,{...identity,inputSha256:hashes(inputDir)},'Prepared input or workload identity changed');
  assert.ok(Object.keys(b.inputSha256).length,'Workload must prepare concrete inputs');
 }
 async function prepare(){
  assert.ok(!existsSync(inputDir)&&!existsSync(baselinePath),'Refusing to overwrite prepared state');
  mkdirSync(inputDir,{recursive:true});await scenario.prepare(inputDir);
  write(baselinePath,{...identity,inputSha256:hashes(inputDir)});baseline();
  for(const name of [...names,'verification.json'])assert.ok(!existsSync(join(outputDir,name)),'Preparation must not create workload outputs');
  assert.ok(!existsSync(workDir),'Preparation must leave execution work absent');
 }
 async function verify(requireReceipt=true){
  const previous=existsSync(receiptPath)?readFileSync(receiptPath):null;invalidate();baseline();
  for(const name of names){const path=join(outputDir,name);assert.ok(lstatSync(path).isFile()&&!lstatSync(path).isSymbolicLink(),'Outputs must be regular files');}
  assert.deepEqual(json(join(outputDir,'summary.json')),expected);
  const actual=await scenario.verify(context);baseline();assert.deepEqual(actual,expected,'Semantic verification did not match expected results');
  const receipt={passed:true,summary:actual,outputSha256:Object.fromEntries(names.map(name=>[name,sha(readFileSync(join(outputDir,name)))]))};
  if(requireReceipt){assert.ok(previous,'Missing passing receipt');assert.deepEqual(JSON.parse(previous),receipt,'Artifact hashes changed');}
  write(receiptPath,receipt);return actual;
 }
 async function analyze(){
  invalidate();baseline();mkdirSync(outputDir,{recursive:true});
  rmSync(workDir,{recursive:true,force:true});mkdirSync(workDir,{recursive:true});
  for(const name of names)rmSync(join(outputDir,name),{force:true});
  const result=await scenario.run(context);baseline();assert.deepEqual(result,expected,'Unexpected workload result');
  write(join(outputDir,'summary.json'),result);return verify(false);
 }
 async function test(){
  await verify();
  const input=Object.keys(hashes(inputDir))[0];
  for(const path of [baselinePath,join(inputDir,input),...names.map(name=>join(outputDir,name))]){
   const bytes=readFileSync(path);
   try {writeFileSync(path,'corrupted fixture\n');await assert.rejects(()=>verify());assert.ok(!existsSync(receiptPath),'Failed verification retained a receipt');}
   finally {writeFileSync(path,bytes);}
   await verify(false);
  }
  // Prove a fresh run regenerates outputs rather than accepting cached answers.
  for(const name of [...names,'verification.json'])rmSync(join(outputDir,name),{force:true});
  await analyze();await verify();
  console.log(`${config.slug}: input/baseline/artifact corruption and regeneration passed`);
 }
 try {
  if(smoke){await prepare();const summary=await analyze();await verify();mkdirSync('/workspace/image-smoke',{recursive:true});write('/workspace/image-smoke/result.json',{status:'passed',...summary});}
  else if(action==='prepare')await prepare();
  else if(action==='analyze')await analyze();
  else if(action==='verify')await verify();
  else if(action==='test')await test();
  else throw new Error('Expected prepare|analyze|verify|test|smoke');
 } finally {if(smoke){rmSync(root,{recursive:true,force:true});for(const name of [...names,'verification.json'])rmSync(join(outputDir,name),{force:true});}}
}
try {await main();console.log(`${action}: passed`);}catch(error){invalidate();console.error(error);process.exitCode=1;}
