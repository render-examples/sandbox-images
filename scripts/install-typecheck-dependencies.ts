import {readdirSync,existsSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {jsonObject,parseJson} from '../runtime/contracts.ts';

/** Stop assigning new installs after a failure; always wait for active jobs. */
export async function installInPool(directories:readonly string[],install:(directory:string)=>Promise<void>,concurrency=4):Promise<void>{
 if(!Number.isSafeInteger(concurrency)||concurrency<1)throw new Error('Require positive install concurrency');
 let cursor=0,stopped=false;
 const failures:unknown[]=[];
 await Promise.all(Array.from({length:Math.min(concurrency,directories.length)},async()=>{
  while(!stopped){
   const directory=directories[cursor++];if(directory===undefined)return;
   try{await install(directory);}catch(error){stopped=true;failures.push(error);}
  }
 }));
 if(failures.length)throw new AggregateError(failures,'Dependency installation failed; active jobs settled and no new jobs were scheduled after failure');
}

export async function main(root=resolve('.')):Promise<void>{
 // Packages are isolated intentionally: image SDK versions need not agree.
 const directories=['tools',...readdirSync(join(root,'images')).map(slug=>`images/${slug}/fixture`)]
  .filter(directory=>existsSync(join(root,directory,'package-lock.json')))
  .filter(directory=>jsonObject(parseJson(readFileSync(join(root,directory,'package.json'),'utf8'))).private===true);
 await installInPool(directories,directory=>new Promise<void>((resolve,reject)=>{
  const child=spawn('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:join(root,directory),stdio:'inherit',timeout:180_000});
  let spawnError:Error|undefined;
  child.once('error',error=>{spawnError=error;});
  // The close event follows spawn errors too; never leave an active child behind.
  child.once('close',(code,signal)=>{
   if(spawnError)reject(spawnError);
   else if(code===0)resolve();
   else reject(new Error(`${directory}: npm ci failed (${code??signal})`));
  });
 }));
 console.log(`Installed ${directories.length} isolated dependency sets for type checking; lifecycle scripts were disabled.`);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(error=>{console.error(error);process.exitCode=1;});
}
