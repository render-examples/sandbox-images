import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Stagehand,localBrowser,type StagehandBrowser} from '@browserbasehq/stagehand';
import {chromium} from 'playwright';
import {z} from 'zod';
import {serve} from './fixture.ts';
import {parseJson} from '/opt/render/runtime/contracts.ts';
const [root,provider,model]=process.argv.slice(2);assert.ok(root&&provider&&model,'Usage: run-agent.ts PREPARED_ROOT openai|google MODEL');
assert.ok(provider==='openai'||provider==='google');const apiKey=process.env[provider==='openai'?'OPENAI_API_KEY':'GOOGLE_API_KEY']??(provider==='google'?process.env.GEMINI_API_KEY:undefined);assert.ok(apiKey,'Selected provider key is required at runtime');
const inputDir=join(resolve(root),'input');assert.ok(existsSync(join(resolve(root),'baseline.json')),'Prepare snapshot inputs first');
const outputDir=join(resolve(root),'live-'+provider);assert.ok(!existsSync(outputDir),'Refusing to overwrite live evidence');mkdirSync(outputDir);
const server=await serve(inputDir,outputDir);let browser:StagehandBrowser|undefined;let agent:Stagehand|undefined;
try{
 browser=await localBrowser.launch({executablePath:chromium.executablePath(),headless:true,chromiumSandbox:false,args:['--no-sandbox','--disable-dev-shm-usage']});
 agent=await Stagehand.create({browser,cache:false,model:{modelName:`${provider}/${model}`,apiKey}});const[page]=await browser.context.pages();assert.ok(page);await page.goto(server.url);
 const actions=[];
 actions.push(await agent.act('Fill the Name field with Ada.',{timeout:45000}));
 actions.push(await agent.act('Click Submit order.',{timeout:45000}));
 const extraction=await agent.extract('Read both rows of the orders table; return item and integer cents.',z.object({rows:z.array(z.object({item:z.string(),cents:z.number().int()}))}),{timeout:60000});
 assert.deepEqual(parseJson(readFileSync(join(outputDir,'server-state.json'),'utf8')),{requests:[{name:'Ada'}]});assert.deepEqual(extraction.data.rows,[{item:'Notebook',cents:1200},{item:'Keyboard',cents:3000}]);
 writeFileSync(join(outputDir,'screen.png'),await page.screenshot());writeFileSync(join(outputDir,'receipt.json'),JSON.stringify({passed:true,modelInvoked:true,provider,requestedModel:model,actions,extraction},null,2)+'\n');
}finally{try{await agent?.close();}finally{try{await browser?.close();}finally{await server.close();}}}
