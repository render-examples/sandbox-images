import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, lstatSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
export type Context = {inputDir:string; workDir:string; outputDir:string};
export const write=(p:string,v:unknown)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
export const read=(p:string):unknown=>JSON.parse(readFileSync(p,'utf8'));
export const BUG='def discounted_cents(cents, percent):\n    return cents * (100 - percent) // 100\n';
export const FIX='def discounted_cents(cents, percent):\n    return (cents * (100 - percent) + 50) // 100\n';
export const INVOICE={currency:'USD',lines:[{quantity:2,unitCents:1250},{quantity:1,unitCents:750}]};
export function prepare(dir:string,repair:boolean){
 writeFileSync(join(dir,'TASK.md'),repair?'Fix pricing.py so integer discounts round half cents up. Preserve the function name and arguments.':'Read invoice.json and write answer.json containing exactly currency USD and totalCents as the integer sum of quantity * unitCents.');
 if(repair){
  writeFileSync(join(dir,'pricing.py'),BUG);
  const env={PATH:process.env.PATH??'/usr/local/bin:/usr/bin:/bin',HOME:dir,GIT_AUTHOR_NAME:'Fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',GIT_COMMITTER_NAME:'Fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid',GIT_AUTHOR_DATE:'2000-01-01T00:00:00Z',GIT_COMMITTER_DATE:'2000-01-01T00:00:00Z'};
  for(const args of [['init','-q','--initial-branch=rt/task'],['add','TASK.md','pricing.py'],['commit','-q','-m','Prepared pricing regression']])execFileSync('git',args,{cwd:dir,env,timeout:10000,stdio:'pipe'});
 }else write(join(dir,'invoice.json'),INVOICE);
}
export function project(ctx:Context){const p=join(ctx.workDir,'project');mkdirSync(p,{recursive:true});cpSync(ctx.inputDir,p,{recursive:true});return p;}
export function grade(dir:string,repair:boolean){
 if(repair){
  const code=readFileSync(join(dir,'pricing.py'),'utf8'); assert.ok(code.length<10000);
  // Independent harness is passed on stdin and is never part of the editable task.
  const harness=`import importlib.util\ns=importlib.util.spec_from_file_location('candidate','pricing.py')\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nfor c in range(1,202,2):\n for p in [0,1,25,50,75,99,100]:\n  expected=(c*(100-p)+50)//100\n  assert m.discounted_cents(c,p)==expected,(c,p)\nprint('707 cases passed')\n`;
  const stdout=execFileSync('python3',['-I','-c',harness],{cwd:dir,timeout:15000,maxBuffer:65536,encoding:'utf8',env:{PATH:process.env.PATH??'/usr/local/bin:/usr/bin:/bin'}});
  assert.match(stdout,/707 cases passed/);return {casesPassed:707};
 }
 const result=read(join(dir,'answer.json'));assert.deepEqual(result,{currency:'USD',totalCents:3250});return {totalCents:3250};
}
export function reference(ctx:Context,repair:boolean){const p=project(ctx);if(repair)writeFileSync(join(p,'pricing.py'),FIX);else write(join(p,'answer.json'),{currency:'USD',totalCents:3250});return p;}
export function verify(ctx:Context,repair:boolean){
 const p=join(ctx.outputDir,'candidate'); assert.ok(existsSync(p)&&!lstatSync(p).isSymbolicLink()); return grade(p,repair);
}
export function copyArtifact(dir:string,out:string,repair:boolean){mkdirSync(out,{recursive:true});const dest=join(out,'candidate');rmSync(dest,{recursive:true,force:true});mkdirSync(dest);cpSync(join(dir,repair?'pricing.py':'answer.json'),join(dest,repair?'pricing.py':'answer.json'));}
export function boundedShell(cwd:string,command:string){return execFileSync('bash',['-c',command],{cwd,encoding:'utf8',timeout:15000,maxBuffer:65536,env:{PATH:process.env.PATH??'/usr/local/bin:/usr/bin:/bin',HOME:cwd}});}
export function filePath(root:string,name:string){if(!['TASK.md','pricing.py','invoice.json','answer.json'].includes(name))throw Error('Unknown task file');const p=resolve(root,name);if(existsSync(p)&&lstatSync(p).isSymbolicLink())throw Error('Symlink task file');return p;}
