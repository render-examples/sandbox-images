import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium,type Browser} from 'playwright';
import {PNG} from 'pngjs';
import {unzipSync,strFromU8} from 'fflate';
import type {RecipeContext, ScenarioMap} from '/opt/render/runtime/contracts.ts';
import {jsonObject,jsonArray,jsonString,jsonNumber,parseJson} from '/opt/render/runtime/contracts.ts';
export const expected = {browserInvoked:true,modelInvoked:false,submittedName:'Ada',totalCents:4200,rows:2,screenshotWidth:960,screenshotHeight:640,regressionRejected:true};
const write=(p:string,v:unknown)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const read=(p:string):unknown=>parseJson(readFileSync(p,'utf8'));
export function prepare(inputDir:string) {
 write(join(inputDir,'fixture.json'),{name:'Ada',rows:[{item:'Notebook',cents:1200},{item:'Keyboard',cents:3000}]});
}
export async function serve(inputDir:string,outputDir:string) {
 const source=jsonObject(parseJson(readFileSync(join(inputDir,'fixture.json'),'utf8')));
 const fixture={name:jsonString(source.name),rows:jsonArray(source.rows).map(value=>{const row=jsonObject(value);return {item:jsonString(row.item),cents:jsonNumber(row.cents)};})};
 const requests:{name:string}[]=[];
 const server=createServer(async(req,res)=>{
  if(req.url==='/submit'&&req.method==='POST'){
   let body=''; for await(const part of req){body+=String(part);if(body.length>2048){res.writeHead(413).end();return;}}
   const data=jsonObject(parseJson(body));requests.push({name:jsonString(data.name)});
   write(join(outputDir,'server-state.json'),{requests});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true}));return;
  }
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><title>Sandbox orders</title><style>body{font:20px sans-serif;padding:40px;background:#eee}td{padding:12px}</style></head><body><h1>Orders</h1><form id="order"><label>Name<input name="name" id="name"></label><button>Submit order</button></form><p id="status">Waiting</p><table><thead><tr><th>Item</th><th>Cents</th></tr></thead><tbody>${fixture.rows.map(r=>`<tr><td>${r.item}</td><td>${r.cents}</td></tr>`).join('')}</tbody></table><output id="total">4200</output><script>document.querySelector('#order').onsubmit=async e=>{e.preventDefault();const r=await fetch('/submit',{method:'POST',body:JSON.stringify({name:document.querySelector('#name').value})});if(r.ok)document.querySelector('#status').textContent='Saved';};</script></body></html>`);
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 return {url:`http://127.0.0.1:${address.port}`,close:()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
export async function run(c:RecipeContext){
 const server=await serve(c.inputDir,c.outputDir);
 let browser:Browser|undefined;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:960,height:640}});await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page=await context.newPage();await page.goto(server.url);await page.getByLabel('Name').fill('Ada');await page.getByRole('button',{name:'Submit order'}).click();await page.locator('#status').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='Saved');
  const rows=await page.locator('tbody tr').evaluateAll(nodes=>nodes.map(n=>({item:n.children[0]!.textContent,cents:Number(n.children[1]!.textContent)})));
  assert.deepEqual(rows,[{item:'Notebook',cents:1200},{item:'Keyboard',cents:3000}]);
  const total=await page.locator('#total').textContent();assert.equal(total,'4200');
  await page.locator('#total').evaluate(el=>{el.textContent='9999';});let rejected=false;try{assert.equal(await page.locator('#total').textContent(),'4200');}catch{rejected=true;}assert.ok(rejected);await page.locator('#total').evaluate(el=>{el.textContent='4200';});
  write(join(c.outputDir,'results.json'),{rows,totalCents:4200,regressionRejected:rejected});
  await page.screenshot({path:join(c.outputDir,'screen.png')});await context.tracing.stop({path:join(c.outputDir,'trace.zip')});await context.close();return expected;
 }finally{try{await browser?.close();}finally{await server.close();}}
}
export function verify(c:RecipeContext){
 assert.deepEqual(read(join(c.outputDir,'server-state.json')),{requests:[{name:'Ada'}]});
 assert.deepEqual(read(join(c.outputDir,'results.json')),{rows:[{item:'Notebook',cents:1200},{item:'Keyboard',cents:3000}],totalCents:4200,regressionRejected:true});
 const png=PNG.sync.read(readFileSync(join(c.outputDir,'screen.png')));assert.equal(png.width,960);assert.equal(png.height,640);assert.ok(new Set(png.data).size>8);
 const archive=unzipSync(readFileSync(join(c.outputDir,'trace.zip')));const trace=Object.entries(archive).filter(([n])=>n.endsWith('.trace')).flatMap(([,b])=>strFromU8(b).trim().split('\n').map(line=>jsonObject(parseJson(line))));assert.ok(trace.some(e=>e.type==='before'));assert.ok(trace.some(e=>e.type==='after'));return expected;
}
export const scenarios:ScenarioMap=Object.fromEntries(['playwright-app-tests','playwright-artifact-capture'].map(slug=>[slug,{expectedSummary:expected,artifacts:['server-state.json','results.json','screen.png','trace.zip'],prepare,run,verify}]));
