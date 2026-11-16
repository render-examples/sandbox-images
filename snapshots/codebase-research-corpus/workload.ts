import type {ScenarioMap} from '/opt/render/runtime/contracts.ts';
function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const files={'schema.ts':'export function valid(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }\n','tool.ts':"import { valid } from './schema';\nexport function charge(cents: number): number { if (!valid(cents)) throw new Error('invalid'); return cents; }\n",'agent.ts':"import { charge } from './tool';\nexport function execute(): number { return charge(1250); }\n"};
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const read=(p:string):unknown=>JSON.parse(readFileSync(p,'utf8')),write=(p:string,v:unknown)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const expected={files:3,exports:3,dependencyEdges:2,citations:3};
export const scenarios:ScenarioMap={'codebase-research-corpus':{expectedSummary:expected,artifacts:['index.json','citations.json'],
 prepare(inputDir){for(const [name,text]of Object.entries(files))writeFileSync(join(inputDir,name),text);write(join(inputDir,'questions.json'),[{symbol:'execute',file:'agent.ts'},{symbol:'charge',file:'tool.ts'},{symbol:'valid',file:'schema.ts'}]);},
 run({inputDir,workDir,outputDir}){
  execFileSync('tsc',['--target','ES2022','--module','commonjs','--strict','--declaration','--emitDeclarationOnly','--outDir',workDir,...Object.keys(files).map(name=>join(inputDir,name))],{timeout:30000,stdio:'pipe',cwd:workDir});
  const index:{file:string;exports:string[];imports:string[]}[]=[],citations:{file:string;line:number;symbol:string;excerpt:string;sha256:string}[]=[];
  for(const name of Object.keys(files).sort()){
   const content=readFileSync(join(inputDir,name),'utf8');
   // Index this deliberately narrow synthetic grammar from compiler-emitted declarations.
   // TypeScript 7 ships a CLI but no JavaScript compiler API.
   const declarations=readFileSync(join(workDir,name.replace('.ts','.d.ts')),'utf8');
   const exports=[...declarations.matchAll(/^export declare function (\w+)\(/gm)].map(m=>{assert.ok(m[1]);return m[1];});
   const imports=[...content.matchAll(/^import \{[^}]+\} from '([^']+)';$/gm)].map(m=>{assert.ok(m[1]);return m[1];});
   for(const symbol of exports){
    const lines=content.split('\n'),line=lines.findIndex(line=>line.startsWith('export function '+symbol+'('))+1;
    const excerpt=lines[line-1];assert.ok(line>0&&excerpt!==undefined);citations.push({file:name,line,symbol,excerpt,sha256:sha(content)});
   }
   index.push({file:name,exports,imports});
  }
  write(join(outputDir,'index.json'),index);write(join(outputDir,'citations.json'),citations);
  return {files:index.length,exports:index.reduce((n,f)=>n+f.exports.length,0),dependencyEdges:index.reduce((n,f)=>n+f.imports.length,0),citations:citations.length};
 },
 verify({inputDir,outputDir}){
  const rawIndex=read(join(outputDir,'index.json')),rawCitations=read(join(outputDir,'citations.json')),questions=read(join(inputDir,'questions.json'));
  assert.ok(Array.isArray(rawIndex)&&Array.isArray(rawCitations)&&Array.isArray(questions));
  const index=rawIndex.map((row:unknown)=>{assert.ok(isRecord(row)&&typeof row.file==='string'&&Array.isArray(row.exports)&&row.exports.every((v:unknown)=>typeof v==='string')&&Array.isArray(row.imports)&&row.imports.every((v:unknown)=>typeof v==='string'));return {file:row.file,exports:row.exports,imports:row.imports};});
  const citations=rawCitations.map((row:unknown)=>{assert.ok(isRecord(row)&&typeof row.file==='string'&&Object.hasOwn(files,row.file)&&typeof row.symbol==='string'&&typeof row.excerpt==='string'&&typeof row.sha256==='string'&&typeof row.line==='number'&&Number.isSafeInteger(row.line)&&row.line>0);return {file:row.file,symbol:row.symbol,excerpt:row.excerpt,sha256:row.sha256,line:row.line};});
  assert.deepEqual(index,[{file:'agent.ts',exports:['execute'],imports:['./tool']},{file:'schema.ts',exports:['valid'],imports:[]},{file:'tool.ts',exports:['charge'],imports:['./schema']}]);
  for(const q of questions){assert.ok(isRecord(q)&&typeof q.symbol==='string'&&typeof q.file==='string');const c=citations.find(x=>x.symbol===q.symbol);assert.ok(c);assert.equal(c.file,q.file);const source=readFileSync(join(inputDir,c.file),'utf8');assert.equal(c.sha256,sha(source));assert.equal(c.excerpt,source.split('\n')[c.line-1]);assert.ok(c.excerpt.includes('function '+q.symbol+'('));}
  return {files:index.length,exports:index.flatMap(x=>x.exports).length,dependencyEdges:index.flatMap(x=>x.imports).length,citations:citations.length};
 }}};
