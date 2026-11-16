import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import {unzipSync,strFromU8} from 'fflate';
type Context = {inputDir:string; workDir:string; outputDir:string};
export const expected = {browserInvoked:true,modelInvoked:false,submittedName:'Ada',totalCents:4200,rows:2,screenshotWidth:960,screenshotHeight:640,regressionRejected:true};
const write=(p:string,v:unknown)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const read=(p:string):unknown=>JSON.parse(readFileSync(p,'utf8'));
export function prepare(inputDir:string) {
 write(join(inputDir,'fixture.json'),{name:'Ada',rows:[{item:'Notebook',cents:1200},{item:'Keyboard',cents:3000}]});
}
export async function serve(inputDir:string,outputDir:string) {
 const fixture=JSON.parse(readFileSync(join(inputDir,'fixture.json'),'utf8')) as {name:string;rows:{item:string;cents:number}[]};
 const requests:{name:string}[]=[];
 const server=createServer(async(req,res)=>{
  if(req.url==='/submit'&&req.method==='POST'){
   let body=''; for await(const part of req){body+=String(part);if(body.length>2048){res.writeHead(413).end();return;}}
   const data=JSON.parse(body) as {name:string};assert.equal(typeof data.name,'string');requests.push({name:data.name});
   write(join(outputDir,'server-state.json'),{requests});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true}));return;
  }
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><title>Sandbox orders</title><style>body{font:20px sans-serif;padding:40px;background:#eee}td{padding:12px}</style></head><body><h1>Orders</h1><form id="order"><label>Name<input name="name" id="name"></label><button>Submit order</button></form><p id="status">Waiting</p><table><thead><tr><th>Item</th><th>Cents</th></tr></thead><tbody>${fixture.rows.map(r=>`<tr><td>${r.item}</td><td>${r.cents}</td></tr>`).join('')}</tbody></table><output id="total">4200</output><script>document.querySelector('#order').onsubmit=async e=>{e.preventDefault();const r=await fetch('/submit',{method:'POST',body:JSON.stringify({name:document.querySelector('#name').value})});if(r.ok)document.querySelector('#status').textContent='Saved';};</script></body></html>`);
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 return {url:`http://127.0.0.1:${address.port}`,close:()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
