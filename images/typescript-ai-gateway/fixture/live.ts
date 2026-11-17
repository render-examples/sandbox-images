import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import OpenAI from 'openai';
import type {ChatCompletionMessageParam} from 'openai/resources/chat/completions';
const key=process.env.OPENROUTER_API_KEY, model=process.env.AGENT_MODEL;
if(!key||!model) throw new Error('Set OPENROUTER_API_KEY and explicit AGENT_MODEL');
const client=new OpenAI({apiKey:key,baseURL:'https://openrouter.ai/api/v1',maxRetries:0,timeout:45000});
const messages:ChatCompletionMessageParam[]=[{role:'user',content:'Use getInvoice to retrieve invoice demo-001, then respond only with JSON containing id, totalCents and currency exactly as returned by the tool.'}];
const tools:OpenAI.Chat.Completions.ChatCompletionTool[]=[{type:'function',function:{name:'getInvoice',description:'Retrieve the prepared synthetic invoice.',parameters:{type:'object',properties:{id:{type:'string',enum:['demo-001']}},required:['id'],additionalProperties:false}}}];
const receipts: {id:string; model:string; usage:unknown}[]=[];
let calls=0,answer='',passed=false;
try {
for(let step=0;step<4;step++) {
 const response:OpenAI.Chat.Completions.ChatCompletion=await client.chat.completions.create({model,messages,...(step===0?{tools,tool_choice:'required' as const}:{response_format:{type:'json_object' as const}}),max_tokens:1024},{signal:AbortSignal.timeout(45000)});
 receipts.push({id:response.id,model:response.model,usage:response.usage});
 const message=response.choices[0]?.message; assert.ok(message,'Missing response');messages.push(message);
 if(!message.tool_calls?.length){answer=message.content??'';break;}
 for(const call of message.tool_calls){
  assert.equal(call.type,'function');if(call.type!=='function')throw new Error('Unsupported tool type');
  assert.equal(call.function.name,'getInvoice');assert.deepEqual(JSON.parse(call.function.arguments),{id:'demo-001'});
  calls++;assert.ok(calls<=4,'Tool budget exceeded');
  messages.push({role:'tool',tool_call_id:call.id,content:JSON.stringify({id:'demo-001',totalCents:3250,currency:'USD'})});
 }
}
assert.ok(calls>0,'No tool executed');assert.deepEqual(JSON.parse(answer),{id:'demo-001',totalCents:3250,currency:'USD'});passed=true;
} finally {
const receipt={schemaVersion:1,provider:'openrouter',requestedModel:model,agentInvoked:true,passed,toolExecutions:calls,requests:receipts,answer,verifiedAt:new Date().toISOString()};
const directory=resolve(process.argv[2]??'live-results');await mkdir(directory,{recursive:true});
await writeFile(join(directory,'openrouter-'+model.replaceAll(/[^a-zA-Z0-9-]/g,'-')+'.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify(receipt));
}
