"""Bounded model-authenticated run; requires already prepared snapshot inputs."""
from __future__ import annotations
import asyncio,json,os,sys
from pathlib import Path
from pydantic import BaseModel
from browser_use import Agent,Browser,ChatOpenAI,ChatGoogle
from workload import serve,executable,read,write
class Row(BaseModel):
 item:str
 cents:int
class Result(BaseModel):
 rows:list[Row]
async def main(root:Path,provider:str,model:str,binary:str)->None:
 if provider not in ('openai','google','openrouter'):raise ValueError('Provider must be openai, google or openrouter')
 key=os.environ.get({'openai':'OPENAI_API_KEY','google':'GOOGLE_API_KEY','openrouter':'OPENROUTER_API_KEY'}[provider]) or (os.environ.get('GEMINI_API_KEY') if provider=='google' else None)
 if not key:raise ValueError('Selected provider key must be supplied at runtime')
 if not (root/'baseline.json').is_file():raise ValueError('Prepare snapshot inputs first')
 output=root/('live-'+provider);output.mkdir(exist_ok=False)
 browser=Browser('chromium',headless=True,executable_path=binary,keep_alive=True,allowed_domains=['127.0.0.1'])
 llm=ChatGoogle(model=model,api_key=key) if provider=='google' else ChatOpenAI(model=model,api_key=key,**({'base_url':'https://openrouter.ai/api/v1'} if provider=='openrouter' else {}))
 server,thread,url=serve(root/'input',output)
 agent=None
 try:
  agent=Agent(task=f'Open {url}. Fill the Name field with Ada and submit the order exactly once. Then extract both rows from the table as item and integer cents. Return the rows.',llm=llm,browser=browser,output_model_schema=Result,workspace=str(output/'agent'),web_search=False)
  result=await agent.run(max_steps=12,timeout=180)
  if not result.is_done() or result.is_successful() is False:raise ValueError('Agent did not complete successfully')
  actual=Result.model_validate(result.structured_output)
  assert actual.model_dump()=={'rows':[{'item':'Notebook','cents':1200},{'item':'Keyboard','cents':3000}]}
  assert read(output/'server-state.json')=={'requests':[{'name':'Ada'}]}
  env=await browser.start();process=await asyncio.create_subprocess_exec(sys.executable,'-m','browser_harness.run',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE,env={**os.environ,**env,'BH_REQUIRE_EXISTING_DAEMON':'1','BU_AUTOSPAWN':''})
  try:
   _,err=await asyncio.wait_for(process.communicate(f'capture_screenshot({str(output/"screen.png")!r})'.encode()),timeout=30)
   if process.returncode:raise RuntimeError(err.decode()[-1000:])
  except BaseException:
   if process.returncode is None:process.kill();await process.wait()
   raise
  from PIL import Image
  with Image.open(output/'screen.png') as im:im.load();assert im.width>0 and im.height>0
  write(output/'receipt.json',{'passed':True,'modelInvoked':True,'provider':provider,'requestedModel':model,'steps':result.number_of_steps(),'result':actual.model_dump(),'durationSeconds':result.total_duration_seconds()})
 finally:
  try:
   if agent is not None:await agent.close()
  finally:
   try:await browser.stop()
   finally:server.shutdown();server.server_close();thread.join(timeout=5)
if __name__=='__main__':
 if len(sys.argv)!=4:raise SystemExit('Usage: run-agent.py PREPARED_ROOT openai|google|openrouter MODEL')
 asyncio.run(main(Path(sys.argv[1]).resolve(),sys.argv[2],sys.argv[3],executable()))
