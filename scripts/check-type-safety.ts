import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {resolve, relative, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {API} from 'typescript/unstable/sync';
import {SyntaxKind, getLeadingCommentRanges, getTrailingCommentRanges, isAsExpression,
  isTypeAssertion, isCallExpression, isPropertyAccessExpression, isIdentifier, isModuleDeclaration, isStringLiteral, isParenthesizedExpression,
  type Node, type SourceFile} from 'typescript/unstable/ast';
import {jsonObject, parseJson} from '../runtime/contracts.ts';

const strictOptions=['strict','noUncheckedIndexedAccess','exactOptionalPropertyTypes','erasableSyntaxOnly'] as const;
const protectedOptions=[...strictOptions,'noImplicitAny','strictNullChecks','strictFunctionTypes','strictBindCallApply','strictPropertyInitialization','strictBuiltinIteratorReturn','noImplicitThis','useUnknownInCatchVariables','alwaysStrict'] as const;

/** Uses the AST of pinned TypeScript 7 so comments/string fixtures are not code. */
export function sourceViolations(source: SourceFile): string[] {
  const problems:string[]=[];
  const comments=new Set<string>();
  const report=(node:Node,message:string)=>problems.push(`${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line+1}: ${message}`);
  function visit(node:Node):void {
    if(node.kind===SyntaxKind.AnyKeyword)report(node,'Explicit any bypasses type safety; use a real type or validate unknown.');
    if(isAsExpression(node)||isTypeAssertion(node)){
      let expression=node.expression;
      while(isParenthesizedExpression(expression))expression=expression.expression;
      if(isCallExpression(expression)&&isPropertyAccessExpression(expression.expression)&&isIdentifier(expression.expression.expression)&&expression.expression.expression.text==='JSON'&&expression.expression.name.text==='parse')
        report(node,'Validate parsed JSON instead of asserting its type.');
      if((isAsExpression(expression)||isTypeAssertion(expression))&&expression.type.kind===SyntaxKind.UnknownKeyword)
        report(node,'Double assertions through unknown bypass type checking.');
    }
    if(isModuleDeclaration(node)&&isStringLiteral(node.name)&&(!node.body||node.name.text.includes('*')))
      report(node,'Blanket ambient modules bypass dependency types.');
    for(const range of [...getLeadingCommentRanges(source.text,node.pos)??[],...getTrailingCommentRanges(source.text,node.end)??[]]){
      const comment=source.text.slice(range.pos,range.end);
      if(/@ts-(?:ignore|nocheck|expect-error)\b/.test(comment))comments.add(`${source.fileName}:${source.getLineAndCharacterOfPosition(range.pos).line+1}: Type-check suppression is forbidden.`);
    }
    node.forEachChild(visit);
  }
  visit(source);
  return [...problems,...comments];
}

export function checkTypeSafety(root:string):{files:number;problems:string[]} {
  const names=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(name=>name&&existsSync(resolve(root,name)));
  const problems:string[]=[];
  for(const name of names){
    if(['.js','.mjs','.cjs','.jsx'].includes(extname(name)))problems.push(`${name}: Maintained Node.js source must be TypeScript.`);
    if(/(?:^|\/)tsconfig(?:\.[^/]+)?\.json$/.test(name)){
      const config=jsonObject(parseJson(readFileSync(resolve(root,name),'utf8')));
      const options=config.compilerOptions===undefined?{}:jsonObject(config.compilerOptions);
      for(const option of protectedOptions)if(options[option]===false)problems.push(`${name}: ${option} cannot be disabled.`);
      if(options.noCheck===true)problems.push(`${name}: Semantic type checking cannot be disabled.`);
      if(options.allowJs===true||options.checkJs===false)problems.push(`${name}: Unchecked JavaScript is forbidden.`);
    }
  }
  const configPath=resolve(root,'tsconfig.json');
  const config=jsonObject(parseJson(readFileSync(configPath,'utf8'))),options=jsonObject(config.compilerOptions);
  for(const option of strictOptions)if(options[option]!==true)problems.push(`tsconfig.json: ${option} must be enabled.`);
  const api=new API();
  try{
    const snapshot=api.updateSnapshot({openProjects:[configPath]});
    try{
      const project=snapshot.getProject(configPath);
      if(!project)throw new Error('The repository typecheck project was not loaded');
      const effective=jsonObject(project.compilerOptions);
      for(const option of protectedOptions)if(effective[option]===false)problems.push(`tsconfig.json: effective ${option} cannot be disabled by inherited configuration.`);
      if(effective.noCheck===true)problems.push('tsconfig.json: inherited configuration disables semantic type checking.');
      if(effective.allowJs===true||effective.checkJs===false)problems.push('tsconfig.json: inherited configuration enables unchecked JavaScript.');
      const included=new Set(project.program.getSourceFileNames().map(name=>resolve(name)));
      const sources=names.filter(name=>/\.(?:ts|tsx|mts|cts)$/.test(name));
      for(const name of sources){
        const path=resolve(root,name);
        if(!included.has(path)){problems.push(`${name}: Maintained source is omitted from the repository typecheck.`);continue;}
        const source=project.program.getSourceFile(path);
        if(!source)throw new Error(`Cannot inspect ${relative(root,path)}`);
        problems.push(...sourceViolations(source));
      }
      return {files:sources.length,problems};
    }finally{snapshot.dispose();}
  }finally{api.close();}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=checkTypeSafety(resolve(process.argv[2]??'.'));
  if(result.problems.length){console.error(result.problems.join('\n'));process.exitCode=1;}
  else console.log(`Type-safety policy passed for all ${result.files} maintained TypeScript files.`);
}
