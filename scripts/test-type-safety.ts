import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkTypeSafety} from './check-type-safety.ts';

test('policy rejects untyped files, unchecked source, suppressions and explicit escape hatches',()=>{
  const root=mkdtempSync(join(tmpdir(),'type-policy-'));
  try{
    execFileSync('git',['init','--quiet',root]);mkdirSync(join(root,'src'));
    writeFileSync(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,erasableSyntaxOnly:true,noEmit:true,types:[]},include:['src/**/*.ts']}));
    writeFileSync(join(root,'src/good.ts'),`export const sample = 'any @ts-ignore as unknown as';\nexport function double(value: number): number { return value * 2; }\n`);
    assert.deepEqual(checkTypeSafety(root).problems,[],'String fixture content is not a type escape');
    writeFileSync(join(root,'legacy.mjs'),'export const old = 1;');
    writeFileSync(join(root,'omitted.ts'),'export const missed = 1;');
    writeFileSync(join(root,'src/bad.ts'),`// @ts-ignore\nexport const unchecked: any = 1;\nexport const cast = 1 as unknown as string;\ndeclare module '*';\nexport const parsed = JSON.parse('{}') as {name:string};\n`);
    const problems=checkTypeSafety(root).problems.join('\n');
    for(const expected of ['must be TypeScript','omitted','Explicit any','Double assertions','Blanket ambient','suppression','Validate parsed JSON'])assert.ok(problems.includes(expected),problems);
    writeFileSync(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:false,noImplicitAny:false,strictNullChecks:false,noUncheckedIndexedAccess:false,exactOptionalPropertyTypes:false,erasableSyntaxOnly:false,allowJs:true,checkJs:false,noCheck:true,noEmit:true},include:['src/**/*.ts']}));
    const weakened=checkTypeSafety(root).problems.join('\n');
    assert.match(weakened,/strict must be enabled/);assert.match(weakened,/Unchecked JavaScript/);assert.match(weakened,/noImplicitAny cannot be disabled/);assert.match(weakened,/strictNullChecks cannot be disabled/);assert.match(weakened,/Semantic type checking cannot be disabled/);
    writeFileSync(join(root,'base.json'),JSON.stringify({compilerOptions:{noCheck:true,noImplicitAny:false}}));
    writeFileSync(join(root,'tsconfig.json'),JSON.stringify({extends:'./base.json',compilerOptions:{strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,erasableSyntaxOnly:true,noEmit:true,types:[]},include:['src/**/*.ts']}));
    const inherited=checkTypeSafety(root).problems.join('\n');assert.match(inherited,/inherited configuration disables semantic/);assert.match(inherited,/effective noImplicitAny cannot be disabled/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
