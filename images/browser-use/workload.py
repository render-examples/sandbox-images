"""Local Browser Use startup and deterministic browser-harness acceptance."""
from __future__ import annotations
import asyncio,json,subprocess,os,threading
from pathlib import Path
from typing import Any
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from browser_use import Browser
from playwright.sync_api import sync_playwright
from PIL import Image

def write(path:Path,value:Any)->None:path.write_text(json.dumps(value,indent=2)+'\n')
def read(path:Path)->Any:return json.loads(path.read_text())
def prepare(path:Path)->None:write(path/'fixture.json',{'name':'Ada','rows':[{'item':'Notebook','cents':1200},{'item':'Keyboard','cents':3000}]})
def serve(input_dir:Path,output_dir:Path):
 fixture=read(input_dir/'fixture.json');requests=[]
 class Handler(BaseHTTPRequestHandler):
  def log_message(self,*args):pass
  def do_GET(self):
   html='<!doctype html><html><head><title>Orders</title></head><body><h1>Orders</h1><form id="order"><label>Name<input id="name"></label><button>Submit order</button></form><p id="status">Waiting</p><table><thead><tr><th>Item</th><th>Cents</th></tr></thead><tbody>'+''.join(f'<tr><td>{r["item"]}</td><td>{r["cents"]}</td></tr>' for r in fixture['rows'])+'</tbody></table><script>document.querySelector("#order").onsubmit=async e=>{e.preventDefault();let r=await fetch("/submit",{method:"POST",body:JSON.stringify({name:document.querySelector("#name").value})});if(r.ok)document.querySelector("#status").textContent="Saved";};</script></body></html>'
   self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(html.encode())
  def do_POST(self):
   length=int(self.headers.get('Content-Length','0'));assert 0<length<2048;data=json.loads(self.rfile.read(length));assert isinstance(data.get('name'),str);requests.append({'name':data['name']});write(output_dir/'server-state.json',{'requests':requests});self.send_response(200);self.end_headers();self.wfile.write(b'{}')
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
 return server,thread,f'http://127.0.0.1:{server.server_port}'
def executable()->str:
 with sync_playwright() as p:return p.chromium.executable_path
async def browser_run(c:dict[str,Path],binary:str,url:str)->None:
 browser=Browser('chromium',headless=True,executable_path=binary)
 try:
  env=await browser.start()
  code=f'''import json,time
new_tab({url!r})
for _ in range(50):
 if js("Boolean(document.querySelector('#name'))"):break
 time.sleep(0.1)
js("document.querySelector('#name').value='Ada';document.querySelector('button').click();true")
for _ in range(50):
 if js("document.querySelector('#status').textContent")=='Saved':break
 time.sleep(0.1)
assert js("document.querySelector('#status').textContent")=='Saved'
rows=js("Array.from(document.querySelectorAll('tbody tr')).map(n=>({{item:n.children[0].textContent,cents:Number(n.children[1].textContent)}}))")
open({str(c['outputDir']/'rows.json')!r},'w').write(json.dumps(rows))
capture_screenshot({str(c['outputDir']/'screen.png')!r})
'''
  process=await asyncio.create_subprocess_exec(os.sys.executable,'-m','browser_harness.run',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE,env={**os.environ,**env,'BH_REQUIRE_EXISTING_DAEMON':'1','BU_AUTOSPAWN':'','BH_TELEMETRY':'0'})
  try:
   out,err=await asyncio.wait_for(process.communicate(code.encode()),timeout=55)
   if process.returncode:raise RuntimeError(err.decode()[-4000:])
  except BaseException:
   if process.returncode is None:process.kill();await process.wait()
   raise
 finally:await browser.stop()
def expected()->dict[str,Any]:return {'browserUseInvoked':True,'browserInvoked':True,'modelInvoked':False,'rows':2,'submittedName':'Ada','totalCents':4200}
def run(c:dict[str,Path])->dict[str,Any]:
 server,thread,url=serve(c['inputDir'],c['outputDir'])
 try:asyncio.run(browser_run(c,executable(),url));return expected()
 finally:server.shutdown();server.server_close();thread.join(timeout=5)
def verify(c:dict[str,Path])->dict[str,Any]:
 assert read(c['outputDir']/'server-state.json')=={'requests':[{'name':'Ada'}]}
 assert read(c['outputDir']/'rows.json')==[{'item':'Notebook','cents':1200},{'item':'Keyboard','cents':3000}]
 with Image.open(c['outputDir']/'screen.png') as image:
  image.load();assert image.width>=800 and image.height>=400;assert len(set(image.convert('RGB').getdata()))>8
 return expected()
SCENARIOS={slug:{'expectedSummary':expected(),'artifacts':['server-state.json','rows.json','screen.png'],'prepare':prepare,'run':run,'verify':verify} for slug in ['browser-use-form-task','browser-use-table-extraction']}
