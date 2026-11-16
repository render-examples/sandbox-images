import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {Stagehand,localBrowser,type StagehandBrowser} from '@browserbasehq/stagehand';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import {prepare,serve} from './fixture.ts';
type Context={inputDir:string;workDir:string;outputDir:string};
const expected={browserInvoked:true,stagehandInvoked:true,modelInvoked:false,rows:2,submittedName:'Ada',totalCents:4200};
async function run(c:Context){
 const server=await serve(c.inputDir,c.outputDir);
 let browser:StagehandBrowser|undefined;
 let stagehand:Stagehand|undefined;
 try{
  browser=await localBrowser.launch({executablePath:chromium.executablePath(),headless:true,chromiumSandbox:false,args:['--no-sandbox','--disable-dev-shm-usage'],viewport:{width:960,height:640}});
  stagehand=await Stagehand.create({browser,cache:false});
  const [page]=await browser.context.pages();assert.ok(page);await page.setViewportSize(960,640);await page.goto(server.url);await page.locator('#name').fill('Ada');await page.locator('button').click();await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='Saved');
  const rows=await page.evaluate(()=>Array.from(document.querySelectorAll('tbody tr')).map(n=>({item:n.children[0]!.textContent,cents:Number(n.children[1]!.textContent)})));
  writeFileSync(join(c.outputDir,'rows.json'),JSON.stringify(rows));writeFileSync(join(c.outputDir,'screen.png'),await page.screenshot());return expected;
 }finally{try{await stagehand?.close();}finally{try{await browser?.close();}finally{await server.close();}}}
}
function verify(c:Context){
 assert.deepEqual(JSON.parse(readFileSync(join(c.outputDir,'server-state.json'),'utf8')),{requests:[{name:'Ada'}]});
 assert.deepEqual(JSON.parse(readFileSync(join(c.outputDir,'rows.json'),'utf8')),[{item:'Notebook',cents:1200},{item:'Keyboard',cents:3000}]);
 const png=PNG.sync.read(readFileSync(join(c.outputDir,'screen.png')));assert.equal(png.width,960);assert.equal(png.height,640);assert.ok(new Set(png.data).size>8);return expected;
}
export const scenarios=Object.fromEntries(['stagehand-browser-actions','stagehand-structured-extraction'].map(slug=>[slug,{expectedSummary:expected,artifacts:['rows.json','screen.png','server-state.json'],prepare,run,verify}]));
