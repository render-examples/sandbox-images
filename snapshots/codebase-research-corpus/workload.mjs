import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const files={'schema.ts':'export function valid(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }\n','tool.ts':"import { valid } from './schema';\nexport function charge(cents: number): number { if (!valid(cents)) throw new Error('invalid'); return cents; }\n",'agent.ts':"import { charge } from './tool';\nexport function execute(): number { return charge(1250); }\n"};
const sha=s=>createHash('sha256').update(s).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const expected={files:3,exports:3,dependencyEdges:2,citations:3};
export const scenarios={'codebase-research-corpus':{expectedSummary:expected,artifacts:['index.json','citations.json'],
 prepare(inputDir){for(const [name,text]of Object.entries(files))writeFileSync(join(inputDir,name),text);write(join(inputDir,'questions.json'),[{symbol:'execute',file:'agent.ts'},{symbol:'charge',file:'tool.ts'},{symbol:'valid',file:'schema.ts'}]);},
 run({inputDir,workDir,outputDir}){
  execFileSync('tsc',['--target','ES2022','--module','commonjs','--strict','--declaration','--emitDeclarationOnly','--outDir',workDir,...Object.keys(files).map(name=>join(inputDir,name))],{timeout:30000,stdio:'pipe'});
  const index=[],citations=[];
  for(const name of Object.keys(files).sort()){
   const content=readFileSync(join(inputDir,name),'utf8');
   // Index this deliberately narrow synthetic grammar from compiler-emitted declarations.
   // TypeScript 7 ships a CLI but no JavaScript compiler API.
   const declarations=readFileSync(join(workDir,name.replace('.ts','.d.ts')),'utf8');
   const exports=[...declarations.matchAll(/^export declare function (\w+)\(/gm)].map(m=>m[1]);
   const imports=[...content.matchAll(/^import \{[^}]+\} from '([^']+)';$/gm)].map(m=>m[1]);
   for(const symbol of exports){
    const lines=content.split('\n'),line=lines.findIndex(line=>line.startsWith('export function '+symbol+'('))+1;
    assert.ok(line>0);citations.push({file:name,line,symbol,excerpt:lines[line-1],sha256:sha(content)});
   }
   index.push({file:name,exports,imports});
  }
  write(join(outputDir,'index.json'),index);write(join(outputDir,'citations.json'),citations);
  return {files:index.length,exports:index.reduce((n,f)=>n+f.exports.length,0),dependencyEdges:index.reduce((n,f)=>n+f.imports.length,0),citations:citations.length};
 },
 verify({inputDir,outputDir}){
  const index=read(join(outputDir,'index.json')),citations=read(join(outputDir,'citations.json'));
  assert.deepEqual(index,[{file:'agent.ts',exports:['execute'],imports:['./tool']},{file:'schema.ts',exports:['valid'],imports:[]},{file:'tool.ts',exports:['charge'],imports:['./schema']}]);
  for(const q of read(join(inputDir,'questions.json'))){const c=citations.find(x=>x.symbol===q.symbol);assert.equal(c.file,q.file);const source=readFileSync(join(inputDir,c.file),'utf8');assert.equal(c.sha256,sha(source));assert.equal(c.excerpt,source.split('\n')[c.line-1]);assert.ok(c.excerpt.includes('function '+q.symbol+'('));}
  return {files:index.length,exports:index.flatMap(x=>x.exports).length,dependencyEdges:index.flatMap(x=>x.imports).length,citations:citations.length};
 }}};
